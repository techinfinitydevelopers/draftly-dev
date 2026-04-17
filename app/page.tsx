'use client';

import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import WebsiteTemplatesSection from '@/components/landing/WebsiteTemplatesSection';
import BestPreviewsSection from '@/components/landing/BestPreviewsSection';
import { BUILDER_DEFAULT_MODEL } from '@/lib/builder-models';
import { useAuth } from '@/hooks/useAuth';
import { Terminal, Image as ImageIcon, Video, Layers, Download, Play, Wand2, Sparkles, Zap, Maximize, Clock, FileCode2, MessagesSquare, Box, Code2, ArrowRight } from 'lucide-react';
import {
  BUILDER_FIXED_IMAGE_MODEL_ID,
  BUILDER_FIXED_VIDEO_MODEL_ID,
  type BuilderImageResolutionTier,
  type BuilderVideoQuality,
} from '@/lib/builder-display-models';
import { BuilderModelPickerRow } from '@/components/builder/ModelPickerRows';

const Chat3DEffect = dynamic(() => import('@/components/landing/Chat3DEffect'), { ssr: false });

// ===== REVEAL — fade/blur in on scroll =====
function Reveal({ children, delay = 0, className = '', direction = 'up' }: { children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right' | 'scale' | 'none' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const initial = direction === 'left'
    ? { opacity: 0, x: -50, filter: 'blur(8px)' }
    : direction === 'right'
      ? { opacity: 0, x: 50, filter: 'blur(8px)' }
      : direction === 'scale'
        ? { opacity: 0, scale: 0.8, filter: 'blur(12px)' }
        : direction === 'none'
          ? { opacity: 0, filter: 'blur(6px)' }
          : { opacity: 0, y: 40, filter: 'blur(8px)' };
  const animate = direction === 'left' || direction === 'right'
    ? { opacity: 1, x: 0, filter: 'blur(0px)' }
    : direction === 'scale'
      ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
      : direction === 'none'
        ? { opacity: 1, filter: 'blur(0px)' }
        : { opacity: 1, y: 0, filter: 'blur(0px)' };
  return (
    <motion.div ref={ref}
      initial={initial}
      animate={inView ? animate : {}}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94], type: 'spring', stiffness: 80, damping: 20, mass: 0.8 }}
      className={className}>
      {children}
    </motion.div>
  );
}

function ScrollFloat({ children, className = '', offset = 30 }: { children: React.ReactNode; className?: string; offset?: number }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionGlow({ color = 'rgba(99,102,241,0.04)', position = 'top-left' }: { color?: string; position?: string }) {
  const pos = position === 'top-left' ? 'top-0 left-0'
    : position === 'top-right' ? 'top-0 right-0'
      : position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        : position === 'bottom-right' ? 'bottom-0 right-0'
          : 'top-0 left-0';
  return (
    <div className={`absolute ${pos} w-[400px] h-[400px] md:w-[700px] md:h-[700px] rounded-full blur-[120px] md:blur-[180px] pointer-events-none`} style={{ background: color }} />
  );
}

function Divider() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}} transition={{ duration: 0.8 }}
      className="divider max-w-[1200px] mx-auto origin-center relative z-10" />
  );
}

// ===== HERO CHAT INPUT — glass panel, linked to 3D builder =====
function HeroChatInput() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [websiteModelId, setWebsiteModelId] = useState(BUILDER_DEFAULT_MODEL);
  const [imageModelId, setImageModelId] = useState(BUILDER_FIXED_IMAGE_MODEL_ID);
  const [imageResolution, setImageResolution] = useState<BuilderImageResolutionTier>('1K');
  const [videoQuality, setVideoQuality] = useState<BuilderVideoQuality>('720p');
  const [videoModelId, setVideoModelId] = useState(BUILDER_FIXED_VIDEO_MODEL_ID);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // 3D Tilt state
  const chatRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['4deg', '-4deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-4deg', '4deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chatRef.current) return;
    const rect = chatRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const onPickImage = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onImageModelChange = useCallback((id: string) => {
    setImageModelId(id);
    setImageResolution('1K');
  }, []);

  const onVideoModelChange = useCallback((id: string) => {
    setVideoModelId(id);
  }, []);

  const onSend = useCallback(() => {
    if (!prompt.trim() && !imageFile) return;
    const params = new URLSearchParams();
    if (prompt.trim()) params.set('prompt', prompt.trim());
    params.set('siteModel', websiteModelId);
    params.set('imageModel', imageModelId);
    params.set('imageRes', imageResolution);
    params.set('videoRes', videoQuality);
    params.set('videoModel', videoModelId);
    router.push(`/3d-builder?${params.toString()}`);
  }, [
    prompt,
    imageFile,
    router,
    websiteModelId,
    imageModelId,
    imageResolution,
    videoQuality,
    videoModelId,
  ]);

  const toggleMic = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .map((r: any) => r[0].transcript)
        .join('');
      setPrompt(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const suggestions = [
    'SaaS landing page with dark mode',
    'Luxury fashion e-commerce',
    'Creative agency portfolio',
    'AI startup homepage',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[min(100vw-1rem,640px)] px-2 sm:px-3 relative perspective-[1200px]"
    >
      <motion.div
        ref={chatRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-xl bg-[#0a0a14]/80 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_32px_rgba(255,255,255,0.04)] border border-white/[0.1] overflow-hidden group"
      >
        <Chat3DEffect />
        
        {/* Animated glowing border effect */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)] opacity-30"
          />
        </div>

        <div className="absolute inset-[1px] bg-[#0a0a14]/90 rounded-[15px] z-0 pointer-events-none" />

        <div className="relative z-10 pointer-events-auto" style={{ transform: 'translateZ(30px)' }}>
          {/* Top: title */}
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-2 pb-1.5 border-b border-white/[0.06]">
            <span
              className="flex items-center gap-2 text-white/45"
              title="3D Website Builder — describe your site below"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" aria-hidden />
              <i className="fa-solid fa-cube text-[13px]" aria-hidden />
              <span className="sr-only">3D Website Builder</span>
            </span>
            <span className="text-[9px] text-white/25 hidden sm:inline" aria-hidden>
              <i className="fa-solid fa-sliders" title="Models: use the icons under the prompt" />
            </span>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { onPickImage(e.target.files); e.currentTarget.value = ''; }} />

          {/* Primary row */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2">
            {imagePreview && (
              <div className="relative group flex-shrink-0">
                <img src={imagePreview} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover ring-1 ring-white/20 shadow-lg" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow-lg transition-colors"
                >
                  ×
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all flex items-center justify-center flex-shrink-0 shadow-inner"
              title="Add reference image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </button>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSend()}
              placeholder="Describe your website…"
              title="Describe the website you want to build"
              className="flex-1 min-w-0 bg-transparent text-[13px] sm:text-[14px] text-white placeholder:text-white/40 outline-none py-1 font-medium"
            />
            <button
              type="button"
              onClick={toggleMic}
              className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${listening ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15]'}`}
              title={listening ? 'Stop listening' : 'Voice input'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={!prompt.trim() && !imageFile}
              title="Build — open 3D builder"
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg font-bold transition-all duration-300 flex items-center justify-center flex-shrink-0 relative group/btn ${
                prompt.trim() || imageFile
                  ? 'bg-white text-black hover:scale-[1.04] shadow-[0_0_16px_rgba(255,255,255,0.18)]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <svg className="relative z-10 group-hover/btn:translate-x-0.5 transition-transform" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span className="sr-only">Build</span>
              {(prompt.trim() || imageFile) && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400 opacity-0 group-hover/btn:opacity-10 transition-opacity z-0 rounded-lg" />
              )}
            </button>
          </div>

          {/* Model picker — icon toolbar */}
          <div className="px-3 sm:px-4 pb-2 pt-0.5 border-t border-white/[0.04]">
            <BuilderModelPickerRow
              websiteModelId={websiteModelId}
              onWebsite={setWebsiteModelId}
              imageModelId={imageModelId}
              onImageModel={onImageModelChange}
              imageResolution={imageResolution}
              onImageResolution={setImageResolution}
              videoModelId={videoModelId}
              onVideoModel={onVideoModelChange}
              videoQuality={videoQuality}
              onVideoQuality={setVideoQuality}
              disabled={false}
              compact
              variant="hero"
              iconToolbar
            />
          </div>

          {/* Suggestions */}
          <div className="px-3 sm:px-4 pb-2.5 overflow-x-auto scrollbar-none border-t border-white/[0.04] pt-2">
            <div className="flex flex-row flex-nowrap gap-1.5 min-w-min">
              {suggestions.map(s => (
                <button
                  type="button"
                  key={s}
                  title={s}
                  onClick={() => setPrompt(s)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium text-white/50 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:text-white/90 hover:bg-white/[0.06] transition-all whitespace-nowrap shadow-sm max-w-[200px] truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function useHeroVariant() {
  const [variant, setVariant] = useState<'mobile' | 'desktop' | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)'); // tailwind `md`
    const update = () => setVariant(mq.matches ? 'desktop' : 'mobile');
    update();

    // Safari fallback
    // eslint-disable-next-line deprecation/deprecation
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', update);
    // eslint-disable-next-line deprecation/deprecation
    else mq.addListener(update);

    return () => {
      // eslint-disable-next-line deprecation/deprecation
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', update);
      // eslint-disable-next-line deprecation/deprecation
      else mq.removeListener(update);
    };
  }, []);

  return variant;
}

const HERO_BG_VIDEO = '/draftly-pc-hero.mp4';

// ===== MOBILE HERO — video bg with chat + CTA for phones =====
function MobileHero({ enabled }: { enabled: boolean }) {
  return (
    <section className="relative md:hidden overflow-hidden bg-black" style={{ zIndex: 10, minHeight: '100svh' }}>
      {/* Mobile hero background video — fills the screen */}
      {enabled && (
        <video
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={HERO_BG_VIDEO} type="video/mp4" />
        </video>
      )}

      {/* Chat + CTA — positioned at the bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-5 pt-8 flex flex-col items-center gap-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)' }}>
        {/* Chat input — mobile version */}
        <HeroChatInput />

        {/* CTA buttons */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 w-full max-w-[400px]"
        >
          <Link
            href="/3d-builder"
            className="flex-1 px-4 py-3 rounded-full text-[13px] font-semibold bg-white text-black inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_2px_20px_rgba(255,255,255,0.15)]"
          >
            <i className="fa-solid fa-cube text-[10px]" />
            3D Builder
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const heroVariant = useHeroVariant();
  const heroRef = useRef(null);

  const handleGlobalClick = (e: React.MouseEvent) => {
    // If not authenticated, send people through onboarding (plan fit + sign-in), not straight to Google.
    // Exception: /3d-builder links go to the builder (sign-in gate there). Onboarding uses WebGL; broken GPU drivers
    // can show a black screen, so do not force that path for the main builder CTA.
    if (!user) {
      const target = e.target as HTMLElement;
      if (target.closest('nav') || target.closest('header')) return;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        if (href === '/3d-builder' || href.startsWith('/3d-builder?')) return;
      }
      if (target.closest('button') || anchor) {
        e.preventDefault();
        e.stopPropagation();
        router.push('/onboarding');
      }
    }
  };

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // Desktop hero: subtle Ken Burns zoom + parallax + fade on scroll
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div className="min-h-screen bg-[#050508] relative overflow-x-hidden" onClickCapture={handleGlobalClick}>
      <Header />

      {/* ===========================================================
          HERO — DESKTOP: Full-screen background video + parallax
          MOBILE: Replaced with MobileHero (vertical node flow)
          =========================================================== */}

      {/* Desktop hero — hidden on mobile, z-index above all fixed overlays */}
      <section ref={heroRef} className="relative h-screen !overflow-hidden hidden md:block" style={{ zIndex: 10, isolation: 'isolate' }}>
        {heroVariant === 'desktop' && (
          <motion.div
            style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
            className="absolute inset-0"
          >
            {/* Desktop hero background video */}
            <video
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source src={HERO_BG_VIDEO} type="video/mp4" />
            </video>
          </motion.div>
        )}

        {/* No gradient overlay — hero video stays completely clean */}

        {/* Chat + CTA buttons — positioned lower to show airplane animation */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-[12vh]" style={{ zIndex: 20 }}>
          {/* Chat input — center of hero */}
          <HeroChatInput />

          {/* CTA buttons — below the chat */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4 mt-5"
          >
            <Link
              href="/3d-builder"
              className="group relative px-10 py-4 rounded-full text-[15px] font-semibold tracking-[-0.01em] bg-white text-black hover:bg-white/95 transition-all duration-500 inline-flex items-center gap-3 shadow-[0_2px_20px_rgba(255,255,255,0.15),0_0_80px_rgba(255,255,255,0.06)] hover:shadow-[0_4px_40px_rgba(255,255,255,0.25),0_0_120px_rgba(255,255,255,0.1)]"
            >
              <i className="fa-solid fa-cube text-[13px] relative z-10 group-hover:rotate-12 transition-transform duration-300" />
              <span className="relative z-10">3D Website Builder</span>
              <i className="fa-solid fa-arrow-right text-[13px] relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ zIndex: 20 }}
        >
          <span className="text-white/25 text-[10px] font-mono tracking-widest uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <i className="fa-solid fa-chevron-down text-white/20 text-xs" />
          </motion.div>
        </motion.div>
      </section>

      {/* Mobile hero — shown only on mobile */}
      <MobileHero enabled={heroVariant === 'mobile'} />

      {/* ── Premium wrapper — covers everything AFTER the hero ── */}
      <div className="relative overflow-hidden bg-[#050508]">
        {/* Animated background gradients for a "million-dollar SaaS" look */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-400/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue-500/10 blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-30"
          style={{
            backgroundSize: '100px 100px',
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
          }}
        />
        {/* Soft noise grain */}
        <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox=%220 0 512 512%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')`,
          }}
        />

        {/* ===========================================================
          SECTION 2 — BEST PREVIEWS (live demo sites)
          =========================================================== */}
        <BestPreviewsSection />

        {/* ===========================================================
          SECTION 3 — 3D WEBSITE TEMPLATES
          =========================================================== */}
        <WebsiteTemplatesSection />

        <Divider />

        {/* ===========================================================
          SECTION 4 — HOW THE 3D BUILDER WORKS (5-step pipeline)
          =========================================================== */}
        <section id="features" className="relative z-10 py-24 md:py-32 scroll-mt-20 overflow-hidden">
          <SectionGlow color="rgba(59,130,246,0.08)" position="center" />
          <div className="max-w-[1400px] mx-auto px-5 md:px-6 relative z-10">
            <Reveal className="text-center mb-16 md:mb-24">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-blue-400 mb-4 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" /> The Pipeline
              </span>
              <h2 className="font-display text-4xl md:text-6xl lg:text-[72px] font-bold text-white tracking-tight leading-[1.05] mb-6">
                From prompt to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">production</span>
              </h2>
              <p className="text-white/60 text-[16px] md:text-[18px] max-w-2xl mx-auto leading-relaxed">
                Describe it. Watch AI build it. Every scroll frame is generated from your prompt — no code, no templates, no design skills needed.
              </p>
            </Reveal>

            {/* Stepper Grid - 5 Steps styled luxuriously */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-4 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent -translate-y-1/2 z-0" />
              
              {[
                { num: '01', title: 'Describe', desc: 'Tell us the visual atmosphere you want.', icon: Terminal, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/30' },
                { num: '02', title: 'Generate', desc: 'AI creates a cinematic keyframe.', icon: ImageIcon, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/30' },
                { num: '03', title: 'Animate', desc: 'The image becomes a smooth 8s video.', icon: Video, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/30' },
                { num: '04', title: 'Build', desc: 'AI extracts frames for a 3D scroll.', icon: Layers, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/30' },
                { num: '05', title: 'Deploy', desc: 'Download a ZIP with HTML, CSS, JS.', icon: Download, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/30' },
              ].map((s, i) => (
                <Reveal key={s.num} delay={i * 0.1} className="relative z-10">
                  <div className={`relative bg-white/[0.02] rounded-3xl border border-white/[0.04] p-6 md:p-8 h-full group ${s.bgHover} ${s.borderHover} hover:-translate-y-1 transition-all duration-500 backdrop-blur-md shadow-2xl`}>
                    <div className="relative z-10 flex flex-col h-full items-center text-center">
                      <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 text-white/40 group-hover:${s.color} transition-colors duration-500 shadow-inner group-hover:scale-110`}>
                        <s.icon className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-white/30 uppercase tracking-widest mb-3">{s.num}</span>
                      <h3 className="text-white/90 font-semibold text-[18px] mb-3 tracking-tight">{s.title}</h3>
                      <p className="text-white/50 text-[14px] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ===========================================================
          SECTION 5 — SCROLL-DRIVEN 3D EXPERIENCE (visual showcase)
          =========================================================== */}
        <section className="relative z-10 py-24 md:py-32 overflow-hidden">
          <SectionGlow color="rgba(59,130,246,0.1)" position="top-right" />

          <div className="max-w-[1400px] mx-auto px-5 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <ScrollFloat offset={20}>
                <Reveal direction="left">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-blue-400 mb-4 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                    <Wand2 className="w-3.5 h-3.5" /> Zero Code
                  </span>
                  <h2 className="font-display text-4xl md:text-5xl lg:text-[56px] font-bold text-white tracking-tight leading-[1.05] mb-6">
                    Your video becomes<br className="hidden md:block" />a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200">scroll experience</span>
                  </h2>
                  <div className="space-y-6 text-white/60 text-[16px] md:text-[18px] leading-relaxed mb-10">
                    <p>
                      AI generates a cinematic video, then extracts hundreds of frames. As visitors scroll,
                      the frames play forward — creating a 3D parallax effect that feels like a film.
                    </p>
                    <p>
                      No WebGL, no Three.js, no code — just native browser scroll with buttery-smooth frame interpolation.
                      Works perfectly on every device and browser.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/3d-builder" className="group relative px-8 py-4 rounded-full text-[14px] font-bold bg-white text-black hover:bg-white/90 transition-all duration-300 flex items-center gap-3">
                      Try the Builder
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </Reveal>
              </ScrollFloat>

              <ScrollFloat offset={15}>
                <Reveal delay={0.15} direction="right">
                  <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-[0_20px_60px_rgba(59,130,246,0.1)] p-2 group hover:border-blue-500/30 transition-colors duration-500 backdrop-blur-md">
                    {/* macOS Window dots */}
                    <div className="absolute top-5 left-5 flex gap-2 z-20">
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                    </div>

                    <div className="rounded-2xl overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-blue-500/10 z-10 pointer-events-none mix-blend-overlay" />
                      
                      <div className="relative aspect-[4/3] bg-gradient-to-b from-[#0a0a14] to-[#050508] flex items-center justify-center overflow-hidden">
                        
                        {/* Fake 3D Scroll Visualization */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20">
                          <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-12 h-20 rounded-full border-2 border-blue-500/30 flex items-start justify-center p-2 backdrop-blur-sm bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                          >
                            <motion.div
                              animate={{ height: [8, 24, 8], opacity: [1, 0.4, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                              className="w-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                          </motion.div>
                          <span className="text-[12px] font-mono uppercase tracking-[0.4em] text-blue-300 font-bold drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Scroll to animate</span>
                        </div>

                        {/* Abstract Background grid */}
                        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                        {/* Frame extraction UI */}
                        <div className="absolute bottom-6 left-6 right-6 z-20">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-mono text-blue-400 font-bold tracking-widest uppercase">Extracting Frames</span>
                            <span className="text-[11px] font-mono text-blue-400/50">400 / 400</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div
                              animate={{ x: ['-100%', '0%', '0%', '-100%'] }}
                              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.4, 0.8, 1] }}
                              className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 w-full"
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </Reveal>
              </ScrollFloat>
            </div>
          </div>
        </section>

        <Divider />

        {/* ===========================================================
          SECTION 6 — ADVANCED FEATURES (Bento Grid)
          =========================================================== */}
        <section className="relative z-10 py-24 md:py-32 overflow-hidden">
          <SectionGlow color="rgba(59,130,246,0.08)" position="center" />

          <div className="max-w-[1400px] mx-auto px-5 md:px-6">
            <ScrollFloat offset={15}>
              <Reveal className="text-center mb-16 md:mb-24">
                <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-blue-400 mb-4 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                  <Box className="w-3.5 h-3.5" /> Pro Tools
                </span>
                <h2 className="font-display text-4xl md:text-6xl lg:text-[72px] font-bold text-white tracking-tight leading-[1.05] mb-6">
                  Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">serious websites</span>
                </h2>
                <p className="text-white/60 text-[16px] md:text-[18px] max-w-2xl mx-auto leading-relaxed">
                  Chain videos, upload product images, customize every element, and download production-ready code.
                </p>
              </Reveal>
            </ScrollFloat>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { colSpan: 'md:col-span-2', title: 'Multi-Video Continuation', desc: 'Chain multiple videos end-to-end for longer scroll animations. First frame of each picks up perfectly from the last.', icon: Layers, color: 'text-blue-400', gradient: 'from-blue-500/10', borderHover: 'hover:border-blue-500/30' },
                { colSpan: 'md:col-span-1', title: 'Full-Stack Export', desc: 'Download a ZIP with frontend + backend starter. Includes Express API.', icon: FileCode2, color: 'text-blue-400', gradient: 'from-blue-500/10', borderHover: 'hover:border-blue-500/30' },
                { colSpan: 'md:col-span-1', title: 'Iterative Chat Editing', desc: 'Chat with AI to change copy, move sections, adjust colors — live.', icon: MessagesSquare, color: 'text-blue-400', gradient: 'from-blue-500/10', borderHover: 'hover:border-blue-500/30' },
                { colSpan: 'md:col-span-1', title: 'Product Injection', desc: 'Upload product photos and tell AI where to place them directly in 3D.', icon: Box, color: 'text-blue-400', gradient: 'from-blue-500/10', borderHover: 'hover:border-blue-500/30' },
                { colSpan: 'md:col-span-1', title: 'Adjustable FPS', desc: 'Slide between 10–40 FPS to control frame density and scroll speed.', icon: Clock, color: 'text-blue-400', gradient: 'from-blue-500/10', borderHover: 'hover:border-blue-500/30' },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 0.1} className={`${f.colSpan} relative`}>
                  <div className={`relative overflow-hidden rounded-3xl border border-white/[0.04] bg-white/[0.02] p-8 md:p-10 h-full group ${f.borderHover} hover:bg-white/[0.03] transition-all duration-500 backdrop-blur-md shadow-2xl`}>
                    <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${f.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner flex items-center justify-center mb-16 text-white/40 group-hover:${f.color} transition-colors duration-500 group-hover:scale-110`}>
                        <f.icon className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-white/90 font-semibold text-[20px] md:text-[24px] tracking-tight mb-3">{f.title}</h3>
                        <p className="text-white/50 text-[14px] md:text-[15px] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ===========================================================
          SECTION 7 — STATS + CTA
          =========================================================== */}
        <section className="relative z-10 py-24 md:py-40 overflow-hidden">
          <SectionGlow color="rgba(59,130,246,0.08)" position="center" />
          
          <div className="max-w-[1400px] mx-auto px-5 md:px-6 relative z-10">
            <div className="rounded-[40px] border border-white/[0.06] bg-white/[0.02] p-8 md:p-16 lg:p-24 overflow-hidden relative backdrop-blur-md shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
              
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-500/20 via-blue-400/10 to-transparent blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
                <ScrollFloat offset={25}>
                  <Reveal direction="left">
                    <h2 className="font-display text-4xl md:text-5xl lg:text-[64px] font-bold text-white tracking-tight leading-[1.05] mb-6">
                      Build 3D websites<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">10x faster</span> with AI
                    </h2>
                    <p className="text-white/60 text-[16px] md:text-[18px] leading-relaxed mb-10 max-w-lg">
                      Describe what you want once. Draftly generates cinematic motion, extracts frames, and builds a
                      scroll-driven 3D website in minutes — not days. Download the ZIP and ship.
                    </p>
                    <div className="flex flex-wrap gap-4 items-center">
                      <Link href="/3d-builder" className="group relative px-8 py-4 rounded-full text-[14px] font-bold bg-white text-black hover:bg-white/90 transition-all duration-300 flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        Start Building Free
                      </Link>
                      <Link href="/pricing" className="px-8 py-4 rounded-full text-[14px] font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        View Pricing
                      </Link>
                    </div>
                  </Reveal>
                </ScrollFloat>

                <ScrollFloat offset={20}>
                  <Reveal direction="right">
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      {[
                        { val: '400+', label: 'Frames per Site', icon: Layers, color: 'text-blue-400', borderHover: 'hover:border-blue-500/30' },
                        { val: '~8s', label: 'Video Duration', icon: Video, color: 'text-blue-400', borderHover: 'hover:border-blue-500/30' },
                        { val: '10–40', label: 'Adjustable FPS', icon: Clock, color: 'text-blue-400', borderHover: 'hover:border-blue-500/30' },
                        { val: 'ZIP', label: 'Ready to Deploy', icon: Code2, color: 'text-blue-400', borderHover: 'hover:border-blue-500/30' },
                      ].map((s, i) => (
                        <Reveal key={s.label} delay={0.1 * i} direction="scale">
                          <div className={`bg-white/[0.02] border border-white/[0.04] rounded-3xl p-6 md:p-8 flex flex-col justify-center items-start group hover:bg-white/[0.04] ${s.borderHover} transition-all duration-300 shadow-inner hover:-translate-y-1`}>
                            <s.icon className={`w-6 h-6 text-white/40 mb-4 group-hover:${s.color} transition-colors duration-300 group-hover:scale-110`} strokeWidth={1.5} />
                            <div className="font-display text-3xl md:text-4xl font-bold text-white/90 tracking-tight mb-2">{s.val}</div>
                            <div className="text-white/50 text-[13px] font-medium">{s.label}</div>
                          </div>
                        </Reveal>
                      ))}
                    </div>
                  </Reveal>
                </ScrollFloat>
              </div>
            </div>
          </div>
        </section>

        <Divider />

      </div>{/* ── End grunge-textured wrapper ── */}

      <Footer />
    </div>
  );
}
