'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { isOwnerEmail } from '@/lib/owner-emails';

export default function InternalBusinessAdminPage() {
  const { user, loading } = useAuth();
  const allowed = isOwnerEmail(user?.email);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white/50 text-sm">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 text-white/60 text-sm">
        Not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400/90">Internal</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Business OS ops</h1>
            <p className="text-[13px] text-white/45 mt-1">Owner-only stub. Harden with server session + IP allowlist before production.</p>
          </div>
          <Link href="/business" className="text-[13px] text-violet-300 hover:text-violet-200">
            ← Business hub
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Deployments', '0 active (mock)', 'fa-cloud-arrow-up'],
            ['Bandwidth 24h', '—', 'fa-gauge-high'],
            ['Failed jobs', '0', 'fa-triangle-exclamation'],
            ['MRR (platform)', '—', 'fa-sack-dollar'],
          ].map(([title, val, icon]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                <i className={`fa-solid ${icon} text-rose-400/70`} aria-hidden />
                {title}
              </div>
              <p className="mt-3 text-xl font-semibold text-white">{val}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-white/35">
          Next: Firebase Admin list projects, Vercel/CF API for deployment status, Stripe dashboard deep links, audit log
          export.
        </p>
      </div>
    </div>
  );
}
