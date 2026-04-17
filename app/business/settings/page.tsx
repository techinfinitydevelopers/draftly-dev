'use client';

import Link from 'next/link';

export default function BusinessSettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-[14px] text-white/50 leading-relaxed">Project metadata, billing portal, and team seats (coming).</p>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/90 p-6 space-y-4">
        <Link
          href="/pricing#pricing"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-violet-300 hover:text-violet-200"
        >
          Manage subscription
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden />
        </Link>
        <p className="text-[12px] text-white/45">
          Hook this to your payment provider customer portal (Dodo, Stripe billing portal, etc.).
        </p>
      </div>
    </div>
  );
}
