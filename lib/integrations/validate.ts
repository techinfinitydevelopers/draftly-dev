import type { IntegrationDefinition } from '@/lib/integrations/types';

export function validateIntegrationPayload(
  def: IntegrationDefinition,
  payload: Record<string, string>,
): { ok: true; data: Record<string, string> } | { ok: false; error: string } {
  const out: Record<string, string> = {};
  for (const field of def.fields) {
    const v = (payload[field.key] ?? '').trim();
    if (field.required && !v) {
      return { ok: false, error: `${field.label} is required.` };
    }
    if (v) {
      if (field.type === 'url' && !/^https:\/\/.+/i.test(v)) {
        return { ok: false, error: `${field.label} must be an https:// URL.` };
      }
      out[field.key] = v;
    }
  }
  return { ok: true, data: out };
}

export function maskSecretValue(value: string): string {
  if (!value || value.length < 6) return '••••••••';
  if (value.length <= 12) return '••••••••';
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export function buildMaskedPreview(def: IntegrationDefinition, data: Record<string, string>): Record<string, string> {
  const masks: Record<string, string> = {};
  for (const f of def.fields) {
    const v = data[f.key];
    if (v) {
      masks[f.key] = f.type === 'password' || f.key.toLowerCase().includes('key') ? maskSecretValue(v) : v;
    }
  }
  return masks;
}
