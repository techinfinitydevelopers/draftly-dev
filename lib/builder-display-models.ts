/**
 * Display presets for 3D Builder + home hero.
 * Image: Nano Banana Pro / Nano Banana (API-Easy) only.
 * Video: Veo 3.1 Fast (Google / API-Easy) only; first→last frame via Veo FL models.
 */

export type DisplayModel = {
  id: string;
  label: string;
  /** Short label for chips */
  short: string;
  /** Prepended style instructions (never mention internal routing). */
  preprompt: string;
};

const img = (s: string) => s.trim();

/** 3D Builder image — Nano Banana (default) and Nano Banana Pro. */
export const BUILDER_IMAGE_MODELS: DisplayModel[] = [
  {
    id: 'nano-banana',
    label: 'Nano Banana',
    short: 'NB',
    preprompt: img(`
[Style engine: Nano Banana — fast hero stills]
Clean composition, modern color grading, full-bleed website hero; no text, no logos, no watermarks in-frame.
`),
  },
  {
    id: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    short: 'NB Pro',
    preprompt: img(`
[Style engine: Nano Banana Pro — cinematic hero stills]
Ultra-clean composition, premium color grading, full-bleed website hero; no text, no logos, no watermarks in-frame.
`),
  },
];

/** 3D Builder video — Veo 3.1 Fast only (single-image or first→last via API-Easy FL models). */
export const BUILDER_VIDEO_MODELS: DisplayModel[] = [
  {
    id: 'veo-31-fast',
    label: 'Veo 3.1 Fast (Google)',
    short: 'Veo 3.1',
    preprompt: img(`
[Motion engine: Veo 3.1 Fast]
Smooth slow dolly, gentle parallax, minimal jitter; keep subject stable; watermark-safe framing (center-weighted).
`),
  },
];

export const BUILDER_FIXED_IMAGE_MODEL_ID = BUILDER_IMAGE_MODELS[0].id;

export type BuilderImageResolutionTier = '1K' | '2K';

export const BUILDER_IMAGE_RESOLUTION_OPTIONS: { value: BuilderImageResolutionTier; label: string }[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
];

/** Video quality for Veo / builder pipeline (matches `/api/3d-builder/generate-video`). */
export type BuilderVideoQuality = '720p' | '2k';

export const BUILDER_VIDEO_QUALITY_OPTIONS: { value: BuilderVideoQuality; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '2k', label: '2K' },
];
export const BUILDER_FIXED_VIDEO_MODEL_ID = BUILDER_VIDEO_MODELS[0].id;

/** Default site HTML model (Gemini Pro family) — no UI picker in builder chat. */
export const BUILDER_FIXED_WEBSITE_MODEL_ID = 'gemini-3-1-pro';

/** Site AI labels — billing only; generation uses the user’s chat text with no prepended “profile”. */
export const BUILDER_WEBSITE_DISPLAY_MODELS: DisplayModel[] = [
  { id: 'gemini-3-1-pro', label: 'Gemini 3.1 Pro', short: 'G3.1 Pro', preprompt: '' },
  { id: 'gemini-3-1-flash', label: 'Gemini 3.1 Flash', short: 'G3.1 Flash', preprompt: '' },
];

export function getImageModelById(id: string): DisplayModel {
  return BUILDER_IMAGE_MODELS.find((m) => m.id === id) ?? BUILDER_IMAGE_MODELS[0];
}

export function getVideoModelById(id: string): DisplayModel {
  return BUILDER_VIDEO_MODELS.find((m) => m.id === id) ?? BUILDER_VIDEO_MODELS[0];
}

export function getWebsiteDisplayModelById(id: string): DisplayModel {
  return BUILDER_WEBSITE_DISPLAY_MODELS.find((m) => m.id === id) ?? BUILDER_WEBSITE_DISPLAY_MODELS[0];
}

export function wrapImagePrompt(userPrompt: string, modelId: string): string {
  const m = getImageModelById(modelId);
  return `${m.preprompt}\n\nUser creative direction:\n${userPrompt.trim()}`;
}

export function wrapVideoPrompt(userPrompt: string, modelId: string): string {
  const m = getVideoModelById(modelId);
  return `${m.preprompt}\n\nDirector / motion notes:\n${userPrompt.trim()}`;
}

/** Pass-through: site generation uses the chat message only (no style “profiles”). */
export function wrapWebsiteUserPrompt(userPrompt: string, _modelId?: string): string {
  return userPrompt.trim();
}
