import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalDocShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="border-b border-white/[0.06] bg-[#050508]/95 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white/80 hover:text-white transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.08] border border-white/[0.1]">
              <div className="w-2 h-2 rounded-sm bg-white" />
            </div>
            <span className="font-display font-extrabold text-[15px] tracking-tight uppercase">Draftly</span>
          </Link>
          <Link
            href="/legal"
            className="text-[12px] font-medium text-white/45 hover:text-white/90 transition-colors"
          >
            All legal
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16 pb-24">
        <h1 className="font-display text-3xl md:text-[2.25rem] font-bold tracking-tight text-white mb-2">
          {title}
        </h1>
        <p className="text-[13px] text-white/45 mb-10 md:mb-12">Last updated: {lastUpdated}</p>
        <div className="space-y-8 text-[14px] md:text-[15px] leading-relaxed text-white/75 [&_h2]:font-display [&_h2]:text-lg [&_h2]:md:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-white/95 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_a]:text-teal-300/90 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-teal-200 [&_strong]:text-white/95">
          {children}
        </div>
      </article>
    </div>
  );
}
