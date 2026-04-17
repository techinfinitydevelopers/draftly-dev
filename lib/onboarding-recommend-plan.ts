/**
 * Maps onboarding answers → a Draftly subscription tier for the recommendation step.
 * Default entry tier emphasizes Basic Plus ($40/mo) per product positioning.
 */

import { PLAN_LIMITS, type PlanLimits } from '@/lib/subscription-plans';

export type OnboardingGoalId =
  | 'immersive_landing'
  | 'portfolio'
  | 'ecommerce'
  | 'campaign'
  | 'client_sites'
  | 'exploring';

export type OnboardingRoleId =
  | 'solo'
  | 'freelancer'
  | 'startup'
  | 'agency'
  | 'business'
  | 'enterprise';

export type OnboardingSiteVolumeId = '1' | '2' | '3-4' | '5-9' | '10+';

export type RecommendedPlanId = 'basic' | 'basic-plus' | 'pro' | 'premium' | 'enterprise';

export type RecommendedPlan = {
  id: RecommendedPlanId;
  name: string;
  /** Monthly USD (0 = custom) */
  price: number;
  tagline: string;
  bullets: string[];
  accentClass: string;
  gradientClass: string;
  panelBgClass: string;
  limits: PlanLimits | null;
};

const ACCENTS: Record<string, Pick<RecommendedPlan, 'accentClass' | 'gradientClass' | 'panelBgClass'>> = {
  basic: {
    accentClass: 'text-blue-400',
    gradientClass: 'from-blue-400 to-cyan-300',
    panelBgClass: 'bg-blue-500/10',
  },
  'basic-plus': {
    accentClass: 'text-emerald-400',
    gradientClass: 'from-emerald-400 to-teal-300',
    panelBgClass: 'bg-emerald-500/10',
  },
  pro: {
    accentClass: 'text-violet-400',
    gradientClass: 'from-violet-400 to-purple-300',
    panelBgClass: 'bg-violet-500/10',
  },
  premium: {
    accentClass: 'text-amber-400',
    gradientClass: 'from-amber-400 to-orange-300',
    panelBgClass: 'bg-amber-500/10',
  },
  enterprise: {
    accentClass: 'text-pink-400',
    gradientClass: 'from-pink-400 to-fuchsia-300',
    panelBgClass: 'bg-pink-500/10',
  },
};

function planCard(
  id: RecommendedPlanId,
  name: string,
  price: number,
  tagline: string,
  bullets: string[],
): RecommendedPlan {
  const a = ACCENTS[id];
  return {
    id,
    name,
    price,
    tagline,
    bullets,
    ...a,
    limits: id === 'enterprise' ? null : PLAN_LIMITS[id] ?? null,
  };
}

/**
 * Recommend a plan from role + how many 3D sites / month the user expects.
 * Goal is stored for analytics / future tuning; it can nudge borderline cases.
 */
export function recommendDraftlyPlan(
  role: OnboardingRoleId,
  sites: OnboardingSiteVolumeId,
  _goal: OnboardingGoalId,
): RecommendedPlan {
  if (role === 'enterprise') {
    return planCard(
      'enterprise',
      'Enterprise',
      0,
      'Volume licensing, security review, and hands-on launch support — tailored to your organization.',
      ['Custom credits and site limits', 'Dedicated success engineer', 'Security & procurement friendly'],
    );
  }

  if (role === 'agency' && (sites === '1' || sites === '2')) {
    return planCard(
      'pro',
      'Pro',
      60,
      'Agencies usually outgrow entry tiers quickly — Pro keeps client work flowing without hitting caps.',
      [
        `${PLAN_LIMITS.pro.sites3D} 3D sites / month`,
        `${PLAN_LIMITS.pro.credits.toLocaleString()} credits / month`,
        'Priority-friendly limits for client delivery',
      ],
    );
  }

  if (sites === '10+' || (role === 'agency' && sites === '5-9')) {
    return planCard(
      'premium',
      'Premium',
      200,
      'ZIP export, full Business OS, integrations, and hosting workflows — scale client delivery from one place.',
      [
        `${PLAN_LIMITS.premium.sites3D} 3D sites / month`,
        `${PLAN_LIMITS.premium.credits.toLocaleString()} credits / month`,
        '2K / 4K where your plan allows, priority support',
      ],
    );
  }

  if (sites === '5-9' || (role === 'business' && sites === '3-4')) {
    return planCard(
      'premium',
      'Premium',
      200,
      'High volume and Premium-only quality tiers when you are all-in on 3D sites.',
      [
        `${PLAN_LIMITS.premium.sites3D} 3D sites / month`,
        `${PLAN_LIMITS.premium.credits.toLocaleString()} credits / month`,
        '2K / 4K media where your plan allows',
      ],
    );
  }

  if (sites === '3-4' || role === 'startup') {
    return planCard(
      'pro',
      'Pro',
      60,
      'Enough sites and credits to iterate seriously and ship for clients or product launches.',
      [
        `${PLAN_LIMITS.pro.sites3D} 3D sites / month`,
        `${PLAN_LIMITS.pro.credits.toLocaleString()} credits / month`,
        'Full-app slot + advanced Studio models',
      ],
    );
  }

  // 1–2 sites/mo — start at Basic Plus ($40) as the default “clear value” tier
  if (sites === '2' || role === 'freelancer' || role === 'business' || role === 'solo') {
    return planCard(
      'basic-plus',
      'Basic Plus',
      40,
      'Our most popular starting point: strong credits and headroom for solo builders, still easy to justify.',
      [
        `${PLAN_LIMITS['basic-plus'].sites3D} 3D sites / month`,
        `${PLAN_LIMITS['basic-plus'].credits.toLocaleString()} credits / month`,
        'Video + batch-friendly — upgrade anytime as you grow',
      ],
    );
  }

  // Single site, tight start — surface Basic Plus ($40) first; legacy Basic ($25) unchanged in billing
  return planCard(
    'basic-plus',
    'Basic Plus',
    40,
    'Start strong with 2,500 credits on Basic Plus ($40/mo), or begin on Basic ($25/mo) on the pricing page.',
    [
      `${PLAN_LIMITS['basic-plus'].sites3D} 3D sites / month`,
      `${PLAN_LIMITS['basic-plus'].credits.toLocaleString()} credits / month`,
      'Everything you need to publish your first scroll-driven 3D site',
    ],
  );
}
