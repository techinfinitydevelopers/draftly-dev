/**
 * Subscription Plans — Credit-Based System (50% margin target)
 *
 * Backend credit costs per model (users don't see these directly):
 *   Nano Banana Pro     = 5 credits/image   (real cost ~$0.045) — primary model
 *   Flux Schnell        = 3 credits/image   (real cost ~$0.01)  — locked behind Pro
 *   Other image models  = 2–4 credits/image
 *   Veo 3.0 Fast (8s)   = 60 credits/clip   (real cost ~$0.50)
 *   Pro video models    = 40–96 credits/clip
 *
 * Plan economics (50% margin):
 *   Basic  ($25/mo, 1,500 cr): worst case 300 Pro imgs × $0.045 = $13.50 → 46% margin
 *   Pro    ($60/mo, 3,600 cr): worst case 720 Pro imgs × $0.045 = $32.40 → 46% margin
 *   Premium($200/mo, 12,000 cr): worst case 2400 imgs × $0.045 = $108 → 46% margin
 *   Realistic mix (base imgs + some video) keeps margin ≥50%
 */

export interface PlanLimits {
  plan: 'free' | 'tester' | 'testing' | 'basic' | 'basic-plus' | 'pro' | 'premium' | 'agency';
  credits: number;                   // Monthly credits
  fullAppGenerations: number;
  sites3D: number;                   // 3D Website Builder projects per month
  uiPreviews: number;
  chats: number;
  canIterate: boolean;
  studioVideoAllowed: boolean;
  studioBatchAllowed: boolean;
  studioAllModels: boolean;          // Can use premium models (Gemini, Veo, etc.)
  maxResolution: number;             // Max image dimension in px
}

// Credit costs per action (margin-safe defaults — actual model costs are in model-router.ts)
export const CREDIT_COSTS = {
  image: 20,          // Default image (Nano Banana Pro — 1K baseline; 2K/4K use model-router tiers)
  imageHD: 20,
  imageEdit: 12,
  videoPerSec: 32,    // Default per second of video (1K baseline; doubled vs legacy)
  upscale: 4,
  removeBG: 4,
  fullAppChat: 15,    // Per chat message in full app builder (Gemini 3 Pro Preview)
} as const;

// Gemini 3 Pro Preview cost estimates (per 1M tokens)
// Input: ~$1.25/1M tokens, Output: ~$10/1M tokens
// Average full app generation: ~2K input + ~8K output tokens ≈ $0.08
// Average iteration: ~4K input + ~4K output tokens ≈ $0.05
// Credit budget per full app build session (including iterations):
export const FULL_APP_CREDIT_BUDGET = 500;  // ~33 chat messages worth

export const PLAN_LIMITS: { [key: string]: PlanLimits } = {
  free: {
    plan: 'free',
    credits: 0,
    fullAppGenerations: 0,
    sites3D: 0,
    uiPreviews: 5,
    chats: 5,
    canIterate: true,
    studioVideoAllowed: false,
    studioBatchAllowed: false,
    studioAllModels: false,
    maxResolution: 768,
  },
  tester: {
    plan: 'tester',
    credits: 200,
    fullAppGenerations: 0,
    sites3D: 1,
    uiPreviews: 5,
    chats: 5,
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: false,
    studioAllModels: true,            // Internal tester: full model access
    maxResolution: 1024,
  },
  /** Testing credits: trial access — 1 site, ~2 images + 1 video + preview (no ZIP) */
  testing: {
    plan: 'testing',
    credits: 800,
    fullAppGenerations: 0,
    sites3D: 1,
    uiPreviews: 3,
    chats: 2,
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: false,
    studioAllModels: false,
    maxResolution: 1024,
  },
  basic: {
    plan: 'basic',
    credits: 1500,                   // Basic: ~500 credits per full 3D site
    fullAppGenerations: 0,             // 3D Builder only on Basic
    sites3D: 3,                       // 3 full 3D websites per month (500 each)
    uiPreviews: 5,
    chats: 3,                         // 1 edit/iteration per site
    canIterate: true,
    studioVideoAllowed: true,          // Veo 3.0 Fast only
    studioBatchAllowed: false,
    studioAllModels: false,            // Gemini models only
    maxResolution: 1024,
  },
  'basic-plus': {
    plan: 'basic-plus',
    credits: 2500,
    fullAppGenerations: 0,
    sites3D: 2,                       // 2 websites per month
    uiPreviews: 10,
    chats: 20,                         // ~10 edits per site
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: true,
    studioAllModels: false,
    maxResolution: 1024,
  },
  pro: {
    plan: 'pro',
    credits: 6000,
    fullAppGenerations: 1,
    sites3D: 4,                        // 4 websites per month
    uiPreviews: 20,
    chats: 40,                          // ~10 edits per site
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: true,
    studioAllModels: false,            // Nano Banana / Veo / full catalog = Premium ($200+) only
    maxResolution: 1536,
  },
  premium: {
    plan: 'premium',
    credits: 25000,
    fullAppGenerations: 3,
    sites3D: 10,                       // 10 websites per month
    uiPreviews: 50,
    chats: 100,                         // ~10 edits per site
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: true,
    studioAllModels: true,
    maxResolution: 1536,
  },
  agency: {
    plan: 'agency',
    credits: 125000,                  // $1,000/mo -> 5× Premium credits
    fullAppGenerations: 15,          // Scale up full-app output capacity
    sites3D: 50,                      // 50 websites per month
    uiPreviews: 250,
    chats: 530,                       // Premium (100) + “Agency uplift” (30) + scale factor (500)
    canIterate: true,
    studioVideoAllowed: true,
    studioBatchAllowed: true,
    studioAllModels: true,
    maxResolution: 1536,
  },
};

export interface GenerationTracking {
  fullAppsGenerated: number;
  sites3DGenerated?: number;          // 3D Website Builder projects completed this month
  uiPreviewsGenerated: number;
  chatsUsed: number;
  // Credit-based studio tracking
  creditsUsed: number;               // Total credits used this month
  studioGenerations: number;         // Legacy total count
  studioImageGenerations?: number;
  studioVideoGenerations?: number;
  builderImageGenerations?: number;
  builderVideoGenerations?: number;
  lastResetDate: string;
  projects: {
    [projectId: string]: {
      projectId: string;
      projectName: string;
      createdAt: string;
      lastModified: string;
      files: { [path: string]: string };
      framework: string;
      status: 'active' | 'archived';
      iterationCount?: number;
      iterationHistory?: Array<{
        timestamp: string;
        changes: {
          modified: { [path: string]: string };
          added: { [path: string]: string };
          deleted: string[];
        };
        description: string;
      }>;
    };
  };
}

/**
 * Calculate credit cost for an action
 */
/**
 * Max number of 3D projects kept in cloud storage per plan.
 * Returns Infinity for unlimited (Premium / Agency).
 */
export function planCloudProjectLimit(plan: string | undefined | null): number {
  const p = String(plan || 'free').toLowerCase().trim();
  if (p === 'premium' || p === 'agency') return 30;
  if (p === 'pro') return 7;
  if (p === 'basic-plus') return 4;
  if (p === 'basic') return 2;
  if (p === 'tester' || p === 'testing') return 1;
  return 0; // free
}

/**
 * Premium ($200/mo) and Agency: cloud backup keeps every 3D project in the account.
 * Lower tiers: limited cloud projects (see planCloudProjectLimit).
 */
export function planKeepsAllCloudProjects(plan: string | undefined | null): boolean {
  return planCloudProjectLimit(plan) >= 30;
}

export function calculateCreditCost(
  action: 'image' | 'imageHD' | 'imageEdit' | 'video' | 'upscale' | 'removeBG',
  videoDurationSec?: number,
): number {
  if (action === 'video' && videoDurationSec) {
    return Math.ceil(videoDurationSec * CREDIT_COSTS.videoPerSec);
  }
  const costMap: Record<string, number> = {
    image: CREDIT_COSTS.image,
    imageHD: CREDIT_COSTS.imageHD,
    imageEdit: CREDIT_COSTS.imageEdit,
    upscale: CREDIT_COSTS.upscale,
    removeBG: CREDIT_COSTS.removeBG,
  };
  return costMap[action] || 1;
}

/**
 * Check if user can generate a full app
 */
export function canGenerateFullApp(
  subscription: { plan: string; status: string },
  generationTracking: GenerationTracking,
): { allowed: boolean; reason?: string } {
  const plan = String(subscription?.plan || 'free').toLowerCase().trim() as PlanLimits['plan'];
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (subscription.status !== 'active' && plan !== 'free' && plan !== 'tester' && plan !== 'testing') {
    return { allowed: false, reason: 'Your subscription is not active. Please renew.' };
  }

  if (plan === 'free' || plan === 'tester' || plan === 'testing' || plan === 'basic' || plan === 'basic-plus') {
    return { allowed: false, reason: 'Full app generation is available on Pro ($60/mo) or higher.' };
  }

  const used = generationTracking.fullAppsGenerated || 0;
  if (used >= limits.fullAppGenerations) {
    return { allowed: false, reason: `You've used all ${limits.fullAppGenerations} full app generations this month.` };
  }

  return { allowed: true };
}

/**
 * Check if user can generate UI preview
 */
export function canGenerateUIPreview(
  subscription: { plan: string; status: string },
  generationTracking: GenerationTracking,
): { allowed: boolean; reason?: string } {
  const plan = subscription.plan as PlanLimits['plan'];
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const used = generationTracking.uiPreviewsGenerated || 0;
  if (used >= limits.uiPreviews) {
    return {
      allowed: false,
      reason: `You've used all ${limits.uiPreviews} UI previews this month.${plan === 'free' ? ' Upgrade to Basic ($25/mo).' : ''}`,
    };
  }

  return { allowed: true };
}

/**
 * Reset monthly generation counts if needed
 */
/**
 * Reset monthly generation counts if needed
 * Uses subscription startDate to determine billing cycle.
 * If no startDate, falls back to 30-day window from last reset.
 */
export function resetMonthlyCountsIfNeeded(
  tracking: GenerationTracking,
  subscription?: { startDate?: string; plan?: string }
): GenerationTracking {
  const now = new Date();
  const lastReset = new Date(tracking.lastResetDate || now.toISOString());

  // EXCLUSION: Never auto-reset 'tester' or 'testing' plan credits. 
  // Testers and testing-credits users get one-time packages that "lock" rather than refill.
  if (subscription?.plan === 'tester' || subscription?.plan === 'testing') {
    return tracking;
  }

  let shouldReset = false;

  if (subscription?.startDate) {
    const start = new Date(subscription.startDate);
    // Determine the "expected" reset date for the current period
    // We want to reset if the current date has passed the same day-of-month as startDate in a newer month than lastReset
    
    // Simple 30-day check is safer for general logic if billing cycles vary
    const daysSinceLastReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastReset >= 30) {
      shouldReset = true;
    } else {
      // Calendar month check as backup for standard subscriptions
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        // Only reset if we've actually passed the day of the month of the start date
        // e.g. Start=15th, Now=April 1st, LastReset=March 15th -> Don't reset yet.
        // Wait until April 15th.
        const currentDay = now.getDate();
        const startDay = start.getDate();
        if (currentDay >= startDay) {
          shouldReset = true;
        }
      }
    }
  } else {
    // Legacy: Reset on calendar month change
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      shouldReset = true;
    }
  }

  if (shouldReset) {
    return {
      ...tracking,
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
      lastResetDate: now.toISOString(),
    };
  }

  return tracking;
}

/**
 * Check if user can use the AI Studio — credit-based
 */
export function canUseStudio(
  subscription: { plan: string; status: string; customStudioCredits?: number; endDate?: string },
  generationTracking: GenerationTracking,
  isVideoNode: boolean = false,
  creditCost: number = 1,
): { allowed: boolean; reason?: string; remaining?: number; creditsUsed?: number; creditsTotal?: number } {
  const plan = String(subscription?.plan || 'free').toLowerCase().trim() as PlanLimits['plan'];
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const customCreditsRaw = (subscription as unknown as Record<string, unknown>)?.customStudioCredits;
  const customCredits =
    typeof customCreditsRaw === 'number' && Number.isFinite(customCreditsRaw) && customCreditsRaw > 0
      ? Math.floor(customCreditsRaw)
      : null;
  const creditsTotal = customCredits ?? limits.credits;

  if (subscription.status !== 'active' && plan !== 'free' && plan !== 'tester' && plan !== 'testing') {
    return { allowed: false, reason: 'Your subscription is not active. Please renew.' };
  }

  // Video access check
  if (isVideoNode && !limits.studioVideoAllowed) {
    return {
      allowed: false,
      reason: 'Video generation requires Basic ($25/mo) or higher. Upgrade to unlock video.',
    };
  }

  // Expiration check (Locking credits after 1 month)
  if (plan === 'tester' || plan === 'testing' || subscription.endDate) {
    const now = new Date();
    if (subscription.endDate) {
      if (now > new Date(subscription.endDate)) {
        return { allowed: false, reason: 'Your access period has ended. Please upgrade to unlock more credits.' };
      }
    } else if (plan === 'tester' || plan === 'testing') {
      // If no explicit end date for a tester, check if 31 days have passed since last reset/start
      const lastReset = new Date(generationTracking.lastResetDate || now.toISOString());
      const daysSinceStart = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart > 31) {
        return { allowed: false, reason: 'Your 30-day tester access has expired. Please upgrade for a full plan.' };
      }
    }
  }

  // Credit check
  const used = generationTracking.creditsUsed || 0;
  const remaining = creditsTotal - used;

  if (used + creditCost > creditsTotal) {
    const tail =
      plan === 'free'
        ? 'Upgrade to Basic ($25/mo) for 1,500 credits.'
        : plan === 'basic'
          ? 'Upgrade to Pro ($60/mo) for 6,000 credits.'
          : plan === 'pro'
            ? 'Upgrade to Premium ($200/mo) for 25,000 credits.'
            : plan === 'premium' || plan === 'agency'
              ? 'Credits refill on your next billing cycle. If your plan already renewed and this looks wrong, contact support.'
              : 'Your access period has ended.';
    return {
      allowed: false,
      reason: `Not enough credits. You have ${remaining} credits remaining (need ${creditCost}). ${tail}`,
      remaining,
      creditsUsed: used,
      creditsTotal,
    };
  }

  return { allowed: true, remaining, creditsUsed: used, creditsTotal };
}

/**
 * Check if user can use chat/iteration feature
 */
export function canUseChat(
  subscription: { plan: string; status: string },
  generationTracking: GenerationTracking,
  chatCost: number = 1,
): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = String(subscription?.plan || 'free').toLowerCase().trim() as PlanLimits['plan'];
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (subscription.status !== 'active' && plan !== 'free' && plan !== 'tester' && plan !== 'testing') {
    return { allowed: false, reason: 'Your subscription is not active.' };
  }

  if (plan === 'premium' && limits.chats === -1) {
    return { allowed: true, remaining: -1 };
  }

  const used = generationTracking.chatsUsed || 0;
  const remaining = limits.chats - used;
  if (used >= limits.chats) {
    return {
      allowed: false,
      reason: `You've used all ${limits.chats} chats this month.${plan === 'free' ? ' Upgrade to Pro.' : ''}`,
      remaining: 0,
    };
  }

  if (remaining < chatCost) {
    return {
      allowed: false,
      reason: `Chat limit reached for this plan. (${used}/${limits.chats} used)`,
      remaining: Math.max(0, remaining),
    };
  }

  return { allowed: true, remaining: remaining - chatCost };
}
