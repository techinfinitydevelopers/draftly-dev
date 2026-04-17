'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const PREVIEWS = [
  {
    title: 'UNVRS Labs',
    thumbnail: '/landing/best-previews/preview-unvrs.png',
    href: 'https://unvrs-labs-2.piyushsingh123443.workers.dev/',
  },
  {
    title: 'Showcase One',
    thumbnail: '/landing/best-previews/preview-showcase1.png',
    href: 'https://showcase1.piyushsingh123443.workers.dev/',
  },
  {
    title: 'Showcase Two',
    thumbnail: '/landing/best-previews/preview-showcase2.png',
    href: 'https://showcase2.piyushsingh123443.workers.dev/',
  },
] as const;

export default function BestPreviewsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      id="best-previews"
      className="relative z-10 py-14 md:py-24 scroll-mt-20 overflow-hidden border-b border-white/[0.04]"
    >
      <div className="absolute top-1/2 left-0 w-[min(100%,480px)] h-[min(100%,480px)] -translate-y-1/2 rounded-full blur-[140px] pointer-events-none bg-blue-500/[0.06]" />

      <div className="relative w-full">
        <div className="max-w-3xl mx-auto px-5 md:px-6 mb-10 md:mb-14">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 36 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            <span className="tag mb-4 inline-flex">
              <i className="fa-solid fa-eye text-[8px] text-blue-400" />
              Live sites
            </span>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05]">
              Best Previews
            </h2>
            <p className="text-white/55 text-[14px] md:text-[16px] mt-4 max-w-2xl mx-auto leading-relaxed">
              Open full-screen demos built with Draftly — each preview runs on its own deployment.
            </p>
          </motion.div>
        </div>

        {/* Full-bleed row: uses nearly the full viewport width; tall tiles so previews feel page-scale */}
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-5 xl:gap-6">
            {PREVIEWS.map((item, i) => (
              <motion.article
                key={item.href}
                initial={{ opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.08 * i, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group relative rounded-2xl xl:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0c0c16] hover:border-white/[0.18] transition-colors duration-500 min-h-0"
              >
                <div
                  className="relative w-full overflow-hidden
                    min-h-[min(52dvh,640px)] sm:min-h-[min(48dvh,600px)]
                    md:min-h-[min(44dvh,560px)] xl:min-h-[min(38dvh,720px)]"
                >
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-5 md:p-7 lg:p-8 gap-3 md:gap-4">
                    <h3 className="text-white font-semibold text-base md:text-lg tracking-tight text-center drop-shadow-md">
                      {item.title}
                    </h3>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-[13px] md:text-[14px] font-bold bg-white text-black hover:bg-white/95 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                    >
                      Preview
                      <i className="fa-solid fa-arrow-up-right-from-square text-[11px] opacity-70" />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
