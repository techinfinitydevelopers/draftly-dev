'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AboutSection() {
  return (
    <section id="about" className="py-24 px-6 scroll-mt-20">
      <div className="max-w-[1000px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="tag mb-4 inline-flex">About</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Building the future of
            <br />
            <span className="text-white/40">3D website creation.</span>
          </h2>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
            Draftly was built to make 3D websites feel effortless: describe your vision once, and get a scroll-driven, cinematic site in minutes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-white/20" />
            <div>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider block">OUR MISSION</span>
              <h3 className="font-display text-xl font-semibold text-white">Agentic creative workflows</h3>
            </div>
          </div>
          <div className="space-y-3 text-white/40 text-sm leading-relaxed">
            <p>
              We believe creators deserve a faster way to ship. Draftly handles the heavy AI work behind the scenes and delivers clean, production-ready code.
            </p>
            <p>
              From cinematic motion to frame extraction and final HTML/CSS/JS output, Draftly automates the full pipeline so you can launch without weeks of design iterations.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="font-display text-2xl font-semibold text-white mb-8">Core Principles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Prompt-Driven', description: 'Describe your site once. Draftly generates cinematic visuals and a complete 3D experience.', icon: 'fa-keyboard' },
              { title: 'Fast by Default', description: 'Designed for speed — build in minutes, not days.', icon: 'fa-bolt' },
              { title: 'Scroll-First Output', description: 'The final site plays forward from extracted frames for a film-like 3D parallax feel.', icon: 'fa-scroll' },
              { title: 'Production Ready', description: 'High-resolution outputs up to 1536px. Batch generation. Bulk export. Built for real work.', icon: 'fa-rocket' },
            ].map((value, i) => (
              <div key={i} className="glass-card rounded-xl p-6 group">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-all">
                  <i className={`fa-solid ${value.icon} text-white/40 group-hover:text-white/60 transition-colors`} />
                </div>
                <h4 className="font-display text-base font-semibold text-white mb-2">{value.title}</h4>
                <p className="text-white/40 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="border-t border-white/[0.06] pt-16 mb-16"
        >
          <h3 className="font-display text-2xl font-semibold text-white mb-8">Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Gemini 2.5', desc: 'AI Engine', icon: 'fa-microchip' },
              { name: 'Frame Pipeline', desc: 'Motion to frames', icon: 'fa-film' },
              { name: 'Next.js 14', desc: 'Framework', icon: 'fa-layer-group' },
              { name: 'Firebase', desc: 'Backend', icon: 'fa-fire' },
            ].map((tech, i) => (
              <div key={i} className="text-center glass-card rounded-xl p-6 group">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] mx-auto mb-3 flex items-center justify-center group-hover:bg-white/[0.08] transition-all">
                  <i className={`fa-solid ${tech.icon} text-white/40 text-lg group-hover:text-white/60 transition-colors`} />
                </div>
                <h4 className="text-white text-sm font-medium mb-0.5">{tech.name}</h4>
                <p className="text-white/30 text-xs font-mono">{tech.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 md:p-10 mb-8"
        >
          <h3 className="font-display text-2xl font-semibold text-white mb-6">About the Founder</h3>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] flex items-center justify-center border border-white/[0.08]">
                <i className="fa-solid fa-user text-2xl text-white/30" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-display text-lg font-semibold text-white mb-1">Piyush Singh</h4>
              <p className="text-white/40 text-xs font-mono mb-3">Founder & CEO</p>
              <p className="text-white/40 text-sm leading-relaxed">
                I&apos;ve been working in freelance and visual design for over six years,
                specializing in graphic design and UI aesthetics. I&apos;m building an AI trained on over
                10,000 world-class UI designs, capable of producing layouts that look professional,
                modern, and beautifully balanced.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          id="connect"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 md:p-10 scroll-mt-24"
        >
          <h3 className="font-display text-2xl font-semibold text-white mb-6">Connect With Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: 'fa-envelope',
                title: 'Email Us',
                sub: 'Drop a Line',
                detail: 'piyush.glitch@draftly.business',
                href: 'mailto:piyush.glitch@draftly.business',
              },
              {
                icon: 'fa-brands fa-linkedin',
                title: 'LinkedIn',
                sub: 'Connect Professionally',
                detail: 'Join our network',
                href: 'https://www.linkedin.com/in/piyush-singh-023507359',
                external: true,
              },
              {
                icon: 'fa-brands fa-instagram',
                title: 'Instagram',
                sub: 'Follow Our Work',
                detail: 'Design inspiration daily',
                href: 'https://www.instagram.com/piyush.glitch',
                external: true,
              },
              {
                icon: 'fa-brands fa-x-twitter',
                title: 'Twitter',
                sub: 'Follow Updates',
                detail: 'Latest news and insights',
                href: 'https://x.com/Piyush_Sxt',
                external: true,
              },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="p-5 rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <i className={`${item.icon.includes('brands') ? 'fa-brands' : 'fa-solid'} ${item.icon.replace('fa-brands ', '')} text-white/35 group-hover:text-white/60 transition-colors text-lg`} />
                  <div>
                    <h4 className="text-white text-sm font-medium">{item.title}</h4>
                    <p className="text-white/25 text-[10px] font-mono">{item.sub}</p>
                  </div>
                </div>
                <p className="text-white/30 text-xs">{item.detail}</p>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
