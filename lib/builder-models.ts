/**
 * 3D Builder / Chat model options for UI + billing units.
 * All options map to the same underlying text API; labels match `BUILDER_WEBSITE_DISPLAY_MODELS`.
 */
import { BUILDER_WEBSITE_DISPLAY_MODELS } from '@/lib/builder-display-models';
import { getWebsiteModelCreditConfig } from '@/lib/builder-model-credits';

export interface BuilderModelOption {
  id: string;
  label: string;
  /** Primary API-Easy chat model id for this preset (see `getWebsiteGenerationModelCandidates`). */
  model: string;
  creditMultiplier: number;
  /** Short label for UI, e.g. "2.6×" */
  multiplierLabel: string;
}

const GEMINI_FLASH_CHAIN = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;
const GEMINI_PRO_CHAIN = ['gemini-3-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;

/**
 * Ordered API-Easy model ids for 3D Builder full-site HTML. First successful model wins; later ids are fallbacks (quota/errors).
 */
export function getWebsiteGenerationModelCandidates(displayModelId: string): string[] {
  const flashFirst = [...GEMINI_FLASH_CHAIN];
  let chain: string[];
  switch (displayModelId) {
    case 'gemini-3-1-pro':
      chain = [...GEMINI_PRO_CHAIN];
      break;
    case 'gemini-3-1-flash':
      chain = flashFirst;
      break;
    default:
      chain = flashFirst;
  }
  const seen: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    const id = chain[i];
    if (seen.indexOf(id) === -1) seen.push(id);
  }
  return seen;
}

export const BUILDER_MODEL_OPTIONS: BuilderModelOption[] = BUILDER_WEBSITE_DISPLAY_MODELS.map((m) => {
  const cfg = getWebsiteModelCreditConfig(m.id);
  const candidates = getWebsiteGenerationModelCandidates(m.id);
  return {
    id: m.id,
    label: m.label,
    model: candidates[0] ?? 'gemini-3-flash-preview',
    creditMultiplier: cfg.creditMultiplier,
    multiplierLabel: cfg.multiplierLabel,
  };
});

/** Default to the economy tier so Basic (1,500 cr) can complete ~two full sites with 2× multiplier. */
export const BUILDER_DEFAULT_MODEL: string = 'gemini-3-1-flash';

export function getBuilderModelOption(modelId: string): BuilderModelOption {
  return (
    BUILDER_MODEL_OPTIONS.find((m) => m.id === modelId) ??
    BUILDER_MODEL_OPTIONS.find((m) => m.id === 'gemini-3-1-flash') ??
    BUILDER_MODEL_OPTIONS[0]
  );
}

export function getCreditMultiplier(modelId: string): number {
  return getBuilderModelOption(modelId).creditMultiplier;
}

/**
 * Chat "unit" cost used to enforce per-plan chat limits.
 * - Default models (x1/x2/x5) consume their multiplier in chat units.
 * - Very expensive models (>= x10) consume the *entire* remaining chat budget,
 *   effectively allowing ~1 chat for those models per monthly chat allowance.
 */
export function getChatUnitCost(modelId: string, planChatAllowance: number): number {
  const mult = getCreditMultiplier(modelId);
  if (!Number.isFinite(planChatAllowance) || planChatAllowance <= 0) return mult;
  if (mult >= 10) return planChatAllowance;
  return Math.max(1, Math.floor(mult));
}
