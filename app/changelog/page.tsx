'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NodeNetwork from '@/components/NodeNetwork';

const TYPES: Record<string, { label: string; style: string }> = {
  new: { label: 'New', style: 'text-emerald-400/80 bg-emerald-500/[0.08] border border-emerald-500/[0.12]' },
  fix: { label: 'Fix', style: 'text-amber-400/70 bg-amber-500/[0.06] border border-amber-500/[0.1]' },
  improved: { label: 'Improved', style: 'text-blue-400/70 bg-blue-500/[0.06] border border-blue-500/[0.1]' },
  breaking: { label: 'Breaking', style: 'text-red-400/70 bg-red-500/[0.06] border border-red-500/[0.1]' },
};

const LOG = [
  { v: '2.4.0', date: 'Feb 2026', title: 'Homepage Redesign & UX Polish', entries: [
    { t: 'new', d: 'Full homepage overhaul with 14 scrollable sections showcasing every Studio feature' },
    { t: 'new', d: 'Live workflow demo on the homepage — real Quick 5-Image template with animated node connections' },
    { t: 'new', d: 'Interactive 3D floating particle background across all pages' },
    { t: 'improved', d: 'Navbar is larger, more visible, with dynamic light/dark adaptation on homepage hero' },
    { t: 'improved', d: 'Glassmorphism card and button system across all public pages' },
    { t: 'improved', d: 'Text visibility on dark backgrounds — all labels and descriptions are brighter' },
    { t: 'fix', d: 'Scroll animations now reveal sections smoothly as you scroll down' },
  ]},
  { v: '2.3.0', date: 'Jan 2026', title: 'Studio v2 — Visual AI Workflows', entries: [
    { t: 'new', d: 'Visual node-based workflow editor — drag AI nodes onto a canvas and connect them' },
    { t: 'new', d: '8 node types: Text Prompt, Image Gen, Video Gen, Upscale, Remove BG, Variation, Upload, Preview' },
    { t: 'new', d: '7 pre-built workflow templates including Quick 5-Image, Content Creator 10, Full Production 15' },
    { t: 'new', d: 'Batch generation — run all Image Gen or Video Gen nodes with one click' },
    { t: 'new', d: 'Workflow auto-save every 30 seconds to Firebase Cloud. Manual save with Ctrl+S' },
    { t: 'new', d: 'Workflow Gallery — browse and reload any previously saved project' },
    { t: 'new', d: 'Generation Gallery — view, expand, and download all images/videos from the current workflow' },
    { t: 'new', d: 'Undo/redo system with 30-state history stack' },
    { t: 'improved', d: 'Animated edges with travelling data-flow dots between connected nodes' },
  ]},
  { v: '2.2.0', date: 'Dec 2025', title: 'Multi-Model AI Engine', entries: [
    { t: 'new', d: 'Added Veo 3.0 (Google DeepMind) for high-quality AI video generation' },
    { t: 'new', d: 'Added Flux Pro 1.1 (Black Forest Labs) for cinematic image generation' },
    { t: 'new', d: 'Added Kling 1.6 (Kuaishou) for fast, affordable video creation' },
    { t: 'new', d: 'Credit-based billing — Free: 20/mo, Pro: 200/mo, Premium: 500/mo' },
    { t: 'new', d: 'Smart model routing — automatically selects models based on plan tier and task' },
    { t: 'improved', d: 'Image generation 2x faster with optimized API routing and caching' },
  ]},
  { v: '2.1.0', date: 'Nov 2025', title: 'Image Processing Pipeline', entries: [
    { t: 'new', d: 'Real-ESRGAN upscaling — 2x and 4x enhancement for all generated images' },
    { t: 'new', d: 'Background removal node — clean subject extraction powered by AI' },
    { t: 'new', d: 'Image Variation node — generate style/angle variations from any image' },
    { t: 'improved', d: 'Preview node now shows full-size images with download button' },
  ]},
  { v: '2.0.0', date: 'Oct 2025', title: 'Platform Rewrite', entries: [
    { t: 'breaking', d: 'Complete platform rewrite with Next.js 14 App Router and React 18' },
    { t: 'new', d: 'Firebase Authentication with Google sign-in' },
    { t: 'new', d: 'Gumroad subscription integration for Pro and Premium plans' },
    { t: 'new', d: 'Dark theme with pure black backgrounds and monochrome design system' },
    { t: 'improved', d: 'Page load time reduced by 60% with server-side rendering and code splitting' },
  ]},
  { v: '1.0.0', date: 'Aug 2025', title: 'Initial Release', entries: [
    { t: 'new', d: 'AI-powered website generation from text prompts' },
    { t: 'new', d: 'HTML + Tailwind CSS output with live preview' },
    { t: 'new', d: 'Project management dashboard' },
  ]},
];

function Block({ item, i }: { item: typeof LOG[0]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: i * 0.04 }} className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-[11px] top-1.5 w-3 h-3 rounded-full bg-[#050508] border-2 border-white/25" />

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-mono font-bold text-white bg-white/[0.06] backdrop-blur-sm px-3 py-1 rounded-lg border border-white/[0.08]">
          v{item.v}
        </span>
        <span className="text-[11px] text-white/25 font-mono">{item.date}</span>
      </div>

      <h2 className="text-lg font-display font-semibold text-white mb-4">{item.title}</h2>

      <div className="space-y-2">
        {item.entries.map((e, j) => (
          <div key={j} className="flex items-start gap-3 py-2.5 px-4 glass-card rounded-xl !rounded-lg">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${TYPES[e.t].style} flex-shrink-0 mt-0.5`}>
              {TYPES[e.t].label}
            </span>
            <span className="text-white/45 text-[13px]">{e.d}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#050508] relative">
      {/* Animated node network background */}
      <NodeNetwork />

      {/* Ambient glows */}
      <div className="fixed top-1/4 right-0 w-[400px] h-[500px] bg-emerald-500/[0.01] rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/3 left-0 w-[350px] h-[400px] bg-amber-500/[0.008] rounded-full blur-[100px] pointer-events-none" />

      <Header />
      <div className="relative z-10 pt-32 pb-24 max-w-2xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <span className="tag mb-4 inline-flex">Changelog</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
            What&apos;s new
          </h1>
          <p className="text-white/35 text-[15px] mt-4 max-w-md mx-auto">
            Every update, improvement, and fix — tracked here.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[17px] top-0 bottom-0 w-px bg-gradient-to-b from-white/15 via-white/[0.06] to-transparent" />
          <div className="space-y-12">
            {LOG.map((item, i) => <Block key={item.v} item={item} i={i} />)}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
