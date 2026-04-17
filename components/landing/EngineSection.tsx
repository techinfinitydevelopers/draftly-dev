'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function EngineSection() {
  const models = [
    { name: 'Gemini 2.5 Flash', provider: 'Google', type: 'Image + Video', desc: 'Multimodal generation with native image & video understanding', color: 'from-blue-500/20 to-cyan-500/20' },
    { name: 'Flux Pro 1.1', provider: 'Black Forest Labs', type: 'Image', desc: 'State-of-the-art text-to-image with exceptional prompt adherence', color: 'from-violet-500/20 to-purple-500/20' },
    { name: 'Veo 3.0', provider: 'Google DeepMind', type: 'Video', desc: 'High-fidelity video generation from text and image inputs', color: 'from-rose-500/20 to-pink-500/20' },
    { name: 'Kling 1.6', provider: 'Kuaishou', type: 'Video', desc: 'Professional video generation with advanced motion modeling', color: 'from-amber-500/20 to-orange-500/20' },
    { name: 'Stable Cascade', provider: 'Stability AI', type: 'Image', desc: 'High-quality image generation with efficient architecture', color: 'from-emerald-500/20 to-teal-500/20' },
    { name: 'Luma Dream Machine', provider: 'Luma AI', type: 'Video', desc: 'Cinematic video creation with realistic motion physics', color: 'from-cyan-500/20 to-sky-500/20' },
  ];

  const capabilities = [
    { icon: 'fa-image', title: 'Background Image', desc: 'AI creates a cinematic frame from your prompt.' },
    { icon: 'fa-video', title: 'Animated Motion', desc: 'Turn the image into a smooth 8-second video with depth.' },
    { icon: 'fa-expand', title: 'Frame Extraction', desc: 'Extract hundreds of frames for scroll-driven playback.' },
    { icon: 'fa-cube', title: 'Website Build', desc: 'AI composes a scroll-reactive 3D experience into HTML/CSS/JS.' },
    { icon: 'fa-download', title: 'Export ZIP', desc: 'Download ready-to-deploy code in minutes.' },
    { icon: 'fa-wand-magic-sparkles', title: 'Iterate by Chat', desc: 'Refine copy, layout, and colors after the build.' },
  ];

  return (
    <section id="engine" className="py-24 px-6 scroll-mt-20">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="tag mb-4 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            Powering 3D Builder
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            The models powering
            <br />
            <span className="text-white/40">your next 3D website</span>
          </h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">
            Multiple generation engines work behind the scenes to produce motion, frames, and final website code.
          </p>
        </motion.div>

        {/* Model cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16"
        >
          {models.map((model, i) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card overflow-hidden group"
            >
              {/* Color header bar — like studio nodes */}
              <div className={`px-5 py-3 bg-gradient-to-r ${model.color} border-b border-white/[0.05] flex items-center justify-between`}>
                <span className="text-white/80 text-xs font-semibold tracking-wide">{model.name}</span>
                <span className="text-[9px] font-mono text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.06]">
                  {model.type}
                </span>
              </div>
              {/* Body */}
              <div className="p-5">
                <p className="text-white/25 text-xs font-mono mb-2">{model.provider}</p>
                <p className="text-white/40 text-[13px] leading-relaxed">{model.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="font-display text-2xl font-semibold text-white mb-8 text-center">Capabilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {capabilities.map((cap, i) => (
              <div key={i} className="glass-card rounded-xl p-5 group">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-all">
                  <i className={`fa-solid ${cap.icon} text-white/35 group-hover:text-white/55 transition-colors`} />
                </div>
                <h4 className="text-white/80 text-sm font-medium mb-1">{cap.title}</h4>
                <p className="text-white/30 text-xs leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-10 text-center"
        >
          <h3 className="font-display text-2xl font-bold text-white mb-3">Generate your 3D website in minutes</h3>
          <p className="text-white/35 text-sm mb-8 max-w-md mx-auto">
            Describe your website once. Draftly generates cinematic motion, builds the scroll experience, and exports ready-to-deploy code.
          </p>
          <Link
            href="/3d-builder"
            className="btn-glass inline-flex items-center gap-2 text-white !px-8 !py-3.5"
          >
            Start 3D Building
            <i className="fa-solid fa-arrow-right text-xs" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
