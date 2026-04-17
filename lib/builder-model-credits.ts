/**
 * 3D Builder — credit multipliers and per-model media costs.
 *
 * Website “Site AI” options are style/routing presets; billing uses multipliers derived from
 * public API price *ratios* (vs a fast baseline), then doubled for the charged multiplier — see
 * https://ai.google.dev/gemini-api/docs/pricing (Flash vs Pro output ~4×) and analogous tiers
 * for other brands. Values are conservative business multipliers, not live API quotes.
 */

import { getVideoCreditCost } from '@/lib/model-router';

/** Charged multiplier applied to estimated site-generation credits (same value shown in UI). */
export const WEBSITE_MODEL_CREDIT_CONFIG: Record<
  string,
  { creditMultiplier: number; multiplierLabel: string }
> = {
  'gemini-3-1-flash': { creditMultiplier: 1, multiplierLabel: '1×' },
  'gemini-3-1-pro': { creditMultiplier: 2, multiplierLabel: '2×' },
};

const WEBSITE_FALLBACK_ID = 'gemini-3-1-flash';

export function getWebsiteModelCreditConfig(modelId: string) {
  return WEBSITE_MODEL_CREDIT_CONFIG[modelId] ?? WEBSITE_MODEL_CREDIT_CONFIG[WEBSITE_FALLBACK_ID];
}

/** Builder image lane — API-Easy Nano Banana family only. */
const BUILDER_IMAGE_CREDITS: Record<string, { credits: number; multiplierLabel: string }> = {
  'nano-banana-pro': { credits: 20, multiplierLabel: '2×' },
  'nano-banana': { credits: 15, multiplierLabel: '1.5×' },
};

export function getBuilderImageCreditCost(displayImageModelId: string): number {
  return BUILDER_IMAGE_CREDITS[displayImageModelId]?.credits ?? 10;
}

export function getBuilderImageCreditLabel(displayImageModelId: string): string {
  return BUILDER_IMAGE_CREDITS[displayImageModelId]?.multiplierLabel ?? '2×';
}

const BUILDER_VIDEO_BASELINE_MODEL = 'veo-3.1-fast';
const DEFAULT_VIDEO_DURATION = 8;

/** Maps builder UI video choice → `model-router` billing id (8s clip unless noted). */
export function resolveBuilderVideoCreditModelId(
  _displayVideoModelId?: string,
  _resolution?: '720p' | '1080p' | '2k' | '4k',
): string {
  return 'veo-3.1-fast';
}

function mapBuilderResolutionToStudioTier(res: '720p' | '1080p' | '2k' | '4k'): string {
  if (res === '4k') return '4K';
  if (res === '2k') return '2K';
  return '1K';
}

export function estimateBuilderVideoCredits(
  displayVideoModelId: string,
  opts?: { durationSec?: number; resolution?: '720p' | '1080p' | '2k' | '4k' },
): number {
  const durationSec = opts?.durationSec ?? DEFAULT_VIDEO_DURATION;
  const resolution = opts?.resolution ?? '720p';
  const id = resolveBuilderVideoCreditModelId(displayVideoModelId, resolution);
  const tier = mapBuilderResolutionToStudioTier(resolution);
  return getVideoCreditCost(id, durationSec, tier);
}

/** UI “×” vs cheapest builder clip at same duration (Veo 3.1 Fast @ 720p). */
export function getBuilderVideoMultiplierLabel(
  displayVideoModelId: string,
  opts?: { durationSec?: number; resolution?: '720p' | '1080p' | '2k' | '4k' },
): string {
  const durationSec = opts?.durationSec ?? DEFAULT_VIDEO_DURATION;
  const resolution = opts?.resolution ?? '720p';
  const baseline = getVideoCreditCost(BUILDER_VIDEO_BASELINE_MODEL, durationSec, '1K');
  if (baseline <= 0) return '2×';
  const cost = estimateBuilderVideoCredits(displayVideoModelId, { durationSec, resolution });
  const raw = (2 * cost) / baseline;
  const rounded = Math.round(raw * 10) / 10;
  return `${rounded}×`;
}
