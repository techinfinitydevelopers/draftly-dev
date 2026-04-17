'use client';

import Link from 'next/link';

export default function BusinessUpgradeGate({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
            <i className="fa-solid fa-lock text-[9px]" aria-hidden />
            Business OS
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold text-white tracking-tight">{title}</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/55">
            Managed hosting, analytics, payments, database, and integrations run on Draftly infra so your team does not
            wire Firebase, GA4, Stripe, and DNS by hand. Upgrade to Pro (or higher) to enable this module when backend
            services are connected.
          </p>
          {children}
        </div>
        <Link
          href="/pricing#pricing"
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
