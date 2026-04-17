'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, ChevronLeft, Route, Sparkles, Bot, Lightbulb } from 'lucide-react';
import { GUIDE_CATEGORIES, GUIDE_ENTRIES, type GuideEntry } from './guide-chat-data';

const ICONS = {
  route: Route,
  sparkles: Sparkles,
  bot: Bot,
  lightbulb: Lightbulb,
} as const;

function formatAnswer(text: string) {
  return text.split(/\n\n+/).map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-[13px] leading-relaxed text-neutral-700 mb-3 last:mb-0">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-neutral-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

export type GuideChatWidgetProps = {
  variant?: 'site' | 'builder';
  hidden?: boolean;
  /** Dock the floating panel */
  position?: 'left' | 'right';
};

export default function GuideChatWidget({
  variant = 'site',
  hidden = false,
  position = 'right',
}: GuideChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<GuideEntry | null>(null);

  const entriesInCategory = useMemo(
    () => (categoryId ? GUIDE_ENTRIES.filter((e) => e.categoryId === categoryId) : []),
    [categoryId],
  );

  if (hidden) return null;

  const title = variant === 'builder' ? 'Builder guide' : 'Draftly guide';
  const subtitle =
    variant === 'builder'
      ? 'Curated answers — stronger prompts, clearer pipeline.'
      : 'Learn the pipeline and write stronger prompts.';

  const dock =
    position === 'right'
      ? 'right-5 sm:right-6 md:right-8 items-end'
      : 'left-5 sm:left-6 md:left-8 items-start';

  return (
    <div
      className={`fixed bottom-5 z-[220] flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto ${dock}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-[min(100vw-2.5rem,420px)] max-h-[min(76vh,620px)] rounded-2xl border border-neutral-200/90 bg-white/98 shadow-[0_28px_90px_rgba(15,23,42,0.18),0_0_1px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-neutral-100 bg-gradient-to-br from-neutral-50 via-white to-neutral-50/80">
              <div>
                <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">{title}</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCategoryId(null);
                  setActiveEntry(null);
                }}
                className="shrink-0 w-9 h-9 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 flex items-center justify-center transition-colors shadow-sm"
                aria-label="Close help"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 bg-white">
              {activeEntry ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveEntry(null)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 hover:text-violet-900 mb-3"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-2.5 pr-1 leading-snug">
                    {activeEntry.question}
                  </h3>
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-3.5">
                    {formatAnswer(activeEntry.answer)}
                  </div>
                </div>
              ) : !categoryId ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400 font-bold px-1 mb-1">
                    Topics
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {GUIDE_CATEGORIES.map((c) => {
                      const Icon = ICONS[c.icon];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategoryId(c.id)}
                          className="flex items-center gap-3 w-full text-left rounded-xl border border-neutral-100 bg-neutral-50/80 hover:bg-white hover:border-violet-200 hover:shadow-sm px-3.5 py-3 transition-all"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-100">
                            <Icon className="w-5 h-5" aria-hidden />
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-900 leading-snug">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setCategoryId(null)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 hover:text-violet-900 mb-3"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    All topics
                  </button>
                  <ul className="space-y-2">
                    {entriesInCategory.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => setActiveEntry(e)}
                          className="w-full text-left rounded-xl border border-neutral-100 bg-white hover:bg-violet-50/80 hover:border-violet-200 px-3 py-3 text-[13px] text-neutral-800 leading-snug transition-colors shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                        >
                          {e.question}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-3 py-2.5 border-t border-neutral-100 bg-neutral-50/90">
              <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
                Not live AI — editorial answers to help you ship faster.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex items-center gap-2.5 rounded-full border pl-3 pr-4 py-2.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] transition-all duration-300 ${
          open
            ? 'bg-neutral-900 text-white border-neutral-800'
            : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300 hover:shadow-[0_16px_48px_rgba(15,23,42,0.14)]'
        }`}
        aria-expanded={open}
        aria-label={open ? 'Close help panel' : 'Open Draftly guide'}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            open ? 'bg-white/15' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
          }`}
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[13px] font-bold tracking-tight pr-0.5">{open ? 'Close' : 'Guide'}</span>
      </button>
    </div>
  );
}
