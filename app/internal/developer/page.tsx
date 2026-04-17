'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isDeveloperDashboardOperator } from '@/lib/developer-access';

type Activity = { lastSeenAt: string | null; sessionCount: number };
type Generation = {
  creditsUsed: number;
  chatsUsed: number;
  sites3DGenerated: number;
  fullAppsGenerated: number;
  uiPreviewsGenerated: number;
  studioImageGenerations: number;
  studioVideoGenerations: number;
  lastResetDate: string | null;
};

type UserRow = {
  uid: string;
  email: string | null;
  plan: string;
  subscriptionStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
  onboardingComplete: boolean;
  activity: Activity;
  generation: Generation;
  fullAppProjectCount: number;
  projects3d: Array<{
    id: string;
    name: string;
    sitePrompt: string;
    bgPrompt: string;
    updatedAt: number;
    userPromptSnippets: string[];
  }>;
  integrations: Array<{ id: string; status: string }>;
};

type Snapshot = {
  ok: boolean;
  generatedAt: string;
  userCount: number;
  users: UserRow[];
  highlights: {
    mostSessions: Array<{ email: string; sessions: number }>;
    leastSessions: Array<{ email: string; sessions: number }>;
    topCredits: Array<{ email: string; creditsUsed: number }>;
  };
};

export default function DeveloperDashboardPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/internal/developer-snapshot', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setSnapshot(null);
        return;
      }
      setSnapshot(data as Snapshot);
    } catch {
      setError('Failed to load snapshot');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const connectedHosting = useMemo(() => {
    if (!snapshot) return [];
    const out: string[] = [];
    for (const u of snapshot.users) {
      const v = u.integrations.find((i) => i.id === 'vercel' && i.status === 'connected');
      const d = u.integrations.find((i) => i.id === 'custom_domain' && i.status === 'connected');
      if (v || d) {
        out.push(
          `${u.email || u.uid}: ${v ? 'Vercel' : ''}${v && d ? ' + ' : ''}${d ? 'custom domain' : ''}`,
        );
      }
    }
    return out;
  }, [snapshot]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center font-mono text-sm text-white/50">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-white/70 text-center max-w-md">
          Sign in with the approved developer Google account to open this dashboard. Access is enforced on the server
          for a single allowlisted email only.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle({ skipNavigation: true, redirectTo: '/internal/developer' })}
          className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90"
        >
          Sign in with Google
        </button>
        <Link href="/" className="text-xs text-white/40 hover:text-white/70">
          ← Back to site
        </Link>
      </div>
    );
  }

  if (!isDeveloperDashboardOperator(user.email)) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-rose-200/90 text-center max-w-md text-sm font-medium">Access denied</p>
        <p className="text-white/50 text-center max-w-md text-xs">
          This developer dashboard is restricted. Signed in as <span className="text-white/70 font-mono">{user.email}</span>.
        </p>
        <Link href="/" className="text-xs text-white/40 hover:text-white/70">
          ← Back to site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-20">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#050508]/95 backdrop-blur-md px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Developer dashboard</h1>
          <p className="text-[11px] text-white/45 font-mono mt-0.5">
            Read-only Firestore aggregate · not indexed for search engines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40 truncate max-w-[200px]">{user.email}</span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href="/" className="text-[11px] text-white/40 hover:text-white/70 px-2">
            Home
          </Link>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
            {error.includes('403') && (
              <p className="mt-2 text-rose-200/80 text-xs">
                You are not on the developer allowlist. Only the approved developer account can load this snapshot.
              </p>
            )}
          </div>
        )}

        {snapshot && (
          <>
            <p className="text-[12px] text-white/45 font-mono">
              Snapshot {snapshot.generatedAt} · {snapshot.userCount} user docs (cap 120)
            </p>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90 mb-3">Most sessions</h2>
                <ul className="space-y-1.5 text-[12px]">
                  {snapshot.highlights.mostSessions.map((r) => (
                    <li key={r.email} className="flex justify-between gap-2 text-white/80">
                      <span className="truncate">{r.email}</span>
                      <span className="font-mono text-white/50">{r.sessions}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-3">Least sessions</h2>
                <ul className="space-y-1.5 text-[12px]">
                  {snapshot.highlights.leastSessions.map((r) => (
                    <li key={r.email} className="flex justify-between gap-2 text-white/80">
                      <span className="truncate">{r.email}</span>
                      <span className="font-mono text-white/50">{r.sessions}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400/90 mb-3">Top credits used</h2>
                <ul className="space-y-1.5 text-[12px]">
                  {snapshot.highlights.topCredits.map((r) => (
                    <li key={r.email} className="flex justify-between gap-2 text-white/80">
                      <span className="truncate">{r.email}</span>
                      <span className="font-mono text-white/50">{r.creditsUsed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400/90 mb-2">Hosting signals</h2>
              <p className="text-[11px] text-white/45 mb-2">
                From Business OS integration vault (connected Vercel / custom domain only — no traffic counts unless you
                add GA4 and use Business analytics).
              </p>
              {connectedHosting.length === 0 ? (
                <p className="text-[12px] text-white/35">No connected deploy integrations in this sample.</p>
              ) : (
                <ul className="text-[12px] text-white/70 space-y-1 font-mono">
                  {connectedHosting.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>

            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-[11px] min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/45 uppercase tracking-wider">
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Plan</th>
                    <th className="px-3 py-2 font-semibold">Sessions</th>
                    <th className="px-3 py-2 font-semibold">Last seen</th>
                    <th className="px-3 py-2 font-semibold">Credits</th>
                    <th className="px-3 py-2 font-semibold">3D sites</th>
                    <th className="px-3 py-2 font-semibold">Chats</th>
                    <th className="px-3 py-2 font-semibold">Full apps</th>
                    <th className="px-3 py-2 font-semibold">Integrations</th>
                    <th className="px-3 py-2 font-semibold w-28">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {snapshot.users.map((u) => {
                    const open = expanded[u.uid];
                    const intSummary = u.integrations
                      .filter((i) => i.status === 'connected')
                      .map((i) => i.id)
                      .join(', ');
                    return (
                      <Fragment key={u.uid}>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-white/90 max-w-[200px] truncate" title={u.email || u.uid}>
                            {u.email || <span className="text-white/35 font-mono">{u.uid.slice(0, 10)}…</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-white/70">{u.plan}</td>
                          <td className="px-3 py-2 font-mono">{u.activity.sessionCount}</td>
                          <td className="px-3 py-2 font-mono text-white/50 whitespace-nowrap">
                            {u.activity.lastSeenAt ? new Date(u.activity.lastSeenAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono">{u.generation.creditsUsed}</td>
                          <td className="px-3 py-2 font-mono">{u.generation.sites3DGenerated}</td>
                          <td className="px-3 py-2 font-mono">{u.generation.chatsUsed}</td>
                          <td className="px-3 py-2 font-mono">{u.generation.fullAppsGenerated}</td>
                          <td className="px-3 py-2 text-white/55 max-w-[180px] truncate" title={intSummary}>
                            {intSummary || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setExpanded((x) => ({ ...x, [u.uid]: !open }))}
                              className="text-emerald-400/90 hover:text-emerald-300 text-[10px] font-bold uppercase"
                            >
                              {open ? 'Hide' : 'Prompts'}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${u.uid}-detail`} className="bg-black/40">
                            <td colSpan={10} className="px-3 py-4 text-[11px] text-white/65 space-y-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-white/35 mb-1">3D Builder projects</p>
                                {u.projects3d.length === 0 ? (
                                  <p className="text-white/35">No saved 3D projects in Firestore for this user.</p>
                                ) : (
                                  <ul className="space-y-3">
                                    {u.projects3d.map((p) => (
                                      <li key={p.id} className="border border-white/[0.06] rounded-lg p-3 bg-white/[0.02]">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-white/85 font-semibold">{p.name}</p>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {(p as unknown as { hasSiteCode?: boolean }).hasSiteCode && (
                                              <span className="text-[9px] font-bold text-emerald-400/90 bg-emerald-500/15 px-1.5 py-0.5 rounded">Built</span>
                                            )}
                                            {(p as unknown as { buildTarget?: string }).buildTarget && (
                                              <span className="text-[9px] text-white/40 font-mono">{(p as unknown as { buildTarget: string }).buildTarget}</span>
                                            )}
                                            <span className="text-[9px] text-white/30 font-mono">
                                              {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-white/45 mt-1">
                                          <span className="text-white/30">Site prompt · </span>
                                          {p.sitePrompt || '—'}
                                        </p>
                                        <p className="text-white/45 mt-1">
                                          <span className="text-white/30">Bg prompt · </span>
                                          {p.bgPrompt || '—'}
                                        </p>
                                        {p.userPromptSnippets.length > 0 && (
                                          <div className="mt-2">
                                            <span className="text-white/30">Recent chat (user) · </span>
                                            <ul className="list-disc list-inside mt-1 text-white/55">
                                              {p.userPromptSnippets.map((t, i) => (
                                                <li key={i}>{t}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-white/35 mb-1">Integration status</p>
                                <p className="font-mono text-white/50">
                                  {u.integrations.length
                                    ? u.integrations.map((i) => `${i.id}:${i.status}`).join(' · ')
                                    : '—'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
