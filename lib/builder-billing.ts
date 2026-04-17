/**
 * Cost and credit estimation for 3D Builder website generation/iteration.
 * Estimates are conservative and used for rate limiting + credit charging.
 */

import { getCreditMultiplier } from './builder-models';
import { getPromptLengthSurchargeCredits, getPromptLengthTier } from './builder-prompt-limits';

export type BuilderBillingInput = {
  prompt: string;
  existingCode?: string;
  assetsCount?: number;
  mode?: 'frame-scroll' | 'video-hero';
  isIteration?: boolean;
  /** Model ID for credit multiplier (see `WEBSITE_MODEL_CREDIT_CONFIG` in builder-model-credits.ts) */
  modelId?: string;
  /** When set, adds long-prompt surcharge (Basic Plus+ allows longer prompts with higher max surcharge). */
  subscriptionPlan?: string;
  isOwner?: boolean;
};

export type BuilderBillingEstimate = {
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  creditCost: number;
};

// Gemini 3 Flash Preview pricing baseline (per 1M tokens) used for internal credit estimation.
// Source: https://ai.google.dev/gemini-api/docs/pricing
const USD_PER_MILLION_INPUT_TOKENS = 0.50;
const USD_PER_MILLION_OUTPUT_TOKENS = 3.00;
// Target margin: ~60–70% and higher pressure for very long prompts.
// This multiplier effectively applies a 3–5x cost guardrail over raw API estimates.
const CREDITS_PER_USD_AT_TARGET_MARGIN = 210;
// Tester-access users are provisioned with 200 credits and should still be able
// to complete real 3D Builder workflows (roughly 2 full sites + a few iterations).
const BUILDER_FULL_WEBSITE_BASE_CREDITS = 140;
const BUILDER_ITERATION_BASE_CREDITS = 24;

function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateBuilderBilling(input: BuilderBillingInput): BuilderBillingEstimate {
  const promptTokens = estimateTokensFromText(input.prompt || '');
  const existingCodeTokens = estimateTokensFromText(input.existingCode || '');
  const assetOverheadTokens = Math.max(0, (input.assetsCount || 0)) * 180;

  const inputTokens = promptTokens + existingCodeTokens + assetOverheadTokens + 1600;

  const outputBase = input.isIteration ? 2600 : 5200;
  const modeBonus = input.mode === 'video-hero' ? 600 : 1000;
  const outputTokens = outputBase + modeBonus;

  const inputUsd = (inputTokens / 1_000_000) * USD_PER_MILLION_INPUT_TOKENS;
  const outputUsd = (outputTokens / 1_000_000) * USD_PER_MILLION_OUTPUT_TOKENS;
  const estimatedUsd = inputUsd + outputUsd;

  const minCredits = input.isIteration ? BUILDER_ITERATION_BASE_CREDITS : BUILDER_FULL_WEBSITE_BASE_CREDITS;
  let creditCost = Math.max(minCredits, Math.ceil(estimatedUsd * CREDITS_PER_USD_AT_TARGET_MARGIN));

  // Strong long-context pressure so very large prompts/code consume credits faster.
  const heavyInputFactor =
    inputTokens > 10000 ? 2.4 :
      inputTokens > 7000 ? 1.9 :
        inputTokens > 4500 ? 1.45 :
          inputTokens > 3000 ? 1.2 : 1;
  creditCost = Math.ceil(creditCost * heavyInputFactor);

  const multiplier = getCreditMultiplier(input.modelId || 'gemini-3-1-flash');
  creditCost = Math.ceil(creditCost * multiplier);

  if (input.subscriptionPlan) {
    const tier = getPromptLengthTier(input.subscriptionPlan, input.isOwner ?? false);
    creditCost += getPromptLengthSurchargeCredits(input.prompt.length, tier);
  }

  return { inputTokens, outputTokens, estimatedUsd, creditCost };
}

