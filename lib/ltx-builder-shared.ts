/**
 * LTX official API — shared helpers for 3D Builder (client + server).
 * Model matrix: https://docs.ltx.video/models
 */

export type LtxOfficialApiModel = 'ltx-2-fast' | 'ltx-2-pro' | 'ltx-2-3-fast' | 'ltx-2-3-pro';

export type LtxResolutionTier = '1080p' | '1440p' | '4k';

/** Builder video quality → LTX pricing tier (720p maps to 1080p API). */
export function builderVideoQualityToLtxTier(
  quality: '720p' | '1080p' | '2k' | '4k',
): LtxResolutionTier {
  if (quality === '4k') return '4k';
  if (quality === '2k') return '1440p';
  return '1080p';
}

/** LTX-2.3 — landscape + portrait resolution strings. */
export function mapBuilderQualityToLtxResolution(
  quality: '720p' | '1080p' | '2k' | '4k',
  aspect: '16:9' | '9:16',
): string {
  const landscape = aspect === '16:9';
  if (quality === '4k') return landscape ? '3840x2160' : '2160x3840';
  if (quality === '2k') return landscape ? '2560x1440' : '1440x2560';
  return landscape ? '1920x1080' : '1080x1920';
}

/** LTX-2 — 16:9 only (docs). 720p uses 1080p output. */
export function mapLtx2LandscapeResolution(quality: '720p' | '1080p' | '2k' | '4k'): string {
  if (quality === '4k') return '3840x2160';
  if (quality === '2k') return '2560x1440';
  return '1920x1080';
}

export function defaultLtxFpsForModel(apiModel: LtxOfficialApiModel): number {
  return apiModel === 'ltx-2-fast' || apiModel === 'ltx-2-pro' ? 25 : 24;
}

export function normalizeLtxFps(apiModel: LtxOfficialApiModel, fps: number): number {
  const allowed: readonly number[] =
    apiModel === 'ltx-2-fast' || apiModel === 'ltx-2-pro' ? LTX_2_FPS_OPTIONS : LTX_23_FPS_OPTIONS;
  if (allowed.includes(fps)) return fps;
  return defaultLtxFpsForModel(apiModel);
}

const LONG_1080: number[] = [6, 8, 10, 12, 14, 16, 18, 20];
const SHORT_ALL: number[] = [6, 8, 10];

/** Allowed output durations (seconds) from LTX model matrix. */
export function getAllowedLtxDurations(
  apiModel: LtxOfficialApiModel,
  tier: LtxResolutionTier,
  fps: number,
): number[] {
  const isLtx2 = apiModel === 'ltx-2-fast' || apiModel === 'ltx-2-pro';
  const highFps = fps >= 48 || fps === 50;

  if (tier === '1440p' || tier === '4k') return SHORT_ALL;

  if (isLtx2) {
    if (highFps || fps === 50) return SHORT_ALL;
    return LONG_1080;
  }

  // LTX-2.3
  if (fps === 24 || fps === 25) return LONG_1080;
  if (fps === 48 || fps === 50) return SHORT_ALL;
  return LONG_1080;
}

export function clampLtxDuration(
  requested: number,
  apiModel: LtxOfficialApiModel,
  tier: LtxResolutionTier,
  fps: number,
): number {
  const allowed = getAllowedLtxDurations(apiModel, tier, fps);
  if (allowed.length === 0) return 8;
  if (allowed.includes(requested)) return requested;
  const below = allowed.filter((d) => d <= requested);
  if (below.length) return below[below.length - 1];
  return allowed[0];
}

export const LTX_2_FPS_OPTIONS = [25, 50] as const;
export const LTX_23_FPS_OPTIONS = [24, 25, 48, 50] as const;

/**
 * Duration/FPS matrix for builder UI — fal `ltx-23-fast-fal` follows LTX-2.3 Fast timing rules.
 */
export function displayVideoModelIdToLtxDurationModel(displayId: string): LtxOfficialApiModel | null {
  return displayId.trim() === 'ltx-23-fast-fal' ? 'ltx-2-3-fast' : null;
}
