'use client';

/**
 * Compact (i) control — full explanation on hover/focus (non-touch: hover; keyboard: focus-visible).
 */
export default function InfoTip({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-[10px] font-bold text-white/45 outline-none transition-colors hover:border-violet-400/35 hover:text-violet-200 focus-visible:ring-2 focus-visible:ring-violet-500/50"
        aria-label={`About: ${title}`}
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-[60] mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 scale-95 rounded-xl border border-white/10 bg-[#12151f] p-3 text-left text-[11px] leading-snug text-white/75 opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all group-hover:visible group-hover:opacity-100 group-hover:scale-100 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:scale-100"
      >
        <span className="mb-1 block font-semibold text-white">{title}</span>
        {children}
      </span>
    </span>
  );
}
