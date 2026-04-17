/**
 * 3D Builder text prompts (chat, enhance, site generation) — length caps and credit surcharges.
 * Basic & lower extended cap; Basic Plus+ get a higher cap with extra credits for very long prompts.
 */

/** Max characters for basic, tester, testing, etc. */
export const BUILDER_PROMPT_MAX_CHARS_STANDARD = 8000;

/** Max for Basic Plus, Pro, Premium (and owner). */
export const BUILDER_PROMPT_MAX_CHARS_EXTENDED = 20000;

export function getPromptLengthTier(plan: string, isOwner: boolean): 'standard' | 'extended' {
  if (isOwner) return 'extended';
  if (plan === 'basic-plus' || plan === 'pro' || plan === 'premium') return 'extended';
  return 'standard';
}

export function getMaxPromptCharsForPlan(plan: string, isOwner: boolean): number {
  return getPromptLengthTier(plan, isOwner) === 'extended'
    ? BUILDER_PROMPT_MAX_CHARS_EXTENDED
    : BUILDER_PROMPT_MAX_CHARS_STANDARD;
}

/**
 * Extra credits on top of base builder billing for long prompts.
 * Standard tier: steep surcharge as prompt approaches cap.
 * Extended tier: allows longer prompts but with stronger incremental cost.
 */
export function getPromptLengthSurchargeCredits(promptLen: number, tier: 'standard' | 'extended'): number {
  if (promptLen <= 0) return 0;
  if (tier === 'standard') {
    if (promptLen <= 1200) return 0;
    const over = Math.max(0, promptLen - 1200);
    return Math.min(120, Math.ceil(over / 40));
  }
  if (promptLen <= 2500) return 0;
  const over = Math.max(0, promptLen - 2500);
  return Math.min(320, Math.ceil(over / 32));
}

/** Enhance-prompt API: small base + optional bump for long input (same char caps as chat). */
export function getEnhancePromptCreditCost(promptLen: number, tier: 'standard' | 'extended'): number {
  const base = 1;
  const over = Math.max(0, promptLen - (tier === 'extended' ? 3000 : 1500));
  const extra = Math.min(tier === 'extended' ? 12 : 6, Math.ceil(over / 400));
  return base + extra;
}
