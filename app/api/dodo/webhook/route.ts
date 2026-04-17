import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { normalizePlan, planFromProductId, retrieveDodoSubscription } from '@/lib/dodo';
import { planTierIndex } from '@/lib/sync-user-plan-from-dodo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Webhook payload types ──────────────────────────────────────────

interface DodoCustomer {
  customer_id?: string;
  email?: string;
  name?: string;
}

interface DodoSubscriptionData {
  subscription_id?: string;
  customer?: DodoCustomer;
  product_id?: string;
  status?: string;
  next_billing_date?: string;
  previous_billing_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
  cancelled_at?: string;
  expires_at?: string;
  cancel_at_next_billing_date?: boolean;
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

interface DodoPaymentData {
  payment_id?: string;
  subscription_id?: string;
  customer?: DodoCustomer;
  product_id?: string;
  status?: string;
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

interface WebhookPayload {
  business_id: string;
  timestamp: string;
  type: string;
  data: DodoSubscriptionData | DodoPaymentData;
}

// ── Plan limits for Firebase doc ───────────────────────────────────

const PLAN_LIMITS: Record<string, { credits: number; generations: number }> = {
  free:        { credits: 0,      generations: 1 },
  tester:     { credits: 1500,   generations: 300 },
  basic:       { credits: 1500,   generations: 300 },
  'basic-plus': { credits: 2500,  generations: 500 },
  pro:         { credits: 6000,   generations: 1500 },
  premium:     { credits: 25000,  generations: 5000 },
  agency:      { credits: 125000, generations: 25000 },
};

// ── Find user by email ─────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getAdminDb();
  const snap = await db
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  if (!snap.empty) return snap.docs[0].id;

  // Fallback: Firebase Auth may have the user before Firestore has email synced
  try {
    const authUser = await getAdminAuth().getUserByEmail(normalized);
    if (authUser?.uid) {
      await ensureUserDocument(authUser.uid);
      await db.collection('users').doc(authUser.uid).set(
        { email: normalized, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return authUser.uid;
    }
  } catch {
    // User not found in Firebase Auth
  }
  return null;
}

async function findUserByDodoSubscriptionId(subscriptionId: string): Promise<string | null> {
  if (!subscriptionId) return null;
  const db = getAdminDb();
  const snap = await db
    .collection('users')
    .where('subscription.dodoSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function resolveUserId(data: DodoSubscriptionData | DodoPaymentData): Promise<string | null> {
  // 1. Most reliable: userId from checkout metadata (passed when user is logged in)
  const metadataUserId = data.metadata?.userId;
  if (metadataUserId) {
    try {
      await getAdminAuth().getUser(metadataUserId);
      await ensureUserDocument(metadataUserId);
      return metadataUserId;
    } catch {
      // Invalid or deleted Firebase user
    }
  }

  // 2. Subscription ID: stable even when customer email changes (for renewals, etc.)
  const bySubId = await findUserByDodoSubscriptionId(data.subscription_id || '');
  if (bySubId) return bySubId;

  // 3. Email: Firestore users.email or Firebase Auth fallback
  const email = (data.customer?.email || data.metadata?.userEmail || '').trim();
  if (email) return findUserByEmail(email);

  return null;
}

async function resolvePlanAndPeriod(data: DodoSubscriptionData) {
  const directPlan =
    planFromProductId(data.product_id || '') ||
    normalizePlan(data.metadata?.plan || null);

  if (directPlan) {
    return {
      plan: directPlan,
      periodStart: data.current_period_start || data.previous_billing_date || data.created_at || null,
      periodEnd: data.current_period_end || data.next_billing_date || data.expires_at || null,
      productId: data.product_id || null,
      cancelAtPeriodEnd: !!data.cancel_at_next_billing_date,
    };
  }

  if (!data.subscription_id) {
    return {
      plan: null,
      periodStart: data.current_period_start || data.previous_billing_date || data.created_at || null,
      periodEnd: data.current_period_end || data.next_billing_date || data.expires_at || null,
      productId: data.product_id || null,
      cancelAtPeriodEnd: !!data.cancel_at_next_billing_date,
    };
  }

  try {
    const sub = await retrieveDodoSubscription(data.subscription_id);
    const fallbackPlan =
      planFromProductId(sub.product_id || '') ||
      normalizePlan(sub.metadata?.plan || null);
    return {
      plan: fallbackPlan,
      periodStart: data.current_period_start || sub.previous_billing_date || sub.created_at || null,
      periodEnd: data.current_period_end || sub.next_billing_date || sub.expires_at || null,
      productId: data.product_id || sub.product_id || null,
      cancelAtPeriodEnd: sub.cancel_at_next_billing_date || !!data.cancel_at_next_billing_date,
    };
  } catch (error) {
    console.warn('[dodo-webhook] Unable to retrieve subscription for plan resolution:', error);
    return {
      plan: null,
      periodStart: data.current_period_start || data.previous_billing_date || data.created_at || null,
      periodEnd: data.current_period_end || data.next_billing_date || data.expires_at || null,
      productId: data.product_id || null,
      cancelAtPeriodEnd: !!data.cancel_at_next_billing_date,
    };
  }
}

// ── Activate subscription ──────────────────────────────────────────

async function activateSubscription(
  data: DodoSubscriptionData,
  context?: { eventType: string; paymentId?: string },
): Promise<{ success: boolean; uid?: string; plan?: string; reason?: string }> {
  const email = (data.customer?.email || data.metadata?.userEmail || '').trim().toLowerCase();
  const subscriptionId = data.subscription_id || null;
  const metadataUserId = data.metadata?.userId || null;

  const uid = await resolveUserId(data);
  if (!uid) {
    const reason = `User not found: metadata.userId=${metadataUserId || 'none'}, email=${email || 'none'}, subscription_id=${subscriptionId || 'none'}`;
    console.warn(`[dodo-webhook] ${reason} — storing as pending`);
    await storePending(data);
    return { success: false, reason };
  }

  await ensureUserDocument(uid);

  const resolved = await resolvePlanAndPeriod(data);
  if (!resolved.plan) {
    console.warn('[dodo-webhook] Could not resolve plan for activation, storing pending');
    await storePending(data);
    return { success: false, uid, reason: 'plan unresolved' };
  }

  const plan = resolved.plan;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;
  const now = new Date().toISOString();

  const db = getAdminDb();
  const userSnap = await db.collection('users').doc(uid).get();
  const prevData = userSnap.exists ? userSnap.data() : null;
  const prevSub = (prevData?.subscription || {}) as Record<string, unknown>;
  const prevPlan = String(prevSub.plan || 'free').toLowerCase();
  const prevStatus = String(prevSub.status || 'inactive').toLowerCase();
  const isUpgrade = planTierIndex(plan) > planTierIndex(prevPlan);
  const wasFreeOrInactive = prevPlan === 'free' || prevStatus !== 'active';
  const existingTracking = (prevData?.generationTracking || {}) as Record<string, unknown>;

  const payload: Record<string, unknown> = {
    ...(email ? { email } : {}),
    subscription: {
      plan,
      status: 'active',
      dodoSubscriptionId: subscriptionId,
      dodoCustomerId: data.customer?.customer_id || null,
      dodoProductId: resolved.productId,
      startDate: resolved.periodStart || now,
      endDate: resolved.periodEnd,
      cancelAtPeriodEnd: resolved.cancelAtPeriodEnd,
      cancelledAt: null,
      generationsUsed: 0,
      generationsLimit: limits.credits,
    },
    updatedAt: now,
  };

  if (isUpgrade || wasFreeOrInactive) {
    payload.generationTracking = {
      ...existingTracking,
      creditsUsed: 0,
      chatsUsed: 0,
      lastResetDate: now,
    };
  }

  await db.collection('users').doc(uid).set(payload, { merge: true });

  console.log(
    `[dodo-webhook] ✅ Activated plan=${plan} userId=${uid} email=${email || 'n/a'} subscription_id=${subscriptionId || 'n/a'}` +
    (context?.paymentId ? ` payment_id=${context.paymentId}` : '') +
    ` event=${context?.eventType || 'unknown'}`
  );
  return { success: true, uid, plan };
}

// ── Deactivate (cancel / expire) ───────────────────────────────────

async function deactivateSubscription(data: DodoSubscriptionData) {
  const email = data.customer?.email || data.metadata?.userEmail;
  const uid = await resolveUserId(data);
  if (!uid) {
    console.warn(`[dodo-webhook] deactivateSubscription: user not found for email=${email || 'n/a'}`);
    return;
  }
  await ensureUserDocument(uid);

  const periodEnd = data.current_period_end || data.next_billing_date || data.expires_at || null;
  if (data.cancel_at_next_billing_date && periodEnd) {
    const endDate = new Date(periodEnd);
    if (!Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now()) {
      const db = getAdminDb();
      await db.collection('users').doc(uid).set(
        {
          subscription: {
            status: 'active',
            endDate: periodEnd,
            cancelAtPeriodEnd: true,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log(`[dodo-webhook] Cancellation scheduled for user ${uid} (${email})`);
      return;
    }
  }

  const now = new Date().toISOString();
  const db = getAdminDb();
  await db.collection('users').doc(uid).set(
    {
      subscription: {
        plan: 'free',
        status: 'inactive',
        dodoSubscriptionId: data.subscription_id || null,
        cancelAtPeriodEnd: false,
        cancelledAt: data.cancelled_at || now,
        generationsUsed: 0,
        generationsLimit: PLAN_LIMITS.free.generations,
      },
      updatedAt: now,
    },
    { merge: true },
  );

  console.log(`[dodo-webhook] ⬇️ Downgraded to free for user ${uid} (${email})`);
}

// ── Subscription on hold ───────────────────────────────────────────

async function setOnHold(data: DodoSubscriptionData) {
  const email = data.customer?.email || data.metadata?.userEmail;
  const uid = await resolveUserId(data);
  if (!uid) return;
  await ensureUserDocument(uid);

  const db = getAdminDb();
  await db.collection('users').doc(uid).set(
    {
      subscription: {
        status: 'on_hold',
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(`[dodo-webhook] ⏸️ Subscription on hold for user ${uid} (${email})`);
}

// ── Plan changed (upgrade/downgrade) ───────────────────────────────

async function handlePlanChange(data: DodoSubscriptionData) {
  // Re-activate with the new product
  await activateSubscription(data);
}

async function handleSubscriptionUpdated(data: DodoSubscriptionData) {
  const uid = await resolveUserId(data);
  if (!uid) return;
  await ensureUserDocument(uid);

  if (data.status === 'active') {
    await activateSubscription(data);
  }

  // Keep cancellation scheduling flags in sync.
  if (typeof data.cancel_at_next_billing_date !== 'undefined' || data.next_billing_date) {
    const db = getAdminDb();
    await db.collection('users').doc(uid).set(
      {
        subscription: {
          cancelAtPeriodEnd: !!data.cancel_at_next_billing_date,
          ...(data.next_billing_date ? { endDate: data.next_billing_date } : {}),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
}

// ── Renewed ────────────────────────────────────────────────────────

async function handleRenewed(data: DodoSubscriptionData) {
  const email = data.customer?.email || data.metadata?.userEmail;
  const uid = await resolveUserId(data);
  if (!uid) return;
  await ensureUserDocument(uid);

  const resolved = await resolvePlanAndPeriod(data);
  const plan = resolved.plan || 'pro';
  const now = new Date().toISOString();
  const db = getAdminDb();

  // Reset monthly credits on renewal
  await db.collection('users').doc(uid).set(
    {
      subscription: {
        plan,
        status: 'active',
        startDate: resolved.periodStart || now,
        endDate: resolved.periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      generationTracking: {
        creditsUsed: 0,
        studioImageGenerations: 0,
        studioVideoGenerations: 0,
        lastResetDate: now,
      },
      updatedAt: now,
    },
    { merge: true },
  );

  console.log(`[dodo-webhook] 🔄 Renewed ${plan} for user ${uid} (${email})`);
}

// ── Store pending subscription (user not yet signed up) ────────────

async function storePending(data: DodoSubscriptionData) {
  const email = (data.customer?.email || data.metadata?.userEmail || '').trim();
  if (!email) {
    console.warn('[dodo-webhook] Cannot store pending subscription without email');
    return;
  }

  const db = getAdminDb();
  const lowerEmail = email.toLowerCase();
  await db.collection('pendingSubscriptions').doc(lowerEmail).set(
    {
      email: lowerEmail,
      userId: data.metadata?.userId || null,
      planHint: normalizePlan(data.metadata?.plan || null),
      dodoSubscriptionId: data.subscription_id || null,
      dodoProductId: data.product_id || null,
      dodoCustomerId: data.customer?.customer_id || null,
      rawData: JSON.parse(JSON.stringify(data)),
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(`[dodo-webhook] 📝 Stored pending subscription for ${lowerEmail}`);
}

// ── Webhook handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

    if (!webhookKey) {
      console.error('[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY not configured');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    // ── Verify signature (Standard Webhooks / Svix) ────────────
    const webhookHeaders = {
      'webhook-id': req.headers.get('webhook-id') || '',
      'webhook-signature': req.headers.get('webhook-signature') || '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
    };

    try {
      const wh = new Webhook(webhookKey);
      wh.verify(rawBody, webhookHeaders);
    } catch (verifyErr) {
      console.error('[dodo-webhook] Signature verification failed:', verifyErr);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // ── Parse and route event ──────────────────────────────────
    const payload: WebhookPayload = JSON.parse(rawBody);
    const { type, data } = payload;

    console.log(`[dodo-webhook] Event received: type=${type} subscription_id=${(data as DodoSubscriptionData).subscription_id || (data as DodoPaymentData).subscription_id || 'n/a'}`);

    switch (type) {
      // Subscription lifecycle
      case 'subscription.active': {
        const result = await activateSubscription(data as DodoSubscriptionData, { eventType: 'subscription.active' });
        if (!result.success) {
          console.warn(`[dodo-webhook] subscription.active activation failed: ${result.reason}`);
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.expired':
        await deactivateSubscription(data as DodoSubscriptionData);
        break;

      case 'subscription.on_hold':
        await setOnHold(data as DodoSubscriptionData);
        break;

      case 'subscription.plan_changed':
        await handlePlanChange(data as DodoSubscriptionData);
        break;

      case 'subscription.renewed':
        await handleRenewed(data as DodoSubscriptionData);
        break;

      case 'subscription.failed':
        console.warn('[dodo-webhook] Subscription failed:', data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(data as DodoSubscriptionData);
        break;

      // Payment events — safety net: activate immediately (subscription events may arrive late/out-of-order)
      case 'payment.succeeded': {
        const paymentData = data as DodoPaymentData;
        const paymentId = paymentData.payment_id || 'unknown';
        console.log(`[dodo-webhook] payment.succeeded payment_id=${paymentId} subscription_id=${paymentData.subscription_id || 'n/a'} email=${paymentData.customer?.email || paymentData.metadata?.userEmail || 'n/a'}`);
        const result = await activateSubscription(
          {
            subscription_id: paymentData.subscription_id,
            customer: paymentData.customer,
            product_id: paymentData.product_id,
            status: 'active',
            metadata: paymentData.metadata,
          },
          { eventType: 'payment.succeeded', paymentId }
        );
        if (!result.success) {
          console.warn(`[dodo-webhook] payment.succeeded activation failed: ${result.reason}`);
        }
        break;
      }

      case 'payment.failed':
        console.warn('[dodo-webhook] Payment failed:', (data as DodoPaymentData).payment_id);
        break;

      case 'payment.cancelled':
        console.warn('[dodo-webhook] Payment cancelled:', (data as DodoPaymentData).payment_id);
        break;

      case 'payment.processing':
        console.log('[dodo-webhook] Payment processing:', (data as DodoPaymentData).payment_id);
        break;

      // License key (logged)
      case 'license_key.created':
        console.log('[dodo-webhook] License key created');
        break;

      default:
        console.log(`[dodo-webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[dodo-webhook] Error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
