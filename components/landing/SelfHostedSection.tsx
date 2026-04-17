'use client';

import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SELF-HOSTED / LOCAL MODE SECTION
   "Run it on your own PC — unlimited, forever free"
   ═══════════════════════════════════════════════════════════════ */

const IMAGE_MODELS = [
  {
    name: 'Stable Diffusion XL',
    repo: 'stabilityai/stable-diffusion-xl-base-1.0',
    vram: '8 GB',
    size: '~7 GB',
    speed: '~5s / image',
    quality: 'High',
    desc: 'Industry standard. 1024px native, photorealistic and artistic.',
    accent: '#a78bfa',
  },
  {
    name: 'Flux.1 Dev',
    repo: 'black-forest-labs/FLUX.1-dev',
    vram: '12 GB',
    size: '~12 GB',
    speed: '~8s / image',
    quality: 'Very High',
    desc: 'State-of-the-art text-to-image. Best prompt following, incredible detail.',
    accent: '#f472b6',
  },
  {
    name: 'Stable Diffusion 1.5',
    repo: 'stable-diffusion-v1-5/stable-diffusion-v1-5',
    vram: '4 GB',
    size: '~5 GB',
    speed: '~15s / image',
    quality: 'Good',
    desc: 'Runs on almost any GPU. Massive LoRA and checkpoint ecosystem.',
    accent: '#34d399',
  },
  {
    name: 'Fooocus',
    repo: 'lllyasviel/Fooocus',
    vram: '6 GB',
    size: '~10 GB',
    speed: '~6s / image',
    quality: 'High',
    desc: 'One-click install. Built-in inpainting, styles, and upscaling. Best for beginners.',
    accent: '#fbbf24',
  },
  {
    name: 'Stable Cascade',
    repo: 'stabilityai/stable-cascade',
    vram: '10 GB',
    size: '~8 GB',
    speed: '~10s / image',
    quality: 'High',
    desc: 'Two-stage architecture. Excellent text rendering and composition.',
    accent: '#22d3ee',
  },
];

const VIDEO_MODELS = [
  {
    name: 'CogVideoX',
    repo: 'THUDM/CogVideoX-5b',
    vram: '16 GB',
    size: '~10 GB',
    speed: '~2 min / clip',
    quality: 'Very High',
    desc: '5B parameter video model. 6-second clips with strong motion coherence.',
    accent: '#fb7185',
  },
  {
    name: 'Hunyuan Video',
    repo: 'tencent/HunyuanVideo',
    vram: '16 GB',
    size: '~15 GB',
    speed: '~3 min / clip',
    quality: 'Very High',
    desc: 'Tencent\'s open-source video gen. Great quality, supports image-to-video.',
    accent: '#38bdf8',
  },
  {
    name: 'AnimateDiff',
    repo: 'guoyww/animatediff-motion-adapter-v1-5-3',
    vram: '4 GB',
    size: '~5 GB',
    speed: '~3 min / clip',
    quality: 'Good',
    desc: 'Runs on low-end GPUs. Uses SD 1.5 backbone. Good for short animations.',
    accent: '#a78bfa',
  },
  {
    name: 'Open-Sora',
    repo: 'hpcaitech/Open-Sora',
    vram: '12 GB',
    size: '~8 GB',
    speed: '~2 min / clip',
    quality: 'High',
    desc: 'Open-source Sora alternative. Up to 16 seconds of video generation.',
    accent: '#4ade80',
  },
  {
    name: 'Wan 2.1',
    repo: 'Wan-Video/Wan2.1',
    vram: '12 GB',
    size: '~14 GB',
    speed: '~2 min / clip',
    quality: 'High',
    desc: 'Alibaba\'s open video model. Strong prompt adherence, multiple resolutions.',
    accent: '#fb923c',
  },
];

const SETUP_STEPS = [
  {
    step: '01',
    title: 'Clone the Draftly app',
    cmd: 'git clone https://github.com/piyushxt43/draftly-yc.git',
    desc: 'Same codebase that powers draftly.space — Next.js app with the 3D Website Builder.',
    icon: 'fa-code-branch',
    accent: '#a78bfa',
  },
  {
    step: '02',
    title: 'Install dependencies',
    cmd: 'cd draftly-yc && npm install',
    desc: 'Uses Node 18+. No separate “studio” package — the builder lives at /3d-builder.',
    icon: 'fa-box-open',
    accent: '#22d3ee',
  },
  {
    step: '03',
    title: 'Configure environment',
    cmd: 'cp .env.example .env.local',
    desc: 'Add Firebase, API-Easy / Gemini for Veo and Nano, and FAL_KEY if you want Seedream + LTX on fal locally.',
    icon: 'fa-key',
    accent: '#34d399',
  },
  {
    step: '04',
    title: 'Run the dev server',
    cmd: 'npm run dev',
    desc: 'Open http://localhost:3000/3d-builder — same pipeline as production (subject to your keys and plan).',
    icon: 'fa-server',
    accent: '#fbbf24',
  },
  {
    step: '05',
    title: 'Optional: local GPU models',
    cmd: 'See Hugging Face / ComfyUI docs',
    desc: 'You can run open-source image/video weights on your own GPU; wiring them into this app is advanced and not required for the hosted builder.',
    icon: 'fa-microchip',
    accent: '#fb7185',
  },
];

const SPECS = [
  { label: 'Minimum GPU', value: 'GTX 1050 Ti (4 GB)', icon: 'fa-microchip' },
  { label: 'Recommended GPU', value: 'RTX 3060+ (12 GB)', icon: 'fa-bolt' },
  { label: 'RAM', value: '16 GB+', icon: 'fa-memory' },
  { label: 'Storage', value: '50 GB free (for models)', icon: 'fa-hard-drive' },
  { label: 'OS', value: 'Windows / Linux / macOS', icon: 'fa-desktop' },
  { label: 'Python', value: '3.10+', icon: 'fa-code' },
];

interface SelfHostedSectionProps {
  /** Show CTA to pricing (true on homepage, false on pricing page itself) */
  showPricingCta?: boolean;
  /** Compact mode — fewer items, for homepage embed */
  compact?: boolean;
}

export default function SelfHostedSection({ showPricingCta = true, compact = false }: SelfHostedSectionProps) {
  const imageModelsToShow = compact ? IMAGE_MODELS.slice(0, 3) : IMAGE_MODELS;
  const videoModelsToShow = compact ? VIDEO_MODELS.slice(0, 3) : VIDEO_MODELS;

  return (
    <div className="max-w-[1300px] mx-auto px-5 md:px-6">
      {/* Header */}
      <Reveal className="text-center mb-10 md:mb-14">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 border border-white/10 px-4 py-1.5 rounded-full">
            Self-Hosted Mode
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Free &amp; Unlimited
          </span>
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.05]">
          Run it on your own PC
        </h2>
        <p className="text-white/55 text-[14px] md:text-[16px] mt-5 max-w-2xl mx-auto leading-relaxed">
          Run the Draftly Next.js app locally and use the <strong className="text-white/80">3D Website Builder</strong> with your own API keys.
          Below are popular <strong className="text-white/80">open-source weights</strong> you can run separately on a GPU — useful if you experiment outside the cloud builder.
        </p>
      </Reveal>

      {/* Specs grid */}
      <Reveal delay={0.05} className="mb-12 md:mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SPECS.map((s) => (
            <div key={s.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 md:p-4 text-center hover:border-white/[0.12] transition-all">
              <i className={`fa-solid ${s.icon} text-white/25 text-[11px] mb-2 block`} />
              <div className="text-[13px] font-bold text-white/80 mb-0.5">{s.value}</div>
              <div className="text-[10px] text-white/30">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Setup Steps */}
      <Reveal delay={0.08} className="mb-12 md:mb-16">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-6">
          Run the app in five steps
        </h3>
        <div className="space-y-2">
          {SETUP_STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.04}>
              <div className="flex items-start gap-3 md:gap-4 p-3.5 md:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 group">
                <div className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-lg border border-white/[0.08] flex items-center justify-center"
                  style={{ background: s.accent + '12' }}>
                  <i className={`fa-solid ${s.icon} text-sm`} style={{ color: s.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-white/20">{s.step}</span>
                    <h4 className="text-[14px] md:text-[15px] font-semibold text-white">{s.title}</h4>
                  </div>
                  <p className="text-white/40 text-[12px] md:text-[13px] mb-2">{s.desc}</p>
                  <code className="text-[11px] font-mono text-emerald-400/70 bg-emerald-500/[0.06] px-2.5 py-1 rounded-md border border-emerald-500/10 inline-block break-all">
                    {s.cmd}
                  </code>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Image Models */}
      <Reveal delay={0.1} className="mb-10">
        <h3 className="text-lg md:text-xl font-bold text-white mb-1">
          Open-Source Image Models
        </h3>
        <p className="text-white/40 text-[13px] mb-5">
          Popular checkpoints on Hugging Face — for self-hosted inference experiments, not wired into the cloud builder UI.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {imageModelsToShow.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.04}>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all duration-300 overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2.5"
                  style={{ background: `linear-gradient(135deg, ${m.accent}10, transparent)` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.accent }} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-white/85">{m.name}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                    FREE
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-white/45 text-[12px] leading-relaxed mb-3 flex-1">{m.desc}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-[11px]">
                      <span className="text-white/30">VRAM: </span>
                      <span className="text-white/60 font-medium">{m.vram}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Size: </span>
                      <span className="text-white/60 font-medium">{m.size}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Speed: </span>
                      <span className="text-white/60 font-medium">{m.speed}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Quality: </span>
                      <span className="text-white/60 font-medium">{m.quality}</span>
                    </div>
                  </div>

                  {/* Repo link */}
                  <code className="text-[10px] font-mono text-white/30 bg-white/[0.03] px-2.5 py-1.5 rounded-md border border-white/[0.05] block truncate">
                    {m.repo}
                  </code>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Video Models */}
      <Reveal delay={0.12} className="mb-12 md:mb-16">
        <h3 className="text-lg md:text-xl font-bold text-white mb-1">
          Open-Source Video Models
        </h3>
        <p className="text-white/40 text-[13px] mb-5">
          Open video checkpoints for local or research use. Production motion in Draftly uses Veo and fal LTX in the 3D builder.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videoModelsToShow.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.04}>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all duration-300 overflow-hidden h-full flex flex-col">
                <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2.5"
                  style={{ background: `linear-gradient(135deg, ${m.accent}10, transparent)` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.accent }} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-white/85">{m.name}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                    FREE
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-white/45 text-[12px] leading-relaxed mb-3 flex-1">{m.desc}</p>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-[11px]">
                      <span className="text-white/30">VRAM: </span>
                      <span className="text-white/60 font-medium">{m.vram}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Size: </span>
                      <span className="text-white/60 font-medium">{m.size}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Speed: </span>
                      <span className="text-white/60 font-medium">{m.speed}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-white/30">Quality: </span>
                      <span className="text-white/60 font-medium">{m.quality}</span>
                    </div>
                  </div>

                  <code className="text-[10px] font-mono text-white/30 bg-white/[0.03] px-2.5 py-1.5 rounded-md border border-white/[0.05] block truncate">
                    {m.repo}
                  </code>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        {compact && (
          <div className="text-center mt-5">
            <Link href="/pricing" className="text-white/50 text-[13px] hover:text-white/70 transition-colors underline decoration-white/15">
              See all models and setup guide →
            </Link>
          </div>
        )}
      </Reveal>

      {/* CTA — "Don't want the hassle?" */}
      <Reveal className="mb-6">
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.04] to-blue-500/[0.02] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                  <i className="fa-solid fa-cloud text-violet-400" />
                </div>
                <h3 className="text-[18px] font-bold text-white">Don&apos;t want the hassle?</h3>
              </div>
              <p className="text-white/55 text-[14px] leading-relaxed mb-3">
                Setting up GPU drivers, downloading 15 GB models, and debugging CUDA errors isn&apos;t for everyone.
                Our cloud plans give you <strong className="text-white/80">instant access to 12+ premium AI models</strong> —
                no setup, no downloads, no GPU required.
              </p>
              <div className="flex flex-wrap gap-3 text-[12px] text-white/40">
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400 text-[9px]" /> Instant — no setup</span>
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400 text-[9px]" /> 12+ premium models</span>
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400 text-[9px]" /> Starting at $25/mo</span>
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400 text-[9px]" /> Works on any device</span>
              </div>
            </div>
            {showPricingCta && (
              <div className="flex-shrink-0">
                <Link
                  href="/pricing"
                  className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-white text-black hover:bg-white/90 transition-all duration-300 inline-flex items-center gap-2 shadow-[0_2px_16px_rgba(255,255,255,0.08)]"
                >
                  View Plans
                  <i className="fa-solid fa-arrow-right text-[11px]" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
