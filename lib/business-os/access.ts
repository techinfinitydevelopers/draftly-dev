/** Keep in sync with `Subscription['plan']` in hooks/useSubscription.ts */
export type DraftlyPlanId =
  | 'free'
  | 'tester'
  | 'testing'
  | 'basic'
  | 'basic-plus'
  | 'pro'
  | 'premium'
  | 'agency';

/** Premium ($200/mo)+: ZIP export, integrations, hosting tools in Business OS. Legacy `agency` included. */
const BUSINESS_OS_PLANS: DraftlyPlanId[] = ['premium', 'agency', 'tester', 'testing'];

export function planHasBusinessOs(
  plan: DraftlyPlanId,
  isOwner: boolean,
  isTestingCreditsEmail: boolean,
): boolean {
  if (isOwner || isTestingCreditsEmail) return true;
  return BUSINESS_OS_PLANS.includes(plan);
}

/** Tiers that build in 3D Builder but do not get Business OS / ZIP (until Premium). */
export function planIsBuildTierOnly(
  plan: DraftlyPlanId,
  isOwner: boolean,
  isTestingCreditsEmail: boolean,
): boolean {
  if (isOwner || isTestingCreditsEmail) return false;
  return plan === 'free' || plan === 'basic' || plan === 'basic-plus' || plan === 'pro';
}
