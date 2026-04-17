'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { INTEGRATIONS, getIntegrationDefinition } from '@/lib/integrations/registry';
import type { IntegrationId, IntegrationPublicState } from '@/lib/integrations/types';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

const HEADER_IDS: IntegrationId[] = [
  'stripe',
  'firebase',
  'supabase',
  'github',
  'vercel',
  'custom_domain',
  'google_analytics',
  'meta_pixel',
];

async function authFetch(user: { getIdToken: () => Promise<string> }, input: string, init?: RequestInit) {
  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

export default function BuilderIntegrationBar() {
  const { user, signInWithGoogle } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [list, setList] = useState<IntegrationPublicState[]>([]);
  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const byId = useMemo(() => Object.fromEntries(list.map((i) => [i.id, i])), [list]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch(user, '/api/integrations');
      const j = await res.json();
      if (j?.ok) setList(Array.isArray(j.integrations) ? j.integrations : []);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
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
      if (!res.ok) { showToast(j.error || 'Save failed'); return; }
      showToast(j.message || 'Saved & verified');
      setOpenId(null);
      setForm({});
      await refresh();
    } finally { setBusy(null); }
  };

  const onTest = async (id: IntegrationId) => {
    if (!user) return;
    setBusy(`test-${id}`);
    try {
      const res = await authFetch(user, '/api/integrations', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', integrationId: id, payload: form }),
      });
      const j = await res.json();
      showToast(j.message || (j.ok ? 'Connection OK' : 'Failed'));
    } finally { setBusy(null); }
  };

  const connectedCount = useMemo(() => list.filter(i => i.status === 'connected').length, [list]);

  const modalLayer =
    mounted &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        {/* Backdrop + panel: portaled to body so z-index wins over preview iframe / workspace layers */}
        <AnimatePresence>
          {openId && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100090] bg-black/45 backdrop-blur-[2px]"
                style={{ isolation: 'isolate' }}
                onClick={() => {
                  setOpenId(null);
                  setForm({});
                }}
                aria-hidden
              />
              <motion.div
                key="panel"
                initial={{ x: '100%', opacity: 0.85 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="fixed right-0 top-0 z-[100091] flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-white/[0.1] bg-[#0a0d14] shadow-[0_0_80px_rgba(0,0,0,0.65)]"
                style={{ isolation: 'isolate' }}
                role="dialog"
                aria-modal="true"
              >
                <QuickConnectPanel
                  id={openId}
                  state={byId[openId]}
                  form={form}
                  setForm={setForm}
                  busy={busy}
                  onSave={() => void onSave(openId)}
                  onTest={() => void onTest(openId)}
                  onClose={() => {
                    setOpenId(null);
                    setForm({});
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-[100092] max-w-sm rounded-xl border border-white/15 bg-[#12151f] px-4 py-3 text-[13px] text-white shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </>,
      document.body,
    );

  return (
    <>
      {/* Compact icon strip in header */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {HEADER_IDS.map((id) => {
            const st = byId[id];
            const connected = st?.status === 'connected';
            const err = st?.status === 'error';
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (!user) {
                    void signInWithGoogle();
                    return;
                  }
                  setOpenId(openId === id ? null : id);
                  setForm({});
                }}
                className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all ${
                  connected
                    ? 'ring-1 ring-teal-400/45 bg-teal-500/[0.12] shadow-[0_0_12px_rgba(45,212,191,0.12)]'
                    : err
                      ? 'ring-1 ring-amber-400/45 bg-amber-500/[0.1]'
                      : 'hover:bg-white/[0.1] hover:ring-1 hover:ring-white/10'
                }`}
                title={getIntegrationDefinition(id)?.name || id}
              >
                <IntegrationBrandGlyph id={id} className="h-[26px] w-[26px] rounded-md" />
                {connected && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-[7px] w-[7px] rounded-full border-2 border-[#0a0d14] bg-teal-400" />
                )}
                {err && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-[7px] w-[7px] rounded-full border-2 border-[#0a0d14] bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
        {connectedCount > 0 && (
          <span className="text-[10px] font-bold tabular-nums text-teal-300/80">{connectedCount}</span>
        )}
      </div>

      {modalLayer}
    </>
  );
}

function QuickConnectPanel({
  id,
  state,
  form,
  setForm,
  busy,
  onSave,
  onTest,
  onClose,
}: {
  id: IntegrationId;
  state?: IntegrationPublicState;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: string | null;
  onSave: () => void;
  onTest: () => void;
  onClose: () => void;
}) {
  const def = getIntegrationDefinition(id);
  if (!def) return null;
  const connected = state?.status === 'connected';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/[0.06] to-transparent">
        <IntegrationBrandGlyph id={id} className="h-12 w-12 rounded-xl" />
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-[18px] font-semibold text-white">{def.name}</h2>
          <p className="text-[12px] text-white/45 mt-0.5">{def.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Status badge */}
      {connected && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/[0.08] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[12px] font-semibold text-teal-200">Connected & verified</span>
          {state?.maskedFields && Object.keys(state.maskedFields).length > 0 && (
            <span className="ml-auto text-[10px] text-white/30 truncate max-w-[150px]">
              {Object.values(state.maskedFields)[0]}
            </span>
          )}
        </div>
      )}

      {state?.status === 'error' && state?.lastError && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2">
          <p className="text-[11px] text-amber-200/90">{state.lastError}</p>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-2 px-5 mt-4">
        <a
          href={def.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors"
        >
          Open {def.name} dashboard
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M8 2H3M8 2v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        {def.docsUrl && (
          <a
            href={def.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg px-3 py-2 text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Docs
          </a>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-4">
        <p className="text-[12px] font-semibold text-white/60">
          {connected ? 'Update your keys' : 'Paste your keys below'}
        </p>
        <p className="text-[11px] text-white/35">
          Keys are encrypted server-side and never visible after save.
        </p>
        {def.fields.map((f) => (
          <label key={f.key} className="block space-y-1.5">
            <span className="text-[11px] font-medium text-white/50">
              {f.label}{f.required ? ' *' : ' (optional)'}
            </span>
            <input
              type={f.type === 'password' ? 'password' : 'text'}
              autoComplete="off"
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-[13px] text-white outline-none focus:border-violet-500/40 transition-colors"
            />
            {f.help && <span className="text-[10px] text-white/35">{f.help}</span>}
            {f.warn && <span className="block text-[10px] text-amber-200/80">{f.warn}</span>}
          </label>
        ))}

        {id === 'custom_domain' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <p className="text-[11px] font-semibold text-white/60">DNS Setup Instructions</p>
            <div className="text-[10px] text-white/40 space-y-1">
              <p>After saving, point your domain&apos;s DNS to Draftly:</p>
              <div className="rounded-lg bg-black/40 px-2 py-1.5 font-mono text-[10px] text-teal-200/80">
                A &nbsp;&nbsp;&nbsp; @ &nbsp;&nbsp;&nbsp;&nbsp; → &nbsp; 76.76.21.21<br />
                CNAME &nbsp; www &nbsp; → &nbsp; cname.draftly.site
              </div>
              <p>SSL is auto-provisioned once DNS propagates (usually 5–30 min).</p>
            </div>
          </div>
        )}

        {id === 'vercel' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <p className="text-[11px] font-semibold text-white/60">What happens on deploy</p>
            <ul className="text-[10px] text-white/40 space-y-0.5 list-disc pl-4">
              <li>Your built site is pushed to a Vercel project</li>
              <li>Automatic SSL, edge CDN, and preview URLs</li>
              <li>Connect a custom domain in Vercel dashboard after</li>
            </ul>
          </div>
        )}

        {id === 'github' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <p className="text-[11px] font-semibold text-white/60">What GitHub enables</p>
            <ul className="text-[10px] text-white/40 space-y-0.5 list-disc pl-4">
              <li>Auto-push your site code to a GitHub repo</li>
              <li>Enable GitHub Actions for CI/CD pipelines</li>
              <li>Use GitHub Pages for free hosting</li>
              <li>Collaborate with your team on the codebase</li>
            </ul>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-5 flex gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={onTest}
          className="flex-1 rounded-xl border border-white/15 py-2.5 text-[12px] font-semibold text-white/80 hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
        >
          {busy?.startsWith('test') ? 'Testing…' : 'Test connection'}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={onSave}
          className="flex-1 rounded-xl bg-white py-2.5 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 disabled:opacity-40 transition-colors"
        >
          {busy?.startsWith('save') ? 'Saving…' : 'Save & verify'}
        </button>
      </div>
    </div>
  );
}
