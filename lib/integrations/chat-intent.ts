import type { IntegrationId } from '@/lib/integrations/types';

export type IntegrationChatIntent =
  | { type: 'wizard'; integrationId: IntegrationId }
  | { type: 'suggest'; integrationIds: IntegrationId[]; assistantText: string };

const CONNECT_ALIASES: Record<string, IntegrationId> = {
  firebase: 'firebase',
  supabase: 'supabase',
  stripe: 'stripe',
  'google analytics': 'google_analytics',
  ga4: 'google_analytics',
  analytics: 'google_analytics',
  'meta pixel': 'meta_pixel',
  meta: 'meta_pixel',
  pixel: 'meta_pixel',
  resend: 'resend',
  sendgrid: 'sendgrid',
  github: 'github',
  vercel: 'vercel',
  domain: 'custom_domain',
  'custom domain': 'custom_domain',
  dns: 'custom_domain',
  hosting: 'vercel',
  deploy: 'vercel',
  godaddy: 'custom_domain',
  namecheap: 'custom_domain',
  cloudflare: 'custom_domain',
};

function normalizeConnectTarget(raw: string): IntegrationId | null {
  const k = raw.trim().toLowerCase();
  if (CONNECT_ALIASES[k]) return CONNECT_ALIASES[k];
  const collapsed = k.replace(/\s+/g, ' ');
  if (CONNECT_ALIASES[collapsed]) return CONNECT_ALIASES[collapsed];
  return null;
}

/**
 * Detect integration-related chat intents. Designed to avoid hijacking normal site prompts.
 */
export function detectIntegrationChatIntent(text: string): IntegrationChatIntent | null {
  const t = text.trim();
  if (!t) return null;
  const lower = t.toLowerCase();

  const slash = t.match(/^\/connect\s+(.+)$/i);
  const connectPhrase = t.match(/^connect\s+(.+)$/i);
  const addPhrase = t.match(/^add\s+(stripe|supabase|firebase|resend|sendgrid)\s+payments?$/i);
  const setupPhrase = t.match(/^setup\s+(google analytics|ga4|meta pixel|analytics)\s*$/i);

  const targetRaw = slash?.[1] || connectPhrase?.[1] || (addPhrase ? addPhrase[1] : null);
  if (setupPhrase) {
    const s = setupPhrase[1].toLowerCase();
    if (s.includes('meta')) return { type: 'wizard', integrationId: 'meta_pixel' };
    return { type: 'wizard', integrationId: 'google_analytics' };
  }
  if (addPhrase) {
    const id = normalizeConnectTarget(addPhrase[1]);
    if (id) return { type: 'wizard', integrationId: id };
  }
  if (targetRaw) {
    const id = normalizeConnectTarget(targetRaw);
    if (id) return { type: 'wizard', integrationId: id };
  }

  // Suggestions (only when message is short and clearly about capability)
  if (t.length > 120) return null;

  if (/\b(sell|checkout|take payments?|subscriptions?|stripe)\b/i.test(lower) && /\b(want|need|add|use)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['stripe'],
      assistantText:
        'To take payments on your site, connect Stripe — Draftly stores keys encrypted and never shows them again after save. Say "connect stripe" or open Business OS → Integrations.',
    };
  }
  if (/\b(login|sign in|auth|user accounts?)\b/i.test(lower) && /\b(want|need|add)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['firebase', 'supabase'],
      assistantText:
        'For sign-in and user accounts, use Firebase or Supabase. Both support auth and a database. Try "connect firebase" or "connect supabase", or open Business OS → Integrations.',
    };
  }
  if (/\b(track|analytics|traffic|visitors?)\b/i.test(lower) && /\b(want|need|add)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['google_analytics', 'meta_pixel'],
      assistantText:
        'For traffic and conversions, connect Google Analytics (GA4) and/or Meta Pixel. Say "connect ga4" or "connect meta", or use the Integrations tab.',
    };
  }
  if (/\b(deploy|host|live|publish|launch)\b/i.test(lower) && /\b(want|need|site|my)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['vercel', 'custom_domain'],
      assistantText:
        'To go live, deploy with Vercel (free tier + CDN) or point your own domain. Say "connect vercel" or "connect domain".',
    };
  }
  if (/\b(github|repo|code|push|ci|cd)\b/i.test(lower) && /\b(want|need|add|connect|push)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['github'],
      assistantText:
        'Connect GitHub to push your site to a repo, enable CI/CD, and use GitHub Pages. Say "connect github".',
    };
  }
  if (/\b(domain|dns|godaddy|namecheap|cloudflare)\b/i.test(lower)) {
    return {
      type: 'suggest',
      integrationIds: ['custom_domain'],
      assistantText:
        'Point your domain to Draftly — just add a DNS record and we auto-provision SSL. Say "connect domain" or open Business OS → Integrations.',
    };
  }

  return null;
}
