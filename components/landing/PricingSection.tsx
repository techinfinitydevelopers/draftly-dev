'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';
const ThreeBackground = dynamic(() => import('@/components/landing/ThreeBackground'), { ssr: false });

function FloatingGems({ activeIndex }: { activeIndex: number }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.1;
    }
  });

  const targetColor = [
    "#64748b", // Basic $25
    "#3b82f6", // Basic Plus $40
    "#8b5cf6", // Pro $60
    "#f59e0b", // Premium $200
  ][activeIndex] || "#64748b";

  return (
    <group ref={group}>
      <directionalLight position={[10, 10, 5]} intensity={2} color={targetColor} />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#ffffff" />
      <ambientLight intensity={0.5} />
      
      {[...Array(8)].map((_, i) => (
        <Float key={i} speed={1.5} rotationIntensity={2} floatIntensity={1} position={[
          Math.sin(i * Math.PI / 4) * 12,
          Math.cos(i * 2.5) * 4,
          Math.cos(i * Math.PI / 4) * 4 - 8
        ]}>
          <mesh>
            <octahedronGeometry args={[1 + Math.random(), 0]} />
            <meshPhysicalMaterial 
              color={i % 2 === 0 ? targetColor : "#ffffff"} 
              transmission={0.9} 
              opacity={1} 
              metalness={0.2} 
              roughness={0.1} 
              ior={1.5} 
              thickness={2} 
            />
          </mesh>
        </Float>
      ))}
      <Sparkles count={200} scale={20} size={5} speed={0.4} opacity={0.3} color={targetColor} />
    </group>
  );
}

function RollingNumber({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 1200;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(Math.round((1 - Math.pow(2, -10 * p)) * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return (
    <span ref={ref} className="inline-flex items-baseline">
      <span className="text-white/30 mr-0.5 text-[0.55em]">{prefix}</span>
      {display.toString().split('').map((d, i) => (
        <motion.span key={`${i}-${d}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: i * 0.03 }} className="inline-block tabular-nums">{d}</motion.span>
      ))}
    </span>
  );
}

function Reveal({ children, delay = 0, className = '', direction = 'up' }: { children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right' | 'scale' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const initial = direction === 'scale' ? { opacity: 0, scale: 0.9, filter: 'blur(8px)' } : direction === 'left' ? { opacity: 0, x: -40, filter: 'blur(6px)' } : direction === 'right' ? { opacity: 0, x: 40, filter: 'blur(6px)' } : { opacity: 0, y: 32, filter: 'blur(6px)' };
  const anim = direction === 'scale' ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : direction === 'left' || direction === 'right' ? { opacity: 1, x: 0, filter: 'blur(0px)' } : { opacity: 1, y: 0, filter: 'blur(0px)' };
  return (
    <motion.div ref={ref} initial={initial} animate={inView ? anim : {}} transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94], type: 'spring', stiffness: 80, damping: 20 }} className={className}>
      {children}
    </motion.div>
  );
}

export default function PricingSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [annual, setAnnual] = useState(false);
  const activeIndex = 2; // highlight Pro ($60)

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  /** One-line disclaimer at bottom of tier; icon + compact row (see finePrint render). */
  const noCloudSaveNote = 'No cloud backup—download from the builder before you leave.';

  type PlanLimit = {
    text: string;
    /** Font Awesome 6 solid icon name without prefix, e.g. "fa-image" */
    icon: string;
    tag?: string;
    tagColor?: string;
    /** Renders as a tiny footer line under the feature list */
    finePrint?: boolean;
  };

  type PricingPlan = {
    name: string;
    price: number;
    annualPrice: number;
    credits: number;
    imagesCount?: string;
    videosCount?: string;
    buttonText: string;
    buttonClass: string;
    planId: string | null;
    features: PlanLimit[];
  };

  const plans: PricingPlan[] = [
    {
      name: 'Basic',
      price: 25,
      annualPrice: 20,
      credits: 1500,
      imagesCount: '30',
      videosCount: '15',
      buttonText: 'Subscribe',
      buttonClass: 'bg-[#f4efe6] text-black hover:bg-white',
      planId: 'basic',
      features: [
        { icon: 'fa-image', text: 'High-definition image generation' },
        { icon: 'fa-wand-magic-sparkles', text: 'Veo 3.1 & Nano Banana Pro', tag: 'Included', tagColor: 'bg-white/[0.08] text-white/80 border border-white/15' },
        { icon: 'fa-cube', text: 'Full 3D Website Generation', tag: '2 sites', tagColor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
        { icon: 'fa-comments', text: 'Design-change chats: 20' },
        { icon: 'fa-calendar-day', text: 'Monthly credit refresh on your billing date' },
        { icon: 'fa-list-check', text: 'Queue unlimited tasks' },
        { icon: 'fa-bolt', text: 'Fast-track generation' },
        { icon: 'fa-film', text: '720p video generation' },
        { icon: 'fa-droplet-slash', text: 'Brand watermark removal' },
        { icon: 'fa-briefcase', text: 'Generated content is for commercial use' },
        { icon: 'fa-cloud-slash', text: noCloudSaveNote, finePrint: true },
      ]
    },
    {
      name: 'Basic Plus',
      price: 40,
      annualPrice: 32,
      credits: 2500,
      imagesCount: '50',
      videosCount: '25',
      buttonText: 'Subscribe',
      buttonClass: 'bg-[#e0e7ff] text-black hover:bg-blue-100',
      planId: 'basic-plus',
      features: [
        { icon: 'fa-image', text: 'High-definition image generation' },
        { icon: 'fa-wand-magic-sparkles', text: 'Veo 3.1 & Nano Banana Pro', tag: 'Included', tagColor: 'bg-white/[0.08] text-white/80 border border-white/15' },
        { icon: 'fa-cube', text: 'Full 3D Website Generation', tag: '4 sites', tagColor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
        { icon: 'fa-comments', text: 'Design-change chats: 35' },
        { icon: 'fa-calendar-day', text: 'Monthly credit refresh on your billing date' },
        { icon: 'fa-list-check', text: 'Queue unlimited tasks' },
        { icon: 'fa-bolt', text: 'Fast-track generation' },
        { icon: 'fa-film', text: '720p video generation' },
        { icon: 'fa-droplet-slash', text: 'Brand watermark removal' },
        { icon: 'fa-briefcase', text: 'Generated content is for commercial use' },
        { icon: 'fa-cloud-slash', text: noCloudSaveNote, finePrint: true },
      ]
    },
    {
      name: 'Pro',
      price: 60,
      annualPrice: 48,
      credits: 6000,
      imagesCount: '120',
      videosCount: '60',
      buttonText: 'Subscribe',
      buttonClass: 'bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/25',
      planId: 'pro',
      features: [
        { icon: 'fa-layer-group', text: 'All base models & LTX (where available)', tag: 'Studio', tagColor: 'bg-violet-500/20 text-violet-200 border border-violet-500/35' },
        { icon: 'fa-image', text: 'High-definition image generation' },
        { icon: 'fa-cube', text: 'Full 3D Website Generation', tag: '7 sites', tagColor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
        { icon: 'fa-comments', text: 'Design-change chats: 40' },
        { icon: 'fa-calendar-day', text: 'Monthly credit refresh on your billing date' },
        { icon: 'fa-list-check', text: 'Queue unlimited tasks' },
        { icon: 'fa-bolt', text: 'Fast-track generation' },
        { icon: 'fa-clapperboard', text: '1080p video generation' },
        { icon: 'fa-expand', text: 'Image upscaling' },
        { icon: 'fa-droplet-slash', text: 'Brand watermark removal' },
        { icon: 'fa-star', text: 'Priority access to new features' },
        { icon: 'fa-briefcase', text: 'Generated content is for commercial use' },
        { icon: 'fa-cloud-slash', text: noCloudSaveNote, finePrint: true },
      ]
    },
    {
      name: 'Premium',
      price: 200,
      annualPrice: 160,
      credits: 25000,
      imagesCount: '500',
      videosCount: '250',
      buttonText: 'Subscribe',
      buttonClass: 'bg-[#fef3c7] text-[#92400e] hover:bg-amber-200',
      planId: 'premium',
      features: [
        { icon: 'fa-cloud', text: 'Full cloud save: every 3D project in your account is backed up and kept while you stay subscribed (we are rolling out full persistence for all projects on this tier)' },
        { icon: 'fa-gem', text: 'Premium models (2K / 4K Studio where available)' },
        { icon: 'fa-image', text: 'High-definition image generation' },
        { icon: 'fa-cube', text: 'Full 3D Website Generation', tag: '30 sites', tagColor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
        { icon: 'fa-file-zipper', text: 'ZIP export', tag: 'Included', tagColor: 'bg-amber-500/15 text-amber-200 border border-amber-500/30' },
        { icon: 'fa-building', text: 'Business OS', tag: 'Included', tagColor: 'bg-amber-500/15 text-amber-200 border border-amber-500/30' },
        { icon: 'fa-comments', text: 'Design-change chats: 160' },
        { icon: 'fa-calendar-day', text: 'Monthly credit refresh on your billing date' },
        { icon: 'fa-list-check', text: 'Queue unlimited tasks' },
        { icon: 'fa-bolt', text: 'Fast-track generation' },
        { icon: 'fa-video', text: '4K video generation (plan limits apply)' },
        { icon: 'fa-expand', text: 'Image upscaling' },
        { icon: 'fa-droplet-slash', text: 'Brand watermark removal' },
        { icon: 'fa-star', text: 'Priority access to new features' },
        { icon: 'fa-flask', text: 'Beta features when available' },
        { icon: 'fa-briefcase', text: 'Generated content is for commercial use' },
      ]
    }
  ];

  const tierCardClass = (plan: PricingPlan) => {
    if (plan.planId === 'pro') {
      return 'relative flex flex-col rounded-xl p-5 border-2 border-violet-500/90 bg-gradient-to-b from-violet-950/45 via-[#12121a] to-[#121214] shadow-[0_0_40px_rgba(139,92,246,0.22)] ring-1 ring-violet-400/35';
    }
    switch (plan.name) {
      case 'Basic':
        return 'relative flex flex-col rounded-xl p-5 border border-zinc-500/40 bg-[#121214] shadow-xl';
      case 'Basic Plus':
        return 'relative flex flex-col rounded-xl p-5 border border-blue-500/45 bg-[#121214] shadow-xl';
      case 'Premium':
        return 'relative flex flex-col rounded-xl p-5 border border-amber-500/50 bg-[#121214] shadow-xl';
      default:
        return 'relative flex flex-col rounded-xl p-5 border border-white/[0.08] bg-[#121214] shadow-xl';
    }
  };

  const pipeline = [
    { num: '01', title: 'Describe', desc: 'Tell AI the website and visual style you want.', accent: 'text-violet-400', dot: 'bg-violet-400' },
    { num: '02', title: 'AI Generates Image', desc: 'Cinematic background created from your prompt.', accent: 'text-cyan-400', dot: 'bg-cyan-400' },
    { num: '03', title: 'Animate to Video', desc: 'Image becomes a smooth 8-second cinematic video.', accent: 'text-emerald-400', dot: 'bg-emerald-400' },
    { num: '04', title: 'Extract 400+ Frames', desc: 'Frames extracted for scroll-driven playback.', accent: 'text-amber-400', dot: 'bg-amber-400' },
    { num: '05', title: 'Download & Deploy', desc: 'Basic through Pro: projects stay in your browser (local storage) while you work. Premium: ZIP export, full cloud save for every project, and Business OS.', accent: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
  ];

  const faqs = [
    { q: 'What is a 3D website?', a: 'A scroll-driven animated website. AI generates a cinematic video, extracts hundreds of frames, and builds a website where scrolling plays the frames forward — creating a film-like 3D parallax effect. No WebGL, no Three.js, no code.' },
    { q: 'Why do Basic ($25), Basic Plus ($40), and Pro ($60) mention no cloud save?', a: 'On those plans we do not persist your work in the cloud; drafts and frames stay in your browser (local storage) so we are not hosting large frame sets for you. Premium ($200/mo) adds full cloud save for every project (rolling out), ZIP export, and Business OS.' },
    { q: 'What is Enterprise?', a: 'We design and build your 3D website for you. Custom branding, animations, and dedicated support. Contact us for a quote.' },
    { q: 'What happens when I run out of credits?', a: 'Credits reset every month on your billing date. Upgrade anytime for more.' },
    { q: 'When can I get ZIP export or Business OS?', a: 'Basic, Basic Plus, and Pro build in-app with local browser storage only. ZIP export, integrations, and Business OS are on Premium ($200/mo).' },
    { q: 'How does saving my 3D projects work?', a: 'Basic, Basic Plus, and Pro: no cloud project save—your session lives in this browser until you upgrade. Premium: we save every project in your account (full rollout in progress), with ZIP export and longer retention while you stay subscribed.' },
  ];

  return (
    <section id="pricing" className="relative py-20 md:py-32 px-4 md:px-6 scroll-mt-20 overflow-hidden bg-[#050508]">
      {!isMobile && <ThreeBackground />}
      {!isMobile && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
          <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
            <FloatingGems activeIndex={activeIndex} />
          </Canvas>
        </div>
      )}
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] md:w-[800px] md:h-[800px] rounded-full blur-[150px] md:blur-[200px] pointer-events-none" style={{ background: 'rgba(139,92,246,0.05)' }} />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] md:w-[700px] md:h-[700px] rounded-full blur-[150px] md:blur-[200px] pointer-events-none" style={{ background: 'rgba(52,211,153,0.04)' }} />

      <div className="max-w-[1900px] mx-auto relative z-10">

        {/* ── HEADER ── */}
        <div className="text-center mb-12 md:mb-20">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-300/80 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pricing
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-4xl md:text-5xl lg:text-[64px] font-bold text-white tracking-tight leading-[1.05]">
              Build 3D websites<br className="hidden md:block" /> with a single prompt
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-white/55 text-[15px] md:text-[17px] mt-6 max-w-2xl mx-auto leading-relaxed">
              Four paid tiers—no free tier: Basic ($25/mo), Basic Plus ($40/mo), Pro ($60/mo), and Premium ($200/mo). On Basic through Pro, nothing is kept in the cloud (see the small note at the bottom of each card). Premium adds full cloud save for every project (rolling out), ZIP export, and Business OS.
            </p>
          </Reveal>
        </div>

        {/* ── ANNUAL TOGGLE ── */}
        <Reveal delay={0.12} className="flex justify-center mb-10 md:mb-14">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-full p-1 flex items-center backdrop-blur-sm">
            <button onClick={() => setAnnual(false)} className={`px-6 md:px-8 py-2.5 rounded-full text-[12px] md:text-[13px] font-semibold transition-all duration-300 ${!annual ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white/60'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-6 md:px-8 py-2.5 rounded-full text-[12px] md:text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 ${annual ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white/60'}`}>
              Annual
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${annual ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>-20%</span>
            </button>
          </div>
        </Reveal>

        {/* ── FOUR PAID TIERS — Pro ($60) highlighted ── */}
        <div className="mb-16 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-[1500px] mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={tierCardClass(plan)}>
              {plan.planId === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full bg-violet-600 border border-violet-400/50 shadow-lg shadow-violet-900/50">
                    Most popular
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-medium text-white/90">{plan.name}</h3>
                {plan.planId === 'pro' ? (
                  <i className="fa-solid fa-crown text-violet-400 text-[14px]" aria-hidden />
                ) : plan.name === 'Premium' ? (
                  <i className="fa-solid fa-star text-amber-400/90 text-[13px]" aria-hidden />
                ) : null}
              </div>

              <div className="flex items-baseline mb-1">
                <span className="text-[14px] text-white/50 mr-1">$</span>
                <span className="text-[36px] font-bold text-white leading-none">
                  {annual ? plan.annualPrice : plan.price}
                </span>
                <span className="text-[12px] text-white/40 ml-1">/ Month</span>
              </div>

              <div className="text-[11px] text-white/45 mb-4 min-h-[2.5rem]">
                {annual ? (
                  <span>Billed annually (${plan.annualPrice}/mo). Switch to monthly for ${plan.price}/mo.</span>
                ) : (
                  <span>Monthly billing. Toggle annual above to save on yearly plans.</span>
                )}
              </div>

              <Link
                href="/contact"
                className={`w-full py-2.5 rounded-lg text-[13px] font-bold mb-2 transition-colors text-center block ${plan.buttonClass} opacity-80`}
              >
                Coming Soon — Contact Us
              </Link>

              <div className="mb-4 h-[12px]" />

              <div className="bg-[#1a1a1f] rounded-lg p-4 mb-5 border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fa-solid fa-crown text-[12px] ${plan.planId === 'premium' ? 'text-amber-400' : 'text-white/40'}`} />
                  <span className="text-[12px] font-medium text-white/90">{plan.credits.toLocaleString()} Credits per month</span>
                </div>
                <div className="text-[11px] text-white/40 mb-1">
                  As low as ${((annual ? plan.annualPrice : plan.price) / plan.credits * 100).toFixed(2)} per 100 Credits
                </div>
                <div className="text-[11px] text-white/60 font-medium">
                  {plan.imagesCount} images / {plan.videosCount} 720p videos
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 pb-4">
                {plan.features.map((f, i) =>
                  f.finePrint ? (
                    <li key={i} className="pt-2 mt-0.5 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] ${
                            plan.planId === 'pro' ? 'text-violet-300/70' : 'text-white/35'
                          }`}
                          aria-hidden
                        >
                          <i className={`fa-solid ${f.icon} text-[10px]`} />
                        </span>
                        <p className="text-[10px] leading-snug text-white/40 flex-1 min-w-0">{f.text}</p>
                      </div>
                    </li>
                  ) : (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] ${
                          plan.planId === 'pro' ? 'text-violet-300/90' : 'text-white/55'
                        }`}
                        aria-hidden
                      >
                        <i className={`fa-solid ${f.icon} text-[11px]`} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[12px] text-white/65 leading-snug">
                        <span>{f.text}</span>
                        {f.tag && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${f.tagColor}`}>{f.tag}</span>
                        )}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* ── ENTERPRISE / CUSTOM HORIZONTAL BAR ── */}
        <div className="mb-16 md:mb-20 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/15 to-[#0a0a14] shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
          <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-1 rounded-full bg-pink-500">Contact</span>
                <h3 className="text-[24px] md:text-[28px] font-bold text-white">Enterprise</h3>
              </div>
              <p className="text-white/60 text-[13px] md:text-[14px]">Custom 3D websites built for your brand by our team.</p>
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="text-left lg:text-right">
                <div className="text-[34px] md:text-[42px] font-bold text-white leading-none">Custom</div>
                <div className="text-[11px] text-white/40 mt-1">Quote on request</div>
              </div>
              <Link href="/contact" className="px-6 py-3 rounded-lg text-[13px] font-bold bg-pink-500 text-white inline-flex items-center gap-2">
                Contact Us
                <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS — 5-step pipeline ── */}
        <Reveal className="mb-16 md:mb-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-violet-300/80 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              How It Works
            </span>
            <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tight">From prompt to 3D website in 5 steps</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
            {pipeline.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.08}>
                <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 md:p-6 h-full hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 group">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot} mb-4 group-hover:shadow-[0_0_12px] transition-shadow`} style={{ boxShadow: 'none' }} />
                  <span className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-widest">{s.num}</span>
                  <h4 className={`text-[15px] font-bold text-white mt-1 mb-2 ${s.accent}`}>{s.title}</h4>
                  <p className="text-[12px] md:text-[13px] text-white/45 leading-relaxed">{s.desc}</p>
                  {i < 4 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.08] items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/25"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* ── PLAN COMPARISON TABLE ── */}
        <Reveal className="mb-16 md:mb-24">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden backdrop-blur-sm">
            <div className="px-5 md:px-8 py-6 border-b border-white/[0.06]">
              <h4 className="text-[18px] md:text-[20px] font-bold text-white">Compare plans</h4>
              <p className="text-[13px] text-white/40 mt-1">Everything scales as you grow.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 md:px-8 py-4 text-white/45 font-semibold text-[12px] uppercase tracking-wider">Feature</th>
                    <th className="text-center px-3 py-4 text-slate-400 font-bold">Basic<br /><span className="text-[10px] font-normal text-white/30">$25/mo</span></th>
                    <th className="text-center px-3 py-4 text-blue-400 font-bold">Basic Plus<br /><span className="text-[10px] font-normal text-white/30">$40/mo</span></th>
                    <th className="text-center px-3 py-4 text-violet-400 font-bold">Pro<br /><span className="text-[10px] font-normal text-white/30">$60/mo</span></th>
                    <th className="text-center px-3 py-4 text-amber-400 font-bold">Premium<br /><span className="text-[10px] font-normal text-white/30">$200/mo</span></th>
                    <th className="text-center px-3 py-4 text-pink-400 font-bold">Enterprise<br /><span className="text-[10px] font-normal text-white/30">Custom</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { f: 'Cloud save (3D projects)', v: ['✗', '✗', '✗', '✓', '✓'] },
                    { f: 'Download from builder', v: ['✓', '✓', '✓', '✓', '✓'] },
                    { f: '3D sites / mo', v: ['2', '4', '7', '30', 'Custom'] },
                    { f: 'Design-change chats', v: ['20', '35', '40', '160', 'Dedicated'] },
                    { f: 'Monthly credits', v: ['1,500', '2,500', '6,000', '25,000', '—'] },
                    { f: '2K & 4K Studio', v: ['✗', '✗', '✓', '✓', '✓'] },
                    { f: 'ZIP export & Business OS', v: ['✗', '✗', '✗', '✓', '✓'] },
                    { f: 'Priority support', v: ['—', '—', '✓', '✓', '✓'] },
                  ].map((row) => (
                    <tr key={row.f} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-5 md:px-8 py-3.5 text-white/70 font-medium">{row.f}</td>
                      {row.v.map((val, j) => (
                        <td key={j} className={`text-center px-3 py-3.5 font-mono ${
                          val === '✓'
                            ? 'text-emerald-400 font-bold'
                            : val === '✗'
                              ? 'text-rose-400'
                              : val === '—'
                                ? 'text-white/15'
                                : j === 0
                                  ? 'text-slate-300/90 font-semibold'
                                  : j === 1
                                    ? 'text-blue-300/90 font-semibold'
                                    : j === 2
                                      ? 'text-violet-300/90 font-semibold'
                                      : j === 3
                                        ? 'text-amber-400/90 font-semibold'
                                        : 'text-pink-400/90'
                        }`}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* ── CTA ── */}
        <Reveal className="mb-16 md:mb-24">
          <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.06] via-transparent to-cyan-500/[0.06] p-8 md:p-14 text-center">
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">Your next website starts with a prompt</h3>
            <p className="text-white/50 text-[14px] md:text-[16px] max-w-xl mx-auto mb-8">
              Stop paying designers $5,000 for a hero section. Describe what you want, and Draftly builds a scroll-driven 3D website in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/3d-builder" className="px-8 md:px-10 py-4 rounded-full text-[14px] md:text-[15px] font-semibold bg-white text-black hover:bg-white/90 transition-all shadow-[0_2px_20px_rgba(255,255,255,0.15)] inline-flex items-center gap-2.5">
                <i className="fa-solid fa-cube text-[12px]" />
                Start Building
                <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── FAQ ── */}
        <Reveal className="max-w-2xl mx-auto">
          <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-8">Frequently asked questions</h3>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all duration-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 md:px-6 py-4 text-left group">
                  <span className="text-white/70 text-[14px] font-medium group-hover:text-white/90 transition-colors pr-4">{f.q}</span>
                  <motion.i animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }} className="fa-solid fa-chevron-down text-white/20 text-[10px] flex-shrink-0" />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                      <div className="px-5 md:px-6 pb-5">
                        <div className="h-px bg-white/[0.05] mb-4" />
                        <p className="text-white/50 text-[14px] leading-relaxed">{f.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}