import { getWebsiteGenerationModelCandidates } from '@/lib/builder-models';

/**
 * Ordered API-Easy chat models for Full App generation / iteration.
 * Matches 3D builder routing so deprecated ids fall through to working ones.
 */
export function getFullAppTextModelCandidates(): string[] {
  const pro = getWebsiteGenerationModelCandidates('gemini-3-1-pro');
  const flash = getWebsiteGenerationModelCandidates('gemini-3-1-flash');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...pro, ...flash]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** True when the next model in the chain should be tried (routing / availability / quota). */
export function shouldTryNextFullAppModel(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '').toLowerCase();
  if (!msg) return false;
  const hints = [
    'quota',
    '429',
    'rate limit',
    'resource exhausted',
    'too many requests',
    'not found',
    'not available',
    'invalid model',
    'unknown model',
    'model not found',
    'no such model',
    'incorrect model id',
    'does not exist',
    'unsupported',
    'not supported',
    'inactive',
    'deprecated',
    'not in use',
    'is not enabled',
    'the model',
    '403',
    '404',
    '503',
    '502',
    'unavailable',
    'api-easy text error',
  ];
  return hints.some((h) => msg.includes(h));
}
