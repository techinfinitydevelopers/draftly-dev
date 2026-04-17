'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PresetsTeaserSection() {
  return (
    <section id="presets" className="py-24 px-6 scroll-mt-20 flex items-center min-h-[70vh]">
      <div className="max-w-[1000px] mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-white/40 mb-6">
            <i className="fa-solid fa-layer-group text-[10px]" />
            PRESETS
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tighter-custom mb-4">
            Start from a Preset
          </h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto mb-10">
            Jump-start your design with templates for games, apps, landing pages, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[
              { icon: 'fa-gamepad', label: 'Games', gradient: 'from-red-500/10 to-orange-500/10' },
              { icon: 'fa-mobile-screen', label: 'Apps', gradient: 'from-blue-500/10 to-cyan-500/10' },
              { icon: 'fa-landmark', label: 'Landing', gradient: 'from-violet-500/10 to-purple-500/10' },
            ].map((item) => (
              <div key={item.label} className="glass-card rounded-xl p-6 w-36 hover:!border-white/[0.12]">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-3`}>
                  <i className={`fa-solid ${item.icon} text-white/60`} />
                </div>
                <p className="text-white/60 text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/presets"
            className="btn-glass inline-flex items-center gap-2 text-white/60 hover:text-white"
          >
            <i className="fa-solid fa-layer-group text-xs" />
            See All Presets
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
