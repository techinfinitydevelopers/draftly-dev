/**
 * Shared auth + billing enforcement for Studio API routes.
 * Credit-based system: each action costs a certain number of credits.
 */

import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isOwnerEmail } from '@/lib/owner-emails';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import {
  canUseStudio,
  resetMonthlyCountsIfNeeded,
  type GenerationTracking,
} from '@/lib/subscription-plans';

interface StudioAuthResult {
  allowed: boolean;
  userId?: string;
  plan?: string;
  errorResponse?: NextResponse;
}

type BuilderMediaType = 'image' | 'video';

/**
 * Monthly AI image/video caps for 3D Builder (`generate-bg`, `generate-video`, `extend-video`).
 * Applies regardless of model lane (Seedream, LTX fal, extend, etc.); credits are billed per `model-router`.
 */
export const BUILDER_MEDIA_LIMITS: Record<string, { images: number; videos: number }> = {
  basic: { images: 20, videos: 10 },
  'basic-plus': { images: 30, videos: 15 },
  pro: { images: 40, videos: 20 },
  premium: { images: 160, videos: 80 },
  agency: { images: 800, videos: 400 },
  tester: { images: 40, videos: 20 },
  testing: { images: 2, videos: 2 }, // Trial tester package
};

const BUILDER_MEDIA_FALLBACK_PLAN = 'premium' as const;

export const BUILDER_PLAN_LIMITS: Record<string, { sitesPerMonth: number; videosPerSite: number }> = {
  free: { sitesPerMonth: 0, videosPerSite: 0 },
  tester: { sitesPerMonth: 2, videosPerSite: 2 },
  testing: { sitesPerMonth: 1, videosPerSite: 2 },
  basic: { sitesPerMonth: 2, videosPerSite: 2 },
  'basic-plus': { sitesPerMonth: 4, videosPerSite: 4 },
  pro: { sitesPerMonth: 10, videosPerSite: 5 },
  premium: { sitesPerMonth: 20, videosPerSite: 10 },
  agency: { sitesPerMonth: 50, videosPerSite: 25 },
};

/**
 * Enforce auth and studio limits.
 * Pass creditCost to check if user has enough credits for this action.
 * Pass isVideo to check video access.
 */
export async function enforceStudioLimits(
  body: Record<string, unknown>,
  options: { isVideo?: boolean; creditCost?: number } = {},
): Promise<StudioAuthResult> {
  const userId = body.userId as string | undefined;

  if (!userId) {
    return {
      allowed: false,
      errorResponse: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  try {
    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    let userEmail = (userData?.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch { /* ignore */ }
    }
    if (isOwnerEmail(userEmail)) {
      return { allowed: true, userId, plan: 'premium' };
    }
    let subscription = userData?.subscription || { plan: 'free', status: 'active' };
    if (isTestingCreditsEmail(userEmail)) {
      subscription = { plan: 'testing', status: 'active' } as typeof subscription;
    }

    let generationTracking: GenerationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      sites3DGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      creditsUsed: 0,
      studioGenerations: 0,
      studioImageGenerations: 0,
      studioVideoGenerations: 0,
      builderImageGenerations: 0,
      builderVideoGenerations: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    // Reset if new month (billing cycle)
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);

    // Check limits (credit-based)
    const check = canUseStudio(
      subscription,
      generationTracking,
      options.isVideo || false,
      options.creditCost || 1,
    );

    if (!check.allowed) {
      return {
        allowed: false,
        plan: subscription.plan,
        errorResponse: NextResponse.json(
          {
            error: check.reason,
            limitReached: true,
            creditsUsed: check.creditsUsed,
            creditsTotal: check.creditsTotal,
            remaining: check.remaining,
          },
          { status: 429 },
        ),
      };
    }

    return { allowed: true, userId, plan: subscription.plan };
  } catch (err) {
    console.error('[studio-auth] Error checking limits:', err);
    return {
      allowed: false,
      errorResponse: NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 }),
    };
  }
}

/**
 * Increment the studio usage counter for a user (credit-based).
 * Call this after a successful generation.
 *
 * @param userId - Firebase user ID
 * @param type - 'image' or 'video'
 * @param creditCost - Number of credits to deduct
 */
export async function incrementStudioUsage(
  userId: string,
  type: 'image' | 'video' = 'image',
  creditCost: number = 1,
): Promise<void> {
  if (!userId) return;

  try {
    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return;

    const userData = userDoc.data();
    let tracking: GenerationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      sites3DGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      creditsUsed: 0,
      studioGenerations: 0,
      studioImageGenerations: 0,
      studioVideoGenerations: 0,
      builderImageGenerations: 0,
      builderVideoGenerations: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    tracking = resetMonthlyCountsIfNeeded(tracking, userData?.subscription);

    // Increment credits used
    tracking.creditsUsed = (tracking.creditsUsed || 0) + creditCost;

    // Legacy counters
    tracking.studioGenerations = (tracking.studioGenerations || 0) + 1;

    if (type === 'video') {
      tracking.studioVideoGenerations = (tracking.studioVideoGenerations || 0) + 1;
    } else {
      tracking.studioImageGenerations = (tracking.studioImageGenerations || 0) + 1;
    }

    await userRef.update({ generationTracking: tracking });
  } catch (err) {
    console.error('[studio-auth] Error incrementing usage:', err);
  }
}

/**
 * Increment 3D builder usage and shared credit tracking.
 * This keeps 3D usage separate from Studio image/video counters.
 */
export async function incrementBuilderUsage(
  userId: string,
  options: {
    creditCost?: number;
    fullApps?: number;
    sites3D?: number;
    chats?: number;
    uiPreviews?: number;
    builderImages?: number;
    builderVideos?: number;
  } = {},
): Promise<void> {
  if (!userId) return;

  try {
    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    let tracking: GenerationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      sites3DGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      creditsUsed: 0,
      studioGenerations: 0,
      studioImageGenerations: 0,
      studioVideoGenerations: 0,
      builderImageGenerations: 0,
      builderVideoGenerations: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    tracking = resetMonthlyCountsIfNeeded(tracking, userData?.subscription);

    const creditCost = Math.max(0, options.creditCost || 0);
    const fullApps = Math.max(0, options.fullApps || 0);
    const sites3D = Math.max(0, options.sites3D || 0);
    const chats = Math.max(0, options.chats || 0);
    const uiPreviews = Math.max(0, options.uiPreviews || 0);
    const builderImages = Math.max(0, options.builderImages || 0);
    const builderVideos = Math.max(0, options.builderVideos || 0);

    if (creditCost > 0) {
      tracking.creditsUsed = (tracking.creditsUsed || 0) + creditCost;
    }
    if (fullApps > 0) {
      tracking.fullAppsGenerated = (tracking.fullAppsGenerated || 0) + fullApps;
    }
    if (sites3D > 0) {
      tracking.sites3DGenerated = (tracking.sites3DGenerated || 0) + sites3D;
    }
    if (chats > 0) {
      tracking.chatsUsed = (tracking.chatsUsed || 0) + chats;
    }
    if (uiPreviews > 0) {
      tracking.uiPreviewsGenerated = (tracking.uiPreviewsGenerated || 0) + uiPreviews;
    }
    if (builderImages > 0) {
      tracking.builderImageGenerations = (tracking.builderImageGenerations || 0) + builderImages;
    }
    if (builderVideos > 0) {
      tracking.builderVideoGenerations = (tracking.builderVideoGenerations || 0) + builderVideos;
    }

    await userRef.update({ generationTracking: tracking });
  } catch (err) {
    console.error('[studio-auth] Error incrementing 3D builder usage:', err);
  }
}

/** Bill one builder video for a fal queue request (safe across repeated poll completions). */
export async function incrementBuilderVideoOnce(
  userId: string,
  falRequestId: string,
  creditCost: number,
): Promise<boolean> {
  if (!userId || !falRequestId) return false;
  try {
    const db = getAdminDb();
    const ref = db.collection('users').doc(userId).collection('builderFalVideoJobs').doc(falRequestId);
    await ref.create({
      billedAt: FieldValue.serverTimestamp(),
      creditCost,
    });
  } catch (e: unknown) {
    const code = (e as { code?: number | string }).code;
    if (code === 6 || code === 'already-exists') return false;
    throw e;
  }
  await incrementBuilderUsage(userId, { creditCost, builderVideos: 1 });
  return true;
}

/**
 * Enforce per-plan monthly generation caps for 3D Builder media.
 */
export async function enforceBuilderMediaLimits(
  userId: string,
  type: BuilderMediaType,
): Promise<StudioAuthResult> {
  if (!userId) return { allowed: true };

  try {
    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    let userEmail = (userData?.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch { /* ignore */ }
    }
    if (isOwnerEmail(userEmail)) {
      return { allowed: true, plan: 'premium' };
    }
    let subscription = userData?.subscription || { plan: 'free', status: 'active' };
    if (isTestingCreditsEmail(userEmail)) {
      subscription = { plan: 'testing', status: 'active' } as typeof subscription;
    }
    const plan = String(subscription.plan || 'free');
    const status = String(subscription.status || 'inactive');

    if (status !== 'active' && plan !== 'free' && plan !== 'tester') {
      return {
        allowed: false,
        plan,
        errorResponse: NextResponse.json(
          { error: 'Your subscription is not active. Please renew.' },
          { status: 403 },
        ),
      };
    }

    let limits = BUILDER_MEDIA_LIMITS[plan];
    if (!limits) {
      // Unknown plan id with an active subscription: use Premium media caps (never unlimited).
      if (status === 'active' && plan !== 'free') {
        limits = BUILDER_MEDIA_LIMITS[BUILDER_MEDIA_FALLBACK_PLAN];
      } else {
        return { allowed: true, plan };
      }
    }

    let generationTracking: GenerationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      sites3DGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      creditsUsed: 0,
      studioGenerations: 0,
      studioImageGenerations: 0,
      studioVideoGenerations: 0,
      builderImageGenerations: 0,
      builderVideoGenerations: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);

    const used = type === 'image'
      ? (generationTracking.builderImageGenerations || 0)
      : (generationTracking.builderVideoGenerations || 0);
    const limit = type === 'image' ? limits.images : limits.videos;
    const remaining = Math.max(0, limit - used);

    if (used >= limit) {
      return {
        allowed: false,
        plan,
        errorResponse: NextResponse.json(
          {
            error:
              type === 'image'
                ? `3D Builder monthly image limit reached (${limit}/${limit}).`
                : `3D Builder monthly video limit reached (${limit}/${limit}).`,
            limitReached: true,
            remaining,
            used,
            limit,
            type,
          },
          { status: 429 },
        ),
      };
    }

    return { allowed: true, userId, plan };
  } catch (err) {
    console.error('[studio-auth] Error checking 3D builder media limits:', err);
    return { allowed: true, userId, plan: 'free' };
  }
}
