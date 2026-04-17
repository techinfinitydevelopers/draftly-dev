'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { INTEGRATIONS, getIntegrationDefinition } from '@/lib/integrations/registry';
import type { IntegrationId, IntegrationPublicState } from '@/lib/integrations/types';

const DASHBOARD_LINKS: Partial<Record<IntegrationId, string>> = {
  stripe: '/business/payments',
  google_analytics: '/business/analytics',
  meta_pixel: '/business/analytics',
  firebase: '/business/database',
  supabase: '/business/database',
  github: '/business/devops',
  vercel: '/business/hosting',
  custom_domain: '/business/hosting',
};

async function authFetch(user: { getIdToken: () => Promise<string> }, input: string, init?: RequestInit) {
  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export default function IntegrationsDashboard() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const focus = searchParams.get('connect') || searchParams.get('setup');

  const [list, setList] = useState<IntegrationPublicState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const byId = useMemo(() => Object.fromEntries(list.map((i) => [i.id, i])) as Record<string, IntegrationPublicState>, [list]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(user, '/api/integrations');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to load');
      setList(j.integrations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!focus || !user) return;
    const id = focus as IntegrationId;
    if (getIntegrationDefinition(id)) {
      setOpenId(id);
      setForm({});
    }
  }, [focus, user]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4200);
  };

  const onTestOnly = async (id: IntegrationId) => {
    if (!user) return;
    setBusy(`test-${id}`);
    try {
      const res = await authFetch(user, '/api/integrations', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', integrationId: id, payload: form }),
      });
      const j = await res.json();
      showToast(j.message || (j.ok ? 'OK' : 'Failed'));
    } finally {
      setBusy(null);
    }
  };

  const onSave = async (id: IntegrationId) => {
    if (!user) return;
    setBusy(`save-${id}`);
    try {
      const res = await authFetch(user, '/api/integrations', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', integrationId: id, payload: form }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast(j.error || 'Save failed');
        return;
      }
      showToast(j.message || 'Saved');
      setOpenId(null);
      setForm({});
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const onRetest = async (id: IntegrationId) => {
    if (!user) return;
    setBusy(`retest-${id}`);
    try {
      const res = await authFetch(user, '/api/integrations/test', {
        method: 'POST',
        body: JSON.stringify({ integrationId: id }),
      });
      const j = await res.json();
      showToast(j.message || 'Test complete');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async (id: IntegrationId) => {
    if (!user || !confirm('Remove this integration and delete stored keys?')) return;
    setBusy(`del-${id}`);
    try {
      const res = await authFetch(user, `/api/integrations?integrationId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = await res.json();
        showToast(j.error || 'Remove failed');
        return;
      }
      showToast('Removed');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return <p className="text-sm text-white/50">Sign in to manage integrations.</p>;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border border-white/15 bg-[#12151f] px-4 py-3 text-[13px] text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
        <h2 className="font-display text-[15px] font-semibold text-white">How it works</h2>
        <ol className="mt-3 space-y-2 text-[13px] text-white/55 list-decimal pl-5">
          <li>Pick a service and open your provider dashboard (links on each card).</li>
          <li>Copy the keys Draftly asks for — we encrypt them and never show them again.</li>
          <li>Use <span className="text-white/80 font-medium">Test connection</span> before save, or save to verify automatically.</li>
        </ol>
        <p className="mt-3 text-[12px] text-white/40">
          In the 3D builder chat, try <span className="font-mono text-white/60">/connect stripe</span> or{' '}
          <span className="font-mono text-white/60">connect supabase</span> for a guided shortcut.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">{error}</div>
      )}
      {loading && <p className="text-sm text-white/40">Loading…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {INTEGRATIONS.map((def) => {
          const st = byId[def.id];
          const connected = st?.status === 'connected';
          const hasError = st?.status === 'error';
          const isOpen = openId === def.id;

          return (
            <div
              key={def.id}
              className={`rounded-2xl border bg-[#0c1018]/90 p-5 transition-colors ${
                hasError ? 'border-amber-500/35' : connected ? 'border-teal-500/30' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-violet-200">
                  <i className={`fa-solid ${def.icon} text-lg`} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[16px] font-semibold text-white">{def.name}</h3>
                    {connected && (
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
                        Connected
                      </span>
                    )}
                    {hasError && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Error
                      </span>
                    )}
                    {!st && (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/45">{def.description}</p>
                  {st?.lastError && <p className="mt-2 text-[11px] text-amber-200/90">{st.lastError}</p>}
                  {connected && st?.maskedFields && Object.keys(st.maskedFields).length > 0 && (
                    <div className="mt-2 text-[11px] text-white/35">
                      Stored:{' '}
                      {Object.entries(st.maskedFields)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </div>
                  )}
                  {st?.featuresEnabled?.length ? (
                    <p className="mt-2 text-[10px] text-teal-200/60">
                      Active: {st.featuresEnabled.join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {connected && DASHBOARD_LINKS[def.id] && (
                  <Link
                    href={DASHBOARD_LINKS[def.id]!}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-2 text-[11px] font-semibold text-teal-100 hover:bg-teal-500/25"
                  >
                    View Draftly dashboard
                    <i className="fa-solid fa-arrow-right text-[9px]" aria-hidden />
                  </Link>
                )}
                <a
                  href={def.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/[0.08]"
                >
                  Provider dashboard
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden />
                </a>
                {def.docsUrl && (
                  <a
                    href={def.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-[11px] font-medium text-white/45 hover:text-white/70"
                  >
                    Docs
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(isOpen ? null : def.id);
                    setForm({});
                  }}
                  className="rounded-lg bg-violet-500/20 px-3 py-2 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30"
                >
                  {connected ? 'Update keys' : 'Connect'}
                </button>
                {connected && (
                  <>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void onRetest(def.id)}
                      className="rounded-lg border border-white/12 px-3 py-2 text-[11px] font-semibold text-white/70 hover:bg-white/[0.05] disabled:opacity-40"
                    >
                      {busy === `retest-${def.id}` ? 'Testing…' : 'Test connection'}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void onRemove(def.id)}
                      className="rounded-lg border border-rose-500/25 px-3 py-2 text-[11px] font-semibold text-rose-300/90 hover:bg-rose-500/10 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>

              {isOpen && (
                <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
                  <p className="text-[12px] font-semibold text-white/70">Step 1 — Copy from your provider</p>
                  <p className="text-[11px] text-white/40">Step 2 — Paste below (never shared with other users)</p>
                  {def.fields.map((f) => (
                    <label key={f.key} className="block space-y-1.5">
                      <span className="text-[11px] font-medium text-white/50">
                        {f.label}
                        {f.required ? ' *' : ' (optional)'}
                      </span>
                      <input
                        type={f.type === 'password' ? 'password' : 'text'}
                        autoComplete="off"
                        placeholder={f.placeholder}
                        value={form[f.key] || ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-[13px] text-white outline-none focus:border-violet-500/40"
                      />
                      {f.help && <span className="text-[10px] text-white/35">{f.help}</span>}
                      {f.warn && <span className="block text-[10px] text-amber-200/80">{f.warn}</span>}
                    </label>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void onTestOnly(def.id)}
                      className="rounded-xl border border-white/15 px-4 py-2.5 text-[12px] font-semibold text-white/80 hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      {busy === `test-${def.id}` ? 'Testing…' : 'Test only'}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void onSave(def.id)}
                      className="rounded-xl bg-white px-4 py-2.5 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 disabled:opacity-40"
                    >
                      {busy === `save-${def.id}` ? 'Saving…' : 'Save & verify'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
