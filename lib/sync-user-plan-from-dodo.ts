/**
 * Reconcile Firestore subscription.plan with live Dodo (upgrade, webhook misses, stale product_id).
 */
import { getAdminDb } from '@/lib/firebase-admin';
import {
  getBestDodoSubscriptionForUser,
  normalizePlan,
  planFromProductId,
} from '@/lib/dodo';
import { PLAN_LIMITS } from '@/lib/subscription-plans';

const PLAN_ORDER = ['free', 'tester', 'testing', 'basic', 'basic-plus', 'pro', 'premium', 'agency'] as const;

export function planTierIndex(plan: string): number {
  const p = String(plan || 'free').toLowerCase();
  const i = (PLAN_ORDER as readonly string[]).indexOf(p);
  return i >= 0 ? i : 0;
}

export interface SyncUserFromDodoResult {
  updated: boolean;
  plan?: string;
  wasUpgrade?: boolean;
  message?: string;
}

/**
 * Loads user's linked (or email-matched) Dodo subscription and updates Firestore if plan/product/status is stale.
 * Resets credits when upgrading to a higher tier or when recovering from free/inactive.
 */
export async function syncUserSubscriptionFromDodo(
  userId: string,
  lowerEmail: string,
): Promise<SyncUserFromDodoResult> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  const userData = snap.exists ? snap.data() : null;
  const currentSubscription = (userData?.subscription || {}) as Record<string, unknown>;
  const currentPlan = String(currentSubscription.plan || 'free').toLowerCase();
  const currentStatus = String(currentSubscription.status || 'active').toLowerCase();
  const linkedSubId = String(currentSubscription.dodoSubscriptionId || '');
  const storedProductId = String(currentSubscription.dodoProductId || '');

  let dodoSub: any = null;
  try {
    dodoSub = await getBestDodoSubscriptionForUser({
      userId,
      email: lowerEmail,
      preferSubscriptionId: linkedSubId || null,
    });
  } catch (e) {
    console.warn('[sync-user-plan-from-dodo] Dodo lookup failed:', e);
    return { updated: false, plan: currentPlan, message: 'Dodo lookup failed' };
  }

  if (!dodoSub) {
    return { updated: false, plan: currentPlan };
  }

  const dodoStatus = String(dodoSub.status || '').toLowerCase();
  const liveProductId = String(dodoSub.product_id || '');
  const livePlan =
    planFromProductId(liveProductId) ||
    normalizePlan((dodoSub.metadata?.plan as string) || null);

  if (!livePlan) {
    return { updated: false, plan: currentPlan, message: 'Could not map Dodo product to plan' };
  }

  const treatAsActive = ['active', 'pending', 'on_hold'].includes(dodoStatus);
  if (!treatAsActive) {
    return { updated: false, plan: currentPlan, message: `Dodo subscription not active (${dodoStatus})` };
  }

  const liveSubId = String(dodoSub.subscription_id || '');
  const productMismatch = Boolean(liveProductId && storedProductId && liveProductId !== storedProductId);
  const planMismatch = livePlan !== currentPlan;
  const wasInactiveOrFree = currentPlan === 'free' || currentStatus !== 'active';
  /** Firestore still points at an old subscription id after Dodo issued a new sub on upgrade. */
  const subscriptionIdDrift =
    Boolean(liveSubId && linkedSubId && liveSubId !== linkedSubId) ||
    Boolean(liveSubId && !linkedSubId);

  if (!planMismatch && !productMismatch && !wasInactiveOrFree && !subscriptionIdDrift) {
    return { updated: false, plan: currentPlan };
  }

  const limits = PLAN_LIMITS[livePlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.pro;
  const now = new Date().toISOString();
  const prevTier = planTierIndex(currentPlan);
  const nextTier = planTierIndex(livePlan);
  const isUpgrade = nextTier > prevTier;

  const existingTracking = (userData?.generationTracking || {}) as Record<string, unknown>;

  const subscriptionPatch: Record<string, unknown> = {
    plan: livePlan,
    status: 'active',
    dodoSubscriptionId: liveSubId || linkedSubId || null,
    dodoCustomerId: dodoSub.customer?.customer_id || currentSubscription.dodoCustomerId || null,
    dodoProductId: liveProductId || null,
    generationsLimit: limits.credits,
    startDate: (currentSubscription.startDate as string) || now,
    endDate: (dodoSub.next_billing_date as string) || (currentSubscription.endDate as string) || null,
    cancelAtPeriodEnd: Boolean(dodoSub.cancel_at_next_billing_date),
  };
  if (isUpgrade || wasInactiveOrFree) {
    subscriptionPatch.generationsUsed = 0;
  }

  const patch: Record<string, unknown> = {
    email: lowerEmail,
    subscription: subscriptionPatch,
    updatedAt: now,
  };

  // Only reset monthly credits on real tier upgrades or coming back from free/inactive — not for subscription-id bookkeeping fixes.
  if (isUpgrade || wasInactiveOrFree) {
    patch.generationTracking = {
      ...existingTracking,
      creditsUsed: 0,
      chatsUsed: 0,
      lastResetDate: now,
    };
  }

  await userRef.set(patch, { merge: true });

  return {
    updated: true,
    plan: livePlan,
    wasUpgrade: isUpgrade,
    message: isUpgrade
      ? `Upgraded to ${livePlan}; monthly credits refreshed for the new plan.`
      : wasInactiveOrFree
        ? `Subscription restored (${livePlan}).`
        : `Subscription synced (${livePlan}).`,
  };
}
