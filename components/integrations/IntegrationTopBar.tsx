'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { INTEGRATIONS } from '@/lib/integrations/registry';
import type { IntegrationId, IntegrationPublicState } from '@/lib/integrations/types';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

const BAR_IDS: IntegrationId[] = [
  'stripe',
  'firebase',
  'supabase',
  'github',
  'vercel',
  'custom_domain',
  'google_analytics',
  'meta_pixel',
  'resend',
];

function readBuildHint(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem('draftly_build_hint');
    if (!raw) return '';
    const j = JSON.parse(raw) as { t?: string };
    return typeof j.t === 'string' ? j.t : '';
  } catch {
    return '';
  }
}

function recommendedForHint(hint: string, id: IntegrationId): boolean {
  const h = hint.toLowerCase();
  if (!h) return false;
  if (id === 'stripe' && /\b(shop|store|sell|cart|checkout|ecommerce|buy|product|payment)\b/i.test(h)) return true;
  if ((id === 'firebase' || id === 'supabase') && /\b(login|sign in|auth|account|user|database)\b/i.test(h)) return true;
  if ((id === 'google_analytics' || id === 'meta_pixel') && /\b(marketing|landing|seo|ads|traffic|track)\b/i.test(h)) return true;
  if (id === 'resend' && /\b(email|newsletter|contact form|notify)\b/i.test(h)) return true;
  if (id === 'github' && /\b(code|repo|open source|developer|ci|cd)\b/i.test(h)) return true;
  if (id === 'vercel' && /\b(deploy|host|launch|live|publish)\b/i.test(h)) return true;
  if (id === 'custom_domain' && /\b(domain|dns|godaddy|namecheap|cloudflare|custom)\b/i.test(h)) return true;
  return false;
}

export default function IntegrationTopBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [list, setList] = useState<IntegrationPublicState[]>([]);
  const [vault, setVault] = useState(true);
  const [hint, setHint] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setList([]);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/integrations', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j?.ok) {
        setList(Array.isArray(j.integrations) ? j.integrations : []);
        setVault(j.planAllowsVault !== false);
      } else {
        setList([]);
        setVault(true);
      }
    } catch {
      setList([]);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    setHint(readBuildHint());
  }, [pathname]);

  const byId = useMemo(() => Object.fromEntries(list.map((i) => [i.id, i])), [list]);

  return (
    <div className="flex-shrink-0 border-b border-white/[0.07] bg-gradient-to-b from-[#0d1018] to-[#0a0c12] px-2 py-2 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Connect</span>
        {!user && <span className="text-[10px] text-white/30">Sign in to save keys</span>}
        {user && !vault && (
          <Link href="/pricing#pricing" className="text-[10px] font-semibold text-amber-300/90 hover:text-amber-200">
            Pro+ to save · icons stay open
          </Link>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 sm:gap-3 sm:pb-0">
        {BAR_IDS.map((id) => {
          const def = INTEGRATIONS.find((x) => x.id === id);
          if (!def) return null;
          const st = byId[id];
          const connected = st?.status === 'connected';
          const err = st?.status === 'error';
          const rec = recommendedForHint(hint, id);

          return (
            <Link
              key={id}
              href={`/business/integrations?connect=${encodeURIComponent(id)}`}
              className={`group flex min-w-[4.75rem] flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-2 transition-all sm:min-w-[5.5rem] sm:px-3 sm:py-2.5 ${
                connected
                  ? 'border-teal-500/35 bg-teal-500/[0.08] shadow-[0_0_20px_rgba(45,212,191,0.08)]'
                  : err
                    ? 'border-amber-500/30 bg-amber-500/[0.06]'
                    : rec
                      ? 'border-violet-400/40 bg-violet-500/[0.1] ring-1 ring-violet-400/20'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'
              }`}
            >
              <IntegrationBrandGlyph id={id} />
              <span className="max-w-[5rem] truncate text-center text-[10px] font-semibold text-white/85 sm:max-w-none">
                {def.name.replace(' (GA4)', '').replace('Google Analytics', 'Analytics')}
              </span>
              <span className="text-[9px] font-medium leading-none">
                {connected ? (
                  <span className="text-teal-300/95">Ready</span>
                ) : err ? (
                  <span className="text-amber-200/90">Fix</span>
                ) : rec ? (
                  <span className="text-violet-300/90">Suggested</span>
                ) : (
                  <span className="text-white/35">Tap</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
