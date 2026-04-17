'use client';

import Link from 'next/link';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import { useIntegrationData } from '@/hooks/useIntegrationData';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  pushed_at: string;
}

interface GitHubEvent {
  type: string;
  repo: string;
  created_at: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
}

interface GitHubData {
  user: GitHubUser | null;
  repos: GitHubRepo[];
  recentEvents: GitHubEvent[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572a5',
  Go: '#00add8', Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c',
  Java: '#b07219', Ruby: '#701516', PHP: '#4f5d95', Swift: '#f05138',
  Kotlin: '#a97bff', C: '#555555', 'C++': '#f34b7d', Shell: '#89e051',
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    PushEvent: 'Pushed', CreateEvent: 'Created branch/tag', PullRequestEvent: 'Pull request',
    IssuesEvent: 'Issue', WatchEvent: 'Starred', ForkEvent: 'Forked',
    DeleteEvent: 'Deleted', ReleaseEvent: 'Released', IssueCommentEvent: 'Commented',
  };
  return map[type] || type.replace('Event', '');
}

export default function BusinessDevOpsPage() {
  const { data, loading, connected, refresh } = useIntegrationData<GitHubData>('github');

  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="DevOps">
      <div className="p-4 md:p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">DevOps</h1>
            <p className="mt-1 text-[13px] text-white/45">
              {connected ? 'Live data from your GitHub account' : 'Connect GitHub to see repos, activity, and CI status'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <button type="button" onClick={() => void refresh()} className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08] transition-colors">
                Refresh
              </button>
            )}
            <Link href="/business/integrations?connect=github" className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors">
              {connected ? 'Update token' : 'Connect GitHub'}
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          </div>
        )}

        {!loading && !connected && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/90 p-8 text-center">
            <IntegrationBrandGlyph id="github" className="h-16 w-16 rounded-2xl mx-auto" />
            <h2 className="mt-4 font-display text-lg font-semibold text-white">Connect GitHub</h2>
            <p className="mt-2 text-[13px] text-white/45 max-w-md mx-auto">
              Add your GitHub personal access token to see your repositories, recent activity, and deployment status.
            </p>
            <Link href="/business/integrations?connect=github" className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
              Connect now
            </Link>
          </div>
        )}

        {!loading && connected && data && (
          <>
            {data.user && (
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.user.avatar_url} alt={data.user.login} className="h-14 w-14 rounded-full border-2 border-white/10" />
                <div>
                  <p className="font-display text-[16px] font-semibold text-white">{data.user.login}</p>
                  <div className="flex gap-4 mt-1 text-[11px] text-white/50">
                    <span>{data.user.public_repos} public repos</span>
                    <span>{data.user.followers} followers</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-[14px] font-semibold text-white">Repositories</h2>
                {data.repos.length === 0 ? (
                  <p className="text-[12px] text-white/40">No repositories found</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.repos.map((r) => (
                      <a key={r.full_name} href={r.html_url} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-white/90 group-hover:text-white truncate">{r.name}</p>
                          {r.private && <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-white/40">Private</span>}
                        </div>
                        {r.description && <p className="mt-1 text-[11px] text-white/40 line-clamp-2">{r.description}</p>}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-white/35">
                          {r.language && (
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[r.language] || '#888' }} />
                              {r.language}
                            </span>
                          )}
                          {r.stargazers_count > 0 && <span>★ {r.stargazers_count}</span>}
                          <span>{timeAgo(r.pushed_at || r.updated_at)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-[14px] font-semibold text-white">Recent Activity</h2>
                {data.recentEvents.length === 0 ? (
                  <p className="text-[12px] text-white/40">No recent events</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.recentEvents.map((e, i) => (
                      <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <p className="text-[11px] font-medium text-white/70">{eventLabel(e.type)}</p>
                        <p className="text-[10px] text-white/40 truncate">{e.repo}</p>
                        <p className="text-[9px] text-white/25">{timeAgo(e.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </BusinessModuleBody>
  );
}
