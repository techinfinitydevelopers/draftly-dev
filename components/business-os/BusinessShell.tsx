'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { BUSINESS_NAV } from '@/lib/business-os/nav';
import { planHasBusinessOs } from '@/lib/business-os/access';
import IntegrationTopBar from '@/components/integrations/IntegrationTopBar';

export default function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { subscription, isOwner } = useSubscription();
  const testing = isTestingCreditsEmail(user?.email);
  const unlocked = planHasBusinessOs(subscription.plan, isOwner, testing);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#06080f] text-white font-sans md:flex-row">
      <aside className="flex max-h-[40vh] w-full flex-shrink-0 flex-col border-b border-white/[0.07] bg-[#080b14]/95 backdrop-blur-xl md:max-h-none md:h-auto md:w-[248px] md:border-b-0 md:border-r">
        <div className="p-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/35 to-indigo-600/25 border border-white/10 flex items-center justify-center group-hover:border-violet-400/35 transition-colors">
              <div className="h-2 w-2 rounded-sm bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold tracking-tight text-white">Draftly</div>
              <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Business Suite</div>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-row gap-1 overflow-x-auto overflow-y-hidden p-2 md:flex-col md:space-y-0.5 md:overflow-y-auto md:overflow-x-hidden">
          {BUSINESS_NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/business' && pathname?.startsWith(item.href));
            const locked = item.requiresBusinessOs && !unlocked;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex min-w-[9.5rem] flex-shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all border border-transparent md:min-w-0 md:items-start md:gap-3 md:px-3 md:py-2.5 ${
                  active
                    ? 'bg-white/[0.08] border-white/[0.08] text-white'
                    : 'text-white/55 hover:bg-white/[0.04] hover:text-white/90'
                } ${locked ? 'opacity-70' : ''}`}
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                    active ? 'border-violet-400/35 bg-violet-500/15 text-violet-200' : 'border-white/[0.08] bg-white/[0.03] text-white/50'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-[13px]`} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold leading-tight md:text-[13px]">{item.label}</span>
                    {locked && <i className="fa-solid fa-lock text-[8px] text-amber-400/90" aria-hidden />}
                  </span>
                  <span className="hidden md:mt-0.5 md:block text-[11px] leading-snug text-white/40">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/[0.06] p-3 space-y-2 md:block">
          <Link
            href="/studio"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
          >
            <i className="fa-solid fa-diagram-project text-violet-400/80 text-xs" aria-hidden />
            AI Creative Studio
          </Link>
          <Link
            href="/3d-builder"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
          >
            <i className="fa-solid fa-cube text-teal-400/80 text-xs" aria-hidden />
            3D Website Builder
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#0a0d14]/90 px-3 md:px-5 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14px] font-semibold tracking-tight text-white truncate">Project: Primary site</p>
            <p className="text-[11px] text-white/40 truncate">
              {unlocked ? 'Run your site, stack & growth here' : 'Upgrade to connect payments & hosting'}
            </p>
          </div>
          <div
            className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              unlocked ? 'border-teal-500/30 bg-teal-500/10 text-teal-200' : 'border-white/10 bg-white/[0.04] text-white/45'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${unlocked ? 'bg-teal-400 animate-pulse' : 'bg-white/30'}`} />
            {unlocked ? 'Live stack (mock)' : 'Draft'}
          </div>
          {!unlocked && (
            <Link
              href="/pricing#pricing"
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors"
            >
              Unlock Business OS
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden sm:inline text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              Sign out
            </button>
          )}
        </header>
        <IntegrationTopBar />
        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
