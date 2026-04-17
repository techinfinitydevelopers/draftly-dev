/**
 * Model Router — Routes requests to the correct provider and enforces plan-tier access.
 *
 * Credit costs are set per-model to maintain ≥50% margin.
 * Frontend shows "~X images" using base model cost; higher-quality models
 * silently cost more credits (standard SaaS practice).
 *
 * Resolution tiers:
 *   Free:    max 768px
 *   Basic:   max 1024px
 *   Pro:     max 1024px
 *   Premium: max 1536px
 */

import { PLAN_LIMITS, CREDIT_COSTS, type PlanLimits } from './subscription-plans';

/** 2K/4K Studio image & video output — Premium ($200) and above only. */
export function canUseStudioHighResolution(plan: string): boolean {
  // User-facing promise: 2K/4K is only available on $200/mo (Premium) and higher.
  // Internal/testing plans still get access so QA can validate the pipeline.
  return plan === 'premium' || plan === 'agency' || plan === 'tester' || plan === 'testing';
}

/**
 * Nano Banana (API-Easy / Gemini) and the full Studio image catalog beyond Seedream/Kling —
 * Premium ($200/mo), Agency, and internal tester. Basic / Basic Plus / Pro use Seedream (+ Kling in Studio).
 */
export function canUsePremiumStudioModels(plan: string): boolean {
  const p = String(plan || 'free').toLowerCase().trim();
  return p === 'premium' || p === 'agency' || p === 'tester';
}

/**
 * LTX 2.3 extend-video on fal (~$0.10/s) — Pro ($60) and above; requires `FAL_KEY`. Not on Basic / trial testing.
 */
export function canUseBuilderVideoExtend(plan: string): boolean {
  const p = String(plan || 'free').toLowerCase().trim();
  return p === 'pro' || p === 'premium' || p === 'agency' || p === 'tester';
}

/**
 * Veo 3.1 Fast + first→last frame in 3D Builder — any paid Builder plan (Basic+).
 * 2K/4K output remains Premium-only ({@link canUseStudioHighResolution}).
 */
export function canUseBuilderVeoMotion(plan: string): boolean {
  const p = String(plan || 'free').toLowerCase().trim();
  return (
    p === 'basic' ||
    p === 'basic-plus' ||
    p === 'pro' ||
    p === 'premium' ||
    p === 'agency' ||
    p === 'tester' ||
    p === 'testing'
  );
}

export function parseStudioResolutionTier(resolution: string | undefined): '1K' | '2K' | '4K' {
  const u = String(resolution || '1K').toUpperCase();
  if (u === '4K') return '4K';
  if (u === '2K') return '2K';
  return '1K';
}

function forceApiEasyOnly(): boolean {
  return process.env.API_EASY_FORCE_ALL === 'true';
}

// ── Image model definitions ─────────────────────────────────────────

export interface ImageModelDef {
  id: string;
  label: string;
  provider: 'fal' | 'replicate' | 'api-easy' | 'local';
  falKey?: string;
  replicateKey?: string;
  apiEasyModel?: string;
  costPerImage: number;       // USD cost
  creditCost: number;         // credits charged to user
  maxResolution: number;
  tier: 'free' | 'pro' | 'premium';
}

export const IMAGE_MODELS: ImageModelDef[] = [
  // ── API-Easy — primary model (Nano Banana Pro) ───────────────────
  {
    id: 'nano-banana-pro',
    label: 'Nano Banana Pro (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'nano-banana-pro',
    costPerImage: 0.045,
    creditCost: 20,                    // 1K baseline (doubled vs legacy); 2K/4K use getImageCreditCost tier mult
    maxResolution: 4096,
    tier: 'premium',
  },
  {
    id: 'nano-banana',
    label: 'Nano Banana (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'nano-banana',
    costPerImage: 0.032,
    creditCost: 15,
    maxResolution: 2048,
    tier: 'premium',
  },
  {
    id: 'kling-image-v3',
    label: 'Kling Image V3 (fal)',
    provider: 'fal',
    falKey: 'kling-image/v3/text-to-image',
    costPerImage: 0.028,
    creditCost: 22,
    maxResolution: 2048,
    tier: 'free',
  },
  {
    id: 'seedream-4.5',
    label: 'Seedream 4.5 — ByteDance (fal)',
    provider: 'fal',
    falKey: 'bytedance/seedream/v4.5/text-to-image',
    costPerImage: 0.04,
    creditCost: 18,
    maxResolution: 4096,
    tier: 'free',
  },
  // ── fal.ai — batch & variety models ──────────────────────────────
  {
    id: 'flux-schnell',
    label: 'Flux Schnell (Fast)',
    provider: 'fal',
    falKey: 'flux-schnell',
    costPerImage: 0.01,
    creditCost: 12,
    maxResolution: 1024,
    tier: 'premium',                  // Premium-only
  },
  {
    id: 'flux-dev',
    label: 'Flux Dev (Quality)',
    provider: 'fal',
    falKey: 'flux-dev',
    costPerImage: 0.02,
    creditCost: 12,
    maxResolution: 1024,
    tier: 'premium',
  },
  {
    id: 'flux-pro',
    label: 'Flux Pro (HD)',
    provider: 'fal',
    falKey: 'flux-pro',
    costPerImage: 0.04,
    creditCost: 16,
    maxResolution: 1536,
    tier: 'premium',
  },
  {
    id: 'fooocus',
    label: 'Fooocus (Creative)',
    provider: 'fal',
    falKey: 'fooocus',
    costPerImage: 0.02,
    creditCost: 12,
    maxResolution: 1024,
    tier: 'premium',
  },
  {
    id: 'stable-cascade',
    label: 'Stable Cascade',
    provider: 'fal',
    falKey: 'stable-cascade',
    costPerImage: 0.02,
    creditCost: 12,
    maxResolution: 1024,
    tier: 'premium',
  },
  // ── Premium-exclusive image models ───────────────────────────────
  {
    id: 'sdxl-turbo',
    label: 'SDXL Turbo',
    provider: 'fal',
    falKey: 'sdxl-turbo',
    costPerImage: 0.01,
    creditCost: 8,
    maxResolution: 1024,
    tier: 'premium',
  },
  {
    id: 'playground-v2.5',
    label: 'Playground v2.5',
    provider: 'fal',
    falKey: 'playground-v2.5',
    costPerImage: 0.01,
    creditCost: 8,
    maxResolution: 1024,
    tier: 'premium',
  },
  {
    id: 'juggernaut-xl',
    label: 'Juggernaut XL',
    provider: 'fal',
    falKey: 'juggernaut-xl',
    costPerImage: 0.02,
    creditCost: 16,
    maxResolution: 1536,
    tier: 'premium',
  },
  {
    id: 'realvisxl-v4',
    label: 'RealVisXL v4',
    provider: 'fal',
    falKey: 'realvisxl-v4',
    costPerImage: 0.02,
    creditCost: 16,
    maxResolution: 1536,
    tier: 'premium',
  },
  {
    id: 'dreamshaper-xl',
    label: 'DreamShaper XL',
    provider: 'fal',
    falKey: 'dreamshaper-xl',
    costPerImage: 0.01,
    creditCost: 8,
    maxResolution: 1024,
    tier: 'premium',
  },
];

// ── Video model definitions ─────────────────────────────────────────

export interface VideoModelDef {
  id: string;
  label: string;
  provider: 'fal' | 'replicate' | 'api-easy' | 'gemini' | 'local' | 'ltx';
  falKey?: string;
  replicateKey?: string;
  apiEasyModel?: string;
  costPerSec: number;         // USD cost per second
  creditCostPerSec: number;   // credits per second
  maxDuration: number;        // max seconds
  tier: 'free' | 'pro' | 'premium';
}

export const VIDEO_MODELS: VideoModelDef[] = [
  {
    id: 'api-easy-veo',
    label: 'API-Easy Video',
    provider: 'api-easy',
    apiEasyModel: 'veo-3.1-fast',
    costPerSec: 0.40,
    creditCostPerSec: 32,
    maxDuration: 8,
    tier: 'premium',
  },
  /** API-Easy Veo fast tier — portrait 9:16 (matches `resolveApiEasyVideoModel` default for 9:16). */
  {
    id: 'veo-3.1-fast',
    label: 'Veo 3.1 Fast (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'veo-3.1-fast',
    costPerSec: 0.15,
    creditCostPerSec: 32,
    maxDuration: 8,
    tier: 'free',
  },
  /** API-Easy — 16:9 landscape fast (`resolveApiEasyVideoModel` landscape fallback). */
  {
    id: 'veo-3.1-landscape-fast',
    label: 'Veo 3.1 Landscape Fast (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'veo-3.1-landscape-fast',
    costPerSec: 0.15,
    creditCostPerSec: 32,
    maxDuration: 8,
    tier: 'free',
  },
  /** First + last frame, portrait fast (`resolveApiEasyVideoModelFL` 9:16). */
  {
    id: 'veo-3.1-fast-fl',
    label: 'Veo 3.1 Fast FL (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'veo-3.1-fast-fl',
    costPerSec: 0.15,
    creditCostPerSec: 32,
    maxDuration: 8,
    tier: 'free',
  },
  /** First + last frame, landscape fast (`resolveApiEasyVideoModelFL` 16:9). */
  {
    id: 'veo-3.1-landscape-fast-fl',
    label: 'Veo 3.1 Landscape Fast FL (API-Easy)',
    provider: 'api-easy',
    apiEasyModel: 'veo-3.1-landscape-fast-fl',
    costPerSec: 0.15,
    creditCostPerSec: 32,
    maxDuration: 8,
    tier: 'free',
  },
  /** fal — Veo 3.1 Fast first+last frame (~$0.15/s with audio @ 720p/1080p on fal). */
  {
    id: 'veo-3.1-fast-fal-fl',
    label: 'Veo 3.1 Fast FL (fal)',
    provider: 'fal',
    costPerSec: 0.15,
    creditCostPerSec: 45,
    maxDuration: 8,
    tier: 'premium',
  },
  /** LTX official API — image-to-video LTX-2.3 Pro (~$0.08/s @ 1080p post Apr 2026). */
  {
    id: 'ltx-2-3-pro-direct',
    label: 'LTX 2.3 Pro (LTX API)',
    provider: 'ltx',
    costPerSec: 0.08,
    creditCostPerSec: 40, // 80% margin
    maxDuration: 10,
    tier: 'premium',
  },
  /** LTX official API — image-to-video LTX-2.3 Fast (~$0.06/s @ 1080p post Apr 2026). */
  {
    id: 'ltx-2-3-fast-direct',
    label: 'LTX 2.3 Fast (LTX API)',
    provider: 'ltx',
    costPerSec: 0.06,
    creditCostPerSec: 30, // 80% margin
    maxDuration: 20,
    tier: 'premium',
  },
  /** fal — LTX-2.3 Fast (deprecated in product UI; kept for billing reference only). */
  {
    id: 'ltx-2-3-fast-fal',
    label: 'LTX 2.3 Fast (fal)',
    provider: 'fal',
    costPerSec: 0.04,
    creditCostPerSec: 30,
    maxDuration: 20,
    tier: 'premium',
  },
  /** fal — LTX-2.3 extend-video (~$0.10/s); Pro+ in 3D Builder. */
  {
    id: 'ltx-2-3-extend-fal',
    label: 'LTX 2.3 Extend (fal)',
    provider: 'fal',
    costPerSec: 0.1,
    creditCostPerSec: 34,
    maxDuration: 20,
    tier: 'pro',
  },
  /** LTX official API — LTX-2 Fast (~$0.04/s @ 1080p). */
  {
    id: 'ltx-2-fast-direct',
    label: 'LTX 2 Fast (LTX API)',
    provider: 'ltx',
    costPerSec: 0.04,
    creditCostPerSec: 20, // 80% margin
    maxDuration: 20,
    tier: 'premium',
  },
  /** LTX official API — LTX-2 Pro (~$0.06/s @ 1080p). */
  {
    id: 'ltx-2-pro-direct',
    label: 'LTX 2 Pro (LTX API)',
    provider: 'ltx',
    costPerSec: 0.06,
    creditCostPerSec: 30, // 80% margin
    maxDuration: 20,
    tier: 'premium',
  },
  // ── Direct Gemini Veo — primary video models ─────────────────────
  {
    id: 'veo-3.1',
    label: 'Veo 3.1 (Gemini)',
    provider: 'gemini',
    costPerSec: 0.60,
    creditCostPerSec: 48,
    maxDuration: 8,
    tier: 'premium',
  },
  {
    id: 'ltx-23-fast',
    label: 'LTX 2.3 Fast (fal)',
    provider: 'fal',
    falKey: 'ltx-2.3/image-to-video/fast',
    costPerSec: 0.32,
    creditCostPerSec: 32,
    maxDuration: 20,
    tier: 'premium',
  },
  /** fal — LTX 13B distilled text-to-video (~$0.04/clip); billed as short clip, not per-second Veo tier. */
  {
    id: 'ltx-video-13b-distilled',
    label: 'LTX Video 13B Distilled (fal T2V)',
    provider: 'fal',
    falKey: 'ltx-video-13b-distilled',
    costPerSec: 0.04 / 6,
    creditCostPerSec: 3,
    maxDuration: 60,
    tier: 'free',
  },
  // ── fal.ai video models ──────────────────────────────────────────
  {
    id: 'wan-video',
    label: 'WAN Video (Fast)',
    provider: 'fal',
    falKey: 'wan-video',
    costPerSec: 0.15,
    creditCostPerSec: 32,
    maxDuration: 5,
    tier: 'premium',
  },
  {
    id: 'kling-1.6',
    label: 'Kling 1.6',
    provider: 'fal',
    falKey: 'kling-1.6',
    costPerSec: 0.25,
    creditCostPerSec: 36,
    maxDuration: 10,
    tier: 'premium',
  },
  {
    id: 'kling-1.6-pro',
    label: 'Kling 1.6 Pro',
    provider: 'fal',
    falKey: 'kling-1.6-pro',
    costPerSec: 0.35,
    creditCostPerSec: 36,
    maxDuration: 10,
    tier: 'premium',
  },
  {
    id: 'minimax-video-fal',
    label: 'Minimax Video',
    provider: 'fal',
    falKey: 'minimax-video-fal',
    costPerSec: 0.30,
    creditCostPerSec: 32,
    maxDuration: 6,
    tier: 'premium',
  },
  {
    id: 'luma-dream-machine',
    label: 'Luma Dream Machine',
    provider: 'fal',
    falKey: 'luma-dream-machine',
    costPerSec: 0.25,
    creditCostPerSec: 32,
    maxDuration: 5,
    tier: 'premium',
  },
  {
    id: 'hunyuan-video',
    label: 'Hunyuan Video',
    provider: 'fal',
    falKey: 'hunyuan-video',
    costPerSec: 0.20,
    creditCostPerSec: 32,
    maxDuration: 6,
    tier: 'premium',
  },
];

function normalizeVideoModelId(modelId: string): string {
  if (modelId === 'veo-3.0-fast') return 'veo-3.1-fast';
  if (modelId === 'veo-3.0') return 'veo-3.1';
  return modelId;
}

/** API-Easy–backed Veo fast models (single- or first-last-frame); 2K/4K Studio routes via fal when applicable. */
export function isVeoApiEasyStudioModel(modelId: string): boolean {
  const n = normalizeVideoModelId(modelId);
  return (
    n === 'api-easy-veo' ||
    n === 'veo-3.1-fast' ||
    n === 'veo-3.1-landscape-fast' ||
    n === 'veo-3.1-fast-fl' ||
    n === 'veo-3.1-landscape-fast-fl'
  );
}

// ── Router functions ────────────────────────────────────────────────

/**
 * Get list of image models available for a plan
 */
export function getAvailableImageModels(plan: string): ImageModelDef[] {
  if (forceApiEasyOnly()) {
    return IMAGE_MODELS.filter((m) => m.provider === 'api-easy');
  }
  const p = String(plan || 'free').toLowerCase().trim();
  if (p === 'free') return [];

  // Below Premium: Seedream + Kling only (no Nano Banana / Flux — those unlock at $200/mo).
  if (p === 'basic' || p === 'basic-plus' || p === 'testing' || p === 'pro') {
    return IMAGE_MODELS.filter((m) => m.id === 'kling-image-v3' || m.id === 'seedream-4.5');
  }

  if (p === 'premium' || p === 'agency' || p === 'tester') {
    return IMAGE_MODELS;
  }

  return [];
}

/** Product default: Veo (API-Easy / Gemini); LTX is not offered in Studio UI. */
function excludeLtxVideoModels(models: VideoModelDef[]): VideoModelDef[] {
  return models.filter((m) => m.provider !== 'ltx' && !m.id.includes('ltx'));
}

/**
 * Get list of video models available for a plan
 */
export function getAvailableVideoModels(plan: string): VideoModelDef[] {
  const base = excludeLtxVideoModels(VIDEO_MODELS);
  if (forceApiEasyOnly()) {
    return base.filter((m) => m.provider === 'api-easy' || m.provider === 'gemini');
  }
  const p = String(plan || 'free').toLowerCase().trim();
  if (p === 'free') return [];

  if (p === 'basic' || p === 'basic-plus' || p === 'testing') {
    return base.filter((m) => m.tier === 'free');
  }

  if (p === 'pro') {
    return base.filter((m) => m.tier === 'free' || m.tier === 'pro');
  }

  if (p === 'premium' || p === 'agency' || p === 'tester') {
    return base;
  }

  return [];
}

/** Strict Studio image pick — no silent downgrade to a different model. */
export function findImageModelForPlan(modelId: string, plan: string): ImageModelDef | undefined {
  return getAvailableImageModels(plan).find((m) => m.id === modelId);
}

/** Strict Studio video pick — no silent downgrade. */
export function findVideoModelForPlan(modelId: string, plan: string): VideoModelDef | undefined {
  const n = normalizeVideoModelId(modelId);
  return getAvailableVideoModels(plan).find((m) => m.id === n);
}

/**
 * Resolve an image model by ID, respecting plan access.
 * Falls back to cheapest available model if requested model is above plan tier.
 */
export function resolveImageModel(modelId: string, plan: string): ImageModelDef {
  const available = getAvailableImageModels(plan);
  const requested = available.find(m => m.id === modelId);
  if (requested) return requested;

  // Fallback to cheapest available
  return available[0] || IMAGE_MODELS[0];
}

/**
 * Resolve a video model by ID, respecting plan access.
 */
export function resolveVideoModel(modelId: string, plan: string): VideoModelDef {
  const normalizedModelId = normalizeVideoModelId(modelId);
  const available = getAvailableVideoModels(plan);
  const requested = available.find(m => m.id === normalizedModelId);
  if (requested) return requested;

  // Fallback to cheapest available
  return available[0] || VIDEO_MODELS[0];
}

/**
 * Calculate credit cost for an image generation (1K / 2K / 4K tiers).
 * Pass `resolution` as "1K" | "2K" | "4K" (or body `resolution` string).
 */
export function getImageCreditCost(modelId: string, resolution?: string | number): number {
  const model = IMAGE_MODELS.find(m => m.id === modelId);
  const base = model?.creditCost ?? CREDIT_COSTS.image;
  const tier = typeof resolution === 'string' ? parseStudioResolutionTier(resolution) : '1K';
  const tierMult = tier === '4K' ? 30 : tier === '2K' ? 12 : 1;
  return Math.ceil(base * tierMult);
}

/**
 * Calculate credit cost for a video generation (1K ≈ 720p/1080p baseline; 2K/4K multiply fal-era cost).
 */
export function getVideoCreditCost(modelId: string, durationSec: number, resolution?: string): number {
  const normalizedModelId = normalizeVideoModelId(modelId);
  const model = VIDEO_MODELS.find(m => m.id === normalizedModelId);
  const perSec = model?.creditCostPerSec || CREDIT_COSTS.videoPerSec;
  const tier = parseStudioResolutionTier(resolution);
  const tierMult = tier === '4K' ? 6 : tier === '2K' ? 4 : 1;
  return Math.ceil(durationSec * perSec * tierMult);
}

/**
 * Clamp resolution to plan limit
 */
export function clampResolution(width: number, height: number, plan: string): { width: number; height: number } {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const maxDim = limits.maxResolution;

  if (width <= maxDim && height <= maxDim) return { width, height };

  const scale = maxDim / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
