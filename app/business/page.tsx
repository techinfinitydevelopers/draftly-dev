'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { planHasBusinessOs, planIsBuildTierOnly } from '@/lib/business-os/access';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';
import type { IntegrationId } from '@/lib/integrations/types';

type IntegrationStatus = { connected: boolean; label: string; sub?: string };

const INTEGRATION_IDS: IntegrationId[] = [
  'stripe', 'google_analytics', 'meta_pixel', 'firebase', 'supabase', 'github', 'vercel', 'custom_domain',
];

const INTEGRATION_LABELS: Record<string, { name: string; page: string }> = {
  stripe: { name: 'Stripe', page: '/business/payments' },
  google_analytics: { name: 'Google Analytics', page: '/business/analytics' },
  meta_pixel: { name: 'Meta Pixel', page: '/business/analytics' },
  firebase: { name: 'Firebase', page: '/business/database' },
  supabase: { name: 'Supabase', page: '/business/database' },
  github: { name: 'GitHub', page: '/business/devops' },
  vercel: { name: 'Vercel', page: '/business/hosting' },
  custom_domain: { name: 'Custom Domain', page: '/business/hosting' },
};

function BusinessOverviewInner() {
  const searchParams = useSearchParams();
  const fromBuild = searchParams.get('from') === 'build';
  const { user, loading, signInWithGoogle } = useAuth();
  const { subscription, isOwner } = useSubscription();
  const testing = isTestingCreditsEmail(user?.email);
  const unlocked = planHasBusinessOs(subscription.plan, isOwner, testing);
  const buildOnly = planIsBuildTierOnly(subscription.plan, isOwner, testing);
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
  const [stripeCurrency, setStripeCurrency] = useState('usd');

  const fetchIntegrationStatuses = useCallback(async () => {
    if (!user) return;
    setLoadingIntegrations(true);
    try {
      const token = await user.getIdToken();
      const results = await Promise.allSettled(
        INTEGRATION_IDS.map((id) =>
          fetch(`/api/business/integration-data?integrationId=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (r) => ({ id, ok: r.ok, data: await r.json() }))
        )
      );

      const statuses: Record<string, IntegrationStatus> = {};
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        const { id, ok, data } = r.value;
        statuses[id] = { connected: ok && data.ok, label: ok && data.ok ? 'Connected' : 'Not connected' };

        if (id === 'stripe' && ok && data.ok && data.data) {
          setStripeRevenue(data.data.totalRevenue ?? 0);
          setStripeCurrency(data.data.currency || 'usd');
          statuses.stripe.sub = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.data.currency || 'usd' })
            .format((data.data.availableBalance ?? 0) / 100) + ' available';
        }
        if (id === 'google_analytics' && ok && data.ok && data.data?.configured) {
          statuses.google_analytics.sub = data.data.measurementId;
        }
        if (id === 'meta_pixel' && ok && data.ok && data.data?.configured) {
          statuses.meta_pixel.sub = `Pixel ${data.data.pixelId}`;
        }
        if (id === 'github' && ok && data.ok && data.data?.user) {
          statuses.github.sub = `@${data.data.user.login} · ${data.data.repos?.length ?? 0} repos`;
        }
        if (id === 'vercel' && ok && data.ok && data.data) {
          statuses.vercel.sub = `${data.data.deployments?.length ?? 0} deployments`;
        }
      }
      setIntegrationStatuses(statuses);
    } catch {
      // ignore
    } finally {
      setLoadingIntegrations(false);
    }
  }, [user]);

  useEffect(() => { void fetchIntegrationStatuses(); }, [fetchIntegrationStatuses]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-white">Business OS</h1>
          <p className="mt-2 text-[13px] text-white/50 leading-relaxed">
            Sign in to see your overview, connect hosting, and manage integrations.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#0a0d14] hover:bg-white/90"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const connectedCount = Object.values(integrationStatuses).filter((s) => s.connected).length;
  const fmtRevenue = stripeRevenue !== null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: stripeCurrency }).format(stripeRevenue / 100)
    : '$0';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {fromBuild && (
        <div className="flex flex-col gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] font-semibold text-white">Your site draft is ready.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/business/integrations" className="rounded-xl bg-white px-4 py-2.5 text-center text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90">
              Connect tools
            </Link>
            <Link href="/3d-builder" className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-[12px] font-semibold text-white/85 hover:bg-white/[0.06]">
              Back to builder
            </Link>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">Overview</h1>
        <p className="mt-1 max-w-xl text-[13px] text-white/45">
          {connectedCount > 0 ? `${connectedCount} integration${connectedCount !== 1 ? 's' : ''} connected · Live data` : 'Connect integrations to see live data'}
        </p>
      </div>

      {connectedCount === 0 && !loadingIntegrations && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <span className="text-[18px] leading-none" aria-hidden>⚠️</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-100/95">Finish your stack</p>
            <p className="text-[11px] text-amber-100/55">Selling? Connect Stripe. Traffic? Add Analytics. Hosting? Link Vercel.</p>
          </div>
          <Link href="/business/integrations" className="self-center rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-[#0a0d14] hover:bg-white/90">
            Open
          </Link>
        </div>
      )}

      {buildOnly && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-white/65">Pro+ saves connections & hosting. You can still tap icons above to see what unlocks.</p>
          <Link href="/pricing#pricing" className="shrink-0 rounded-xl bg-white px-4 py-2 text-center text-[11px] font-semibold text-[#0a0d14] hover:bg-white/90">
            Plans
          </Link>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Integrations</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">{connectedCount}</p>
          <p className="mt-1 text-[11px] text-white/35">of {INTEGRATION_IDS.length} available</p>
        </div>
        <Link href="/business/payments" className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.03] transition-colors">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Revenue</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">
            {integrationStatuses.stripe?.connected ? fmtRevenue : '—'}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            {integrationStatuses.stripe?.connected ? 'Recent charges (Stripe)' : 'Connect Stripe'}
          </p>
        </Link>
        <Link href="/business/analytics" className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.03] transition-colors">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Analytics</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">
            {integrationStatuses.google_analytics?.connected ? '✓ Active' : '—'}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            {integrationStatuses.google_analytics?.sub || 'Connect GA4'}
          </p>
        </Link>
        <Link href="/business/hosting" className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.03] transition-colors">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Hosting</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">
            {integrationStatuses.vercel?.connected ? '✓ Vercel' : integrationStatuses.custom_domain?.connected ? '✓ Domain' : '—'}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            {integrationStatuses.vercel?.sub || (integrationStatuses.custom_domain?.connected ? 'Domain configured' : 'Not deployed')}
          </p>
        </Link>
      </div>

      {/* Integration status grid */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-white">Connected Services</h2>
          <Link href="/business/integrations" className="text-[11px] font-semibold text-violet-300 hover:text-violet-200">
            Manage all
          </Link>
        </div>
        {loadingIntegrations ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRATION_IDS.map((id) => {
              const status = integrationStatuses[id];
              const info = INTEGRATION_LABELS[id] || { name: id, page: '/business/integrations' };
              return (
                <Link key={id} href={status?.connected ? info.page : `/business/integrations?connect=${id}`} className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 hover:bg-white/[0.04] transition-colors">
                  <IntegrationBrandGlyph id={id} className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white/80 group-hover:text-white">{info.name}</p>
                    {status?.connected ? (
                      <>
                        <p className="text-[10px] text-teal-300/70 font-semibold">Connected</p>
                        {status.sub && <p className="text-[9px] text-white/35 truncate">{status.sub}</p>}
                      </>
                    ) : (
                      <p className="text-[10px] text-white/30">Not connected</p>
                    )}
                  </div>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${status?.connected ? 'bg-teal-400' : 'bg-white/15'}`} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 space-y-4">
          <h2 className="text-[14px] font-semibold text-white">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/3d-builder" className="block w-full rounded-xl border border-white/12 bg-white/[0.05] py-2.5 text-center text-[12px] font-semibold text-white/85 hover:bg-white/[0.08]">
              Open 3D Builder
            </Link>
            <Link href="/business/integrations" className="block w-full rounded-xl border border-white/12 bg-white/[0.05] py-2.5 text-center text-[12px] font-semibold text-white/85 hover:bg-white/[0.08]">
              Connect an integration
            </Link>
            <Link href="/business/hosting" className="block w-full rounded-xl border border-white/12 bg-white/[0.05] py-2.5 text-center text-[12px] font-semibold text-white/85 hover:bg-white/[0.08]">
              Set up hosting
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5 lg:col-span-2 space-y-3">
          <h2 className="text-[14px] font-semibold text-white">Status</h2>
          <ul className="space-y-3 text-[13px]">
            <li className="flex justify-between gap-2 text-white/60">
              <span>Site</span>
              <span className={integrationStatuses.vercel?.connected ? 'text-teal-200/90' : 'text-amber-200/90'}>
                {integrationStatuses.vercel?.connected ? 'Deployed via Vercel' : 'Not deployed'}
              </span>
            </li>
            <li className="flex justify-between gap-2 text-white/60">
              <span>Payments</span>
              <span className={integrationStatuses.stripe?.connected ? 'text-teal-200/90' : 'text-white/35'}>
                {integrationStatuses.stripe?.connected ? 'Stripe active' : 'No gateway'}
              </span>
            </li>
            <li className="flex justify-between gap-2 text-white/60">
              <span>Tracking</span>
              <span className={integrationStatuses.google_analytics?.connected || integrationStatuses.meta_pixel?.connected ? 'text-teal-200/90' : 'text-white/35'}>
                {[
                  integrationStatuses.google_analytics?.connected && 'GA4',
                  integrationStatuses.meta_pixel?.connected && 'Meta Pixel',
                ].filter(Boolean).join(' + ') || 'None'}
              </span>
            </li>
            <li className="flex justify-between gap-2 text-white/60">
              <span>Backend</span>
              <span className={integrationStatuses.firebase?.connected || integrationStatuses.supabase?.connected ? 'text-teal-200/90' : 'text-white/35'}>
                {[
                  integrationStatuses.firebase?.connected && 'Firebase',
                  integrationStatuses.supabase?.connected && 'Supabase',
                ].filter(Boolean).join(' + ') || 'None'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function BusinessOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[200px] items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
        </div>
      }
    >
      <BusinessOverviewInner />
    </Suspense>
  );
}
