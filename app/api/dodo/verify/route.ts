import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizePlan, planFromProductId } from '@/lib/dodo';
import { tryVerifyAuth } from '@/lib/verify-auth';
import { syncUserSubscriptionFromDodo } from '@/lib/sync-user-plan-from-dodo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLAN_LIMITS: Record<string, { credits: number; generations: number }> = {
  free:        { credits: 0,      generations: 1 },
  basic:       { credits: 1500,   generations: 300 },
  'basic-plus': { credits: 2500,  generations: 500 },
  pro:         { credits: 6000,   generations: 1500 },
  premium:     { credits: 25000,  generations: 5000 },
  agency:      { credits: 125000, generations: 25000 },
};

/**
 * GET /api/dodo/verify?userId=...&email=...
 *
 * Checks for pending Dodo subscriptions (user bought before signing up)
 * and activates them if found. Auth token verified to prevent hijacking.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email required' }, { status: 400 });
    }

    const auth = await tryVerifyAuth(req);
    if (auth && auth.uid !== userId) {
      return NextResponse.json({ error: 'Token/userId mismatch' }, { status: 403 });
    }

    const db = getAdminDb();
    const lowerEmail = email.trim().toLowerCase();

    // Check for pending subscription
    const pendingRef = db.collection('pendingSubscriptions').doc(lowerEmail);
    const pendingDoc = await pendingRef.get();

    if (pendingDoc.exists) {
      const pending = pendingDoc.data()!;
      const productId = pending.dodoProductId as string;
      const plan = planFromProductId(productId) || normalizePlan((pending.planHint as string) || '') || 'pro';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;
      const now = new Date().toISOString();

      // Activate the subscription for this user (reset credits for new subscription, preserve projects)
      const existingDoc = await db.collection('users').doc(userId).get();
      const existingTracking = (existingDoc.data()?.generationTracking || {}) as Record<string, unknown>;
      await db.collection('users').doc(userId).set(
        {
          email: lowerEmail,
          subscription: {
            plan,
            status: 'active',
            dodoSubscriptionId: pending.dodoSubscriptionId || null,
            dodoCustomerId: pending.dodoCustomerId || null,
            dodoProductId: productId,
            startDate: now,
            endDate: null,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            generationsUsed: 0,
            generationsLimit: limits.credits,
          },
          generationTracking: {
            ...existingTracking,
            creditsUsed: 0,
            fullAppsGenerated: existingTracking.fullAppsGenerated ?? 0,
            sites3DGenerated: existingTracking.sites3DGenerated ?? 0,
            uiPreviewsGenerated: existingTracking.uiPreviewsGenerated ?? 0,
            chatsUsed: existingTracking.chatsUsed ?? 0,
            studioGenerations: existingTracking.studioGenerations ?? 0,
            studioImageGenerations: existingTracking.studioImageGenerations ?? 0,
            studioVideoGenerations: existingTracking.studioVideoGenerations ?? 0,
            builderImageGenerations: existingTracking.builderImageGenerations ?? 0,
            builderVideoGenerations: existingTracking.builderVideoGenerations ?? 0,
            lastResetDate: now,
            projects: existingTracking.projects ?? {},
          },
          updatedAt: now,
        },
        { merge: true },
      );

      // Remove the pending subscription
      await pendingRef.delete();

      console.log(`[dodo-verify] ✅ Activated pending ${plan} for user ${userId} (${lowerEmail})`);

      return NextResponse.json({
        activated: true,
        plan,
        message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`,
      });
    }

    // Reconcile Firestore with live Dodo (fixes Basic→Premium stuck as basic, wrong product_id, etc.)
    const sync = await syncUserSubscriptionFromDodo(userId, lowerEmail);
    if (sync.updated) {
      console.log(`[dodo-verify] ${sync.message} user=${userId} (${lowerEmail})`);
      return NextResponse.json({
        activated: true,
        plan: sync.plan,
        syncedFromDodo: true,
        wasUpgrade: sync.wasUpgrade,
        message: sync.message,
      });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const currentSubscription = (userData?.subscription || {}) as Record<string, unknown>;

    return NextResponse.json({
      activated: false,
      plan: sync.plan || String(currentSubscription.plan || 'free').toLowerCase(),
      status: String(currentSubscription.status || 'active').toLowerCase(),
      syncNote: sync.message,
    });
  } catch (error: unknown) {
    console.error('[dodo-verify] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
