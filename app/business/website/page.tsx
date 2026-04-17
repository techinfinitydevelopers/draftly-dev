'use client';

import Link from 'next/link';

export default function BusinessWebsitePage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Website</h1>
        <p className="mt-2 text-[14px] text-white/50 leading-relaxed">
          Cinematic 3D sites are authored in the existing builder — copilot, preview, and ZIP export (per plan) stay there
          until everything is hosted on Draftly.
        </p>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/90 p-6 space-y-4">
        <p className="text-[13px] text-white/60 leading-relaxed">
          Open the <span className="text-white/85 font-medium">3D Website Builder</span> to create or iterate. When Business
          OS hosting is live, this tab will show deployment status, preview URLs, and environment toggles without leaving
          the hub.
        </p>
        <Link
          href="/3d-builder"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors"
        >
          <i className="fa-solid fa-arrow-right text-xs" aria-hidden />
          Open 3D builder
        </Link>
      </div>
    </div>
  );
}
