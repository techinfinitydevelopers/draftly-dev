'use client';

import { Suspense, useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import JSZip from 'jszip';
import { useSubscription } from '@/hooks/useSubscription';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import {
  saveProjectToFirebase,
  loadProjectFromFirebase,
  listProjectsFromFirebase,
} from '@/lib/firebase-3d-projects';
import { logger } from '@/lib/logger';
import { planKeepsAllCloudProjects, planCloudProjectLimit, PLAN_LIMITS } from '@/lib/subscription-plans';
import {
  BUILDER_FIXED_IMAGE_MODEL_ID,
  BUILDER_FIXED_VIDEO_MODEL_ID,
  BUILDER_FIXED_WEBSITE_MODEL_ID,
  getWebsiteDisplayModelById,
  type BuilderImageResolutionTier,
  type BuilderVideoQuality,
} from '@/lib/builder-display-models';
import { canUseBuilderVeoMotion } from '@/lib/model-router';
import { BuilderVideoFrame } from '@/components/builder/BuilderVideoFrame';
import { CreditTracker, CreditWarning } from '@/components/credit-tracker/CreditTracker';
import { BusinessCenter } from '@/components/business-center';
import { BUILDER_PROMPT_MAX_CHARS_EXTENDED, getMaxPromptCharsForPlan } from '@/lib/builder-prompt-limits';
import { FULL_APP_HANDOFF_STORAGE_KEY, type FullAppHandoffPayload } from '@/lib/full-app-handoff';
import { is3DCloudSaveDisabled } from '@/lib/builder-cloud-save-flag';
import { buildBuilderPreviewHtml } from '@/lib/builder-preview-html';
import { BUILDER_GRAPHICS_STACK_LABELS } from '@/lib/builder-graphics-stack-prompt';
import { buildSiteIterationPrompt } from '@/lib/builder-site-iteration-prompt';
import { detectIntegrationChatIntent } from '@/lib/integrations/chat-intent';
import { getIntegrationDefinition } from '@/lib/integrations/registry';
import IntegrationChatBubble from '@/components/integrations/IntegrationChatBubble';
import BuilderIntegrationBar from '@/components/integrations/BuilderIntegrationBar';
import InfoTip from '@/components/ui/InfoTip';
import GuideChatWidget from '@/components/guide-chat/GuideChatWidget';
import { planCanExportZip } from '@/lib/plan-entitlements';
import { detectIntent } from '@/lib/prompt-segmentation';
import { BuilderTutorial } from '@/components/tutorial/BuilderTutorial';
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
  safeSessionStorageRemoveItem,
  safeSessionStorageSetItem,
} from '@/lib/safe-web-storage';

declare global {
  interface Window {
    __DRAFTLY_PREVIEW_FRAMES?: string[];
    __DRAFTLY_PREVIEW_VIDEO?: string | null;
    __DRAFTLY_PREVIEW_USER_ASSETS?: Record<string, string>;
  }
}

// ─── Types ───────────────────────────────────────────────────────
interface ChatMsg {
  role: 'user' | 'assistant' | 'system';
  text: string;
  imageUrl?: string;
  videoSrc?: string;
  videoFallbackSrc?: string;
  ts: number;
  /** Chat-driven integration wizard / suggestions */
  integrationHint?: { kind: 'connect' | 'suggest'; integrationIds: string[] };
}

interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sitePrompt: string;
  bgPrompt: string;
  bgImageUrl: string | null;
  siteCode: string | null;
  renderMode: 'frame-scroll' | 'video-hero';
  buildTarget: 'desktop' | 'mobile';
  messages: ChatMsg[];
  uploadedImages: UploadedImage[];
  /** Persisted so Preview works when reopening the project */
  webpFrames?: string[];
  videoBase64?: string | null;
  videoChain?: string[];
  /** All generated still URLs (background + last-frame passes, etc.) for gallery + download */
  generatedImageUrls?: string[];
  /** When set, project assets are in Firebase Storage; load on demand */
  siteCodePath?: string;
  framesPath?: string;
  videoPath?: string;
  videoChainPaths?: string[];
  uploadedImagesPaths?: { id: string; name: string; path: string }[];
}

interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
}

/** Legacy default if callers omit target; real builds use {@link computeScrollFrameCount}. */
const FRAME_EXTRACTION_TARGET = 160;

/**
 * Cap scroll-sync frames (each clip contributes duration × FPS; multi-clip totals add up).
 * Very large counts increase preview HTML size and decode time — fullscreen preview uses a staged load after build.
 */
const MAX_SCROLL_FRAMES = 2000;
/** Seconds of idle hold in fullscreen before the 0–100% decode progress bar runs. */
const FULL_PREVIEW_HOLD_MS = 10_000;
const MIN_SCROLL_FRAMES = 36;

/** Frames for one video clip at the chosen extraction FPS (clamped). */
function computeScrollFrameCount(videoDurationSec: number, extractionFps: number): number {
  const raw = Math.round(Math.max(0.5, videoDurationSec) * extractionFps);
  return Math.min(MAX_SCROLL_FRAMES, Math.max(MIN_SCROLL_FRAMES, raw));
}
const BUILDER_DEVICE_ID_KEY = 'draftly_3d_builder_device_id_v1';

function getOrCreateDeviceId(): string {
  // Stable, anonymous per-device identifier for 3D Builder requests.
  if (typeof window === 'undefined') return 'server';
  const existing = safeLocalStorageGetItem(BUILDER_DEVICE_ID_KEY);
  if (existing && typeof existing === 'string') return existing;
  const next = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  if (safeLocalStorageSetItem(BUILDER_DEVICE_ID_KEY, next)) return next;
  return 'anonymous-device';
}

function compactProjectsForStorage(projects: SavedProject[]): SavedProject[] {
  return projects.map((project) => ({
    ...project,
    // Base64 video payloads can exceed localStorage quota quickly.
    messages: project.messages
      .slice(-120)
      .map((msg) => ({
        ...msg,
        videoSrc: msg.videoSrc?.startsWith('data:') ? undefined : msg.videoSrc,
        videoFallbackSrc: msg.videoFallbackSrc?.startsWith('data:') ? undefined : msg.videoFallbackSrc,
      })),
  }));
}

const GLOBAL_PROJECTS_KEY = 'draftly-3d-projects-v1';
const LAST_ACTIVE_PROJECT_KEY = 'draftly-3d-last-active-project-v1';

function getThreeDProjectsStorageKey(userId?: string | null): string {
  return userId ? `draftly-3d-projects-v1:${userId}` : GLOBAL_PROJECTS_KEY;
}

type PipelineStep =
  | 'idle' | 'describe' | 'gen-image' | 'confirm-image'
  | 'gen-video' | 'confirm-video' | 'preparing' | 'gen-site' | 'ready';

interface NodeDef { id: string; num: string; title: string; sub: string; mapSteps: PipelineStep[]; }

const PIPELINE_NODES: NodeDef[] = [
  { id: 'prompt', num: '01', title: 'Prompt Input', sub: 'Website + background description', mapSteps: ['idle', 'describe'] },
  { id: 'image', num: '02', title: 'Visual Draft', sub: 'Cinematic background creation', mapSteps: ['gen-image', 'confirm-image'] },
  { id: 'video', num: '03', title: 'Motion Pass', sub: 'High-quality motion synthesis', mapSteps: ['gen-video', 'confirm-video'] },
  { id: 'prepare', num: '04', title: 'Website Build', sub: 'Extract frames → Build website', mapSteps: ['preparing', 'gen-site'] },
  { id: 'done', num: '05', title: 'Website Ready', sub: 'Download ZIP', mapSteps: ['ready'] },
];

const STEP_ORDER: PipelineStep[] = [
  'idle', 'describe', 'gen-image', 'confirm-image', 'gen-video', 'confirm-video', 'preparing', 'gen-site', 'ready',
];

function getNodeStatus(node: NodeDef, step: PipelineStep): 'pending' | 'active' | 'complete' {
  const ci = STEP_ORDER.indexOf(step);
  const idxs = node.mapSteps.map(s => STEP_ORDER.indexOf(s));
  if (ci > Math.max(...idxs)) return 'complete';
  if (ci >= Math.min(...idxs) && ci <= Math.max(...idxs)) return 'active';
  return 'pending';
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  prompt: <i className="fa-solid fa-terminal text-[18px]"></i>,
  image: <i className="fa-solid fa-image text-[18px]"></i>,
  video: <i className="fa-solid fa-film text-[18px]"></i>,
  prepare: <i className="fa-solid fa-layer-group text-[18px]"></i>,
  done: <i className="fa-solid fa-rocket text-[18px]"></i>,
};

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid video data URL');
  }
  const mimeType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

// ─── Video → JPG frames (robust version) ────────────────────────
async function videoToWebpFrames(
  videoSrc: string,
  targetFrames = FRAME_EXTRACTION_TARGET,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const blob = videoSrc.startsWith('data:')
    ? dataUrlToBlob(videoSrc)
    : await (await fetch(videoSrc)).blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    video.onloadeddata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration < 0.5) {
          throw new Error(`Invalid video duration: ${duration}s. The video may not have loaded correctly.`);
        }

        const total = Math.max(1, Math.floor(targetFrames));
        logger.log('Frame extraction:', duration, 's →', total, 'frames');

        const MAX_DIM = 1024;
        let cw = video.videoWidth || 1920;
        let ch = video.videoHeight || 1080;
        if (cw > MAX_DIM || ch > MAX_DIM) {
          const scale = Math.min(MAX_DIM / cw, MAX_DIM / ch);
          cw = Math.floor(cw * scale);
          ch = Math.floor(ch * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d', { alpha: false })!;
        const frames: string[] = [];

        for (let i = 0; i < total; i++) {
          // Sample full duration range with deterministic frame count.
          const t = total <= 1 ? 0 : i / (total - 1);
          const time = Math.min(duration - 0.001, Math.max(0, t * duration));
          await new Promise<void>((seekResolve, seekReject) => {
            const timeout = setTimeout(() => seekReject(new Error(`Seek timeout at frame ${i}/${total}`)), 10000);
            video.onseeked = async () => {
              clearTimeout(timeout);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              // Use much lower quality (0.55) to shrink memory footprint and speed up extraction (fixes lag).
              frames.push(canvas.toDataURL('image/jpeg', 0.72));
              onProgress?.(i + 1, total);
              // Yield to main thread to prevent UI freezing
              await new Promise(r => setTimeout(r, 0));
              seekResolve();
            };
            video.currentTime = time;
          });
        }

        URL.revokeObjectURL(blobUrl);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video for frame extraction'));
    };

    video.src = blobUrl;
  });
}

async function getVideoDimensions(videoSrc: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Video metadata probe timeout'));
    }, 8000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      v.onloadedmetadata = null;
      v.onerror = null;
      v.removeAttribute('src');
      try {
        v.load();
      } catch {
        // no-op
      }
    };

    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => {
      const width = v.videoWidth;
      const height = v.videoHeight;
      cleanup();
      resolve({ width, height });
    };
    v.onerror = () => {
      cleanup();
      reject(new Error('Could not read video metadata'));
    };
    v.src = videoSrc;
  });
}

function splitGeneratedSiteFiles(html: string): { indexHtml: string; cssText: string; jsText: string } {
  let indexHtml = html;
  let cssText = '';
  let jsText = '';

  const cssTaggedMatch = html.match(/<style[^>]*id=["']app-styles["'][^>]*>([\s\S]*?)<\/style>/i);
  if (cssTaggedMatch) {
    cssText = cssTaggedMatch[1].trim();
    indexHtml = indexHtml.replace(cssTaggedMatch[0], '<link rel="stylesheet" href="assets/css/main.css" />');
  } else {
    // Extract all inline styles
    const styleMatches: RegExpExecArray[] = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let mStyle: RegExpExecArray | null;
    while ((mStyle = styleRegex.exec(html)) !== null) {
      styleMatches.push(mStyle);
    }

    if (styleMatches.length > 0) {
      cssText = styleMatches.map((m) => m[1].trim()).join('\n\n');
      styleMatches.forEach((m) => { indexHtml = indexHtml.replace(m[0], ''); });
      if (indexHtml.includes('</head>')) {
        indexHtml = indexHtml.replace('</head>', '  <link rel="stylesheet" href="assets/css/main.css" />\n</head>');
      }
    }
  }

  const jsTaggedMatch = html.match(/<script[^>]*id=["']app-script["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsTaggedMatch) {
    jsText = jsTaggedMatch[1].trim();
    indexHtml = indexHtml.replace(jsTaggedMatch[0], '<script src="assets/js/main.js"></script>');
  } else {
    // Extract inline scripts that do NOT have a 'src' attribute
    const scriptMatches: RegExpExecArray[] = [];
    const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let mScript: RegExpExecArray | null;
    while ((mScript = scriptRegex.exec(html)) !== null) {
      scriptMatches.push(mScript);
    }

    if (scriptMatches.length > 0) {
      jsText = scriptMatches.map((m) => m[1].trim()).join('\n\n');
      scriptMatches.forEach((m) => { indexHtml = indexHtml.replace(m[0], ''); });
      if (indexHtml.includes('</body>')) {
        indexHtml = indexHtml.replace('</body>', '  <script src="assets/js/main.js"></script>\n</body>');
      }
    }
  }

  return { indexHtml, cssText, jsText };
}

// ─── Typewriter Text ─────────────────────────────────────────────
function TypewriterText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(''); setDone(false);
    let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) { clearInterval(iv); setDone(true); } }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{displayed}{!done && <span className="inline-block w-[2px] h-[14px] bg-white ml-0.5 animate-pulse align-middle" />}</span>;
}

// ─── Animated Arrow ──────────────────────────────────────────────
  function AnimatedArrow({ status }: { status: 'pending' | 'active' | 'complete' }) {
    const c = status === 'complete' ? 'rgba(255,255,255,0.1)' : status === 'active' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)';
    return (
      <div className="flex justify-center my-2" style={{ height: 30 }}>
        <svg width="24" height="30" viewBox="0 0 24 30" fill="none" className="overflow-visible">
          <line x1="12" y1="0" x2="12" y2="24" stroke={c} strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
          <polyline points="8,20 12,26 16,20" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {status === 'active' && (
            <circle cx="12" r="3" fill="#ffffff" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]">
              <animate attributeName="cy" from="0" to="24" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>
    );
  }

// ─── Pipeline Node Card ──────────────────────────────────────────
function PipelineNodeCard({ node, status, detail, index }: { node: NodeDef; status: 'pending' | 'active' | 'complete'; detail?: string; index: number }) {
  // Determine realistic target duration for each step
  const durationMap: Record<string, number> = {
    image: 60,
    video: 180,
    prepare: 180,
  };
  const durationSec = durationMap[node.id] || 10;

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative rounded-xl border p-5 transition-all duration-300 overflow-hidden group ${status === 'active' ? 'bg-[#1A1A1A] border-white/20 shadow-md' :
        status === 'complete' ? 'bg-[#111111] border-white/[0.05]' : 'bg-[#0A0A0A] border-transparent opacity-50'}`}>
      
      {/* Progress bar background */}
      {(status === 'active' || status === 'complete') && (
        <motion.div 
          className={`absolute bottom-0 left-0 h-[2px] ${status === 'complete' ? 'bg-emerald-500' : 'bg-white'}`}
          initial={{ width: '0%' }}
          animate={{ width: status === 'complete' ? '100%' : '98%' }}
          transition={{ 
            duration: status === 'complete' ? 0.3 : durationSec, 
            ease: status === 'complete' ? 'easeOut' : 'linear' 
          }}
        />
      )}

      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${status === 'complete' ? 'bg-white/5 border border-white/10' :
          status === 'active' ? 'bg-white text-black border border-white' : 'bg-white/[0.02] border border-white/[0.05]'}`}>
          <span className={status === 'complete' ? 'text-white/60' : status === 'active' ? 'text-black' : 'text-white/30'}>
            {NODE_ICONS[node.id]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-bold tracking-widest uppercase ${status === 'complete' ? 'text-white/50' : status === 'active' ? 'text-white/80' : 'text-white/30'}`}>Step {node.num}</span>
            {status === 'active' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            {status === 'complete' && <i className="fa-solid fa-check-circle text-white/50 text-[12px]" />}
          </div>
          <h3 className={`text-[15px] font-semibold mt-1 tracking-tight ${status === 'active' ? 'text-white' : status === 'complete' ? 'text-white/80' : 'text-white/40'}`}>{node.title}</h3>
          <p className={`text-[13px] mt-0.5 leading-snug ${status === 'active' ? 'text-white/70' : status === 'complete' ? 'text-white/50' : 'text-white/30'}`}>{node.sub}</p>
          
          {/* Detail readout */}
          <AnimatePresence>
            {status === 'active' && detail && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <div className="text-[12px] text-white/70 flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md w-fit font-mono">
                  <i className="fa-solid fa-microchip text-[11px]" />
                  {detail}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Paywall Popup ───────────────────────────────────────────────
function ProUpgradePopup({
  onDismiss,
  title = 'Paid Plan Required',
  description = 'Image/video/frame/website generation in 3D Builder requires an active Basic, Pro, or Premium subscription.',
  ctaHref = '/pricing#pricing',
  ctaLabel = 'Go to Pricing',
}: {
  onDismiss: () => void;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute inset-x-4 bottom-20 z-30 rounded-2xl border border-white/15 bg-[#0c0c16]/95 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
      <button onClick={onDismiss} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <h3 className="text-[16px] font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] text-white/70 mb-4">{description}</p>
      <Link href={ctaHref} className="block w-full py-3 rounded-xl bg-white text-black text-center text-[13px] font-bold hover:bg-white/90 transition-all">{ctaLabel}</Link>
    </motion.div>
  );
}

// ─── Right Panel Tab Type ──────────────────────────────────────
type RightTab = 'launchpad' | 'pipeline' | 'image' | 'video' | 'frames' | 'code' | 'business';
type BuildTarget = 'desktop' | 'mobile';
type MobilePane = 'chat' | 'workspace';

// ─── Free-Tier Sunset Modal removed ───
// ─── Main ────────────────────────────────────────────────────────
function ThreeDBuilderInner() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, generationTracking, isOwner, refreshSubscription, loading: subLoading } = useSubscription();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  /** Last project id written by local save — keeps cloud sync on the same doc as localStorage. */
  const lastPersistedProjectIdRef = useRef<string | null>(null);

  const [step, setStep] = useState<PipelineStep>('idle');
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [videoFallbackSrc, setVideoFallbackSrc] = useState<string | null>(null);
  const [webpFrames, setWebpFrames] = useState<string[]>([]);
  const [siteCode, setSiteCode] = useState<string | null>(null);
  const [sitePrompt, setSitePrompt] = useState('');
  const [bgPrompt, setBgPrompt] = useState('');
  const [frameProgress, setFrameProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [enhancingMain, setEnhancingMain] = useState(false);
  const [enhancingAnim, setEnhancingAnim] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTitle, setPaywallTitle] = useState('Paid Plan Required');
  const [paywallDescription, setPaywallDescription] = useState(
    'Image/video/frame/website generation in 3D Builder requires an active paid plan (Basic through Premium). ZIP export is on Premium ($200/mo)+.',
  );
  const isProUser =
    isOwner ||
    isTestingCreditsEmail(user?.email) ||
    (subscription.status === 'active' &&
      ['basic', 'basic-plus', 'pro', 'premium', 'agency', 'tester', 'testing'].includes(subscription.plan));

  const canExportZipUser = planCanExportZip(subscription.plan, { isOwner });
  const hasPremiumCloudProjects = planKeepsAllCloudProjects(subscription.plan);

  const canBuilderKeyframeAndChain = useMemo(
    () =>
      isOwner ||
      isTestingCreditsEmail(user?.email || '') ||
      (subscription.status === 'active' && canUseBuilderVeoMotion(subscription.plan)),
    [subscription.plan, subscription.status, isOwner, user?.email],
  );

  const planVideoLimit = useMemo(() => {
    if (isOwner) return 999;
    if (isTestingCreditsEmail(user?.email)) return 2;
    const limits: Record<string, number> = {
      basic: 2,
      'basic-plus': 4,
      tester: 2,
      testing: 2,
      pro: 5,
      premium: 10,
      agency: 50,
    };
    return limits[subscription.plan] || 0;
  }, [subscription.plan, isOwner, user?.email]);

  const cloudSaveDebounceMs = useMemo(
    () => (isOwner || planKeepsAllCloudProjects(subscription.plan) ? 20_000 : 60_000),
    [subscription.plan, isOwner],
  );

  const chatPromptMaxChars = useMemo(
    () => getMaxPromptCharsForPlan(subscription.plan || 'free', isOwner),
    [subscription.plan, isOwner],
  );

  // Free-tier notice removed per user request
  const [rightTab, setRightTab] = useState<RightTab>('pipeline');
  const [animPromptInput, setAnimPromptInput] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const [videoQuality, setVideoQuality] = useState<BuilderVideoQuality>('720p');

  /** Veo clips are billed as 8s in the builder. */
  const outputVideoDurationSec = 8;

  const [siteRenderMode] = useState<'frame-scroll' | 'video-hero'>('frame-scroll');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [buildTarget, setBuildTarget] = useState<BuildTarget>('desktop');
  const [mobilePane, setMobilePane] = useState<MobilePane>('chat');
  type MediaAspectRatio = '16:9' | '9:16' | '1:1';
  const [mediaAspectRatio, setMediaAspectRatio] = useState<MediaAspectRatio>('16:9');
  const selectedAspectRatio: MediaAspectRatio = mediaAspectRatio;
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustPromptTextareaHeight = useCallback(() => {
    const el = promptTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(200, Math.max(34, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);
  useLayoutEffect(() => {
    adjustPromptTextareaHeight();
  }, [input, animPromptInput, step, adjustPromptTextareaHeight]);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [videoChain, setVideoChain] = useState<string[]>([]);
  const [buildModeChosen, setBuildModeChosen] = useState<'frontend' | 'fullapp' | null>('frontend');
  const [builderImageResolution, setBuilderImageResolution] = useState<BuilderImageResolutionTier>('1K');
  const [extractionFps, setExtractionFps] = useState(25);
  const [generatingLastFrame, setGeneratingLastFrame] = useState(false);
  const [refBriefLoading, setRefBriefLoading] = useState(false);
  const [speechListening, setSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const [lastFramePrompt, setLastFramePrompt] = useState('');
  const [chatWidth, setChatWidth] = useState(420);
  /** Minimize chat to header-only so more of the workspace/background is visible */
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showStepGuide, setShowStepGuide] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Auto-tutorial disabled by user request. Will only show when button clicked.
  }, [step, messages.length]);

  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('index.html');
  const [showPreview, setShowPreview] = useState(false);
  /** Fullscreen preview: hold (no iframe load), then progress bar, then load blob into iframe so scroll stays smooth. */
  const [fullPreviewPhase, setFullPreviewPhase] = useState<'idle' | 'hold' | 'bar' | 'ready'>('idle');
  const [fullPreviewBar, setFullPreviewBar] = useState(0);
  /** Chips → generate-site `graphicsStack` so Three/Spline/etc. are enforced in system prompt. */
  const [graphicsStackPicks, setGraphicsStackPicks] = useState<string[]>([]);
  const [persistenceTipDismissed, setPersistenceTipDismissed] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const isDraggingRef = useRef(false);
  /** Project ID that the current generation is for. Used to avoid applying results to wrong project when user switches. */
  const generationProjectIdRef = useRef<string | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;

  const isGenerating = (step !== 'idle' && step !== 'ready') || sending;
  const isWebsiteGenerating = ['gen-image', 'gen-video', 'preparing', 'gen-site'].includes(step);

  // Cloud save is now active for all paid plans — no local-only reminder needed.
  const showLocalPersistenceReminder = false;

  useEffect(() => {
    if (!showLocalPersistenceReminder) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [showLocalPersistenceReminder]);

  const guardNavigateFromBuilder = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!showLocalPersistenceReminder) return;
      const msg =
        'Leave the 3D Builder? On Basic–Pro your project and frames are kept in this browser only (local storage), not full cloud backup. ZIP export and long-term cloud project history are on Premium ($200/mo). Reloading or another device may not bring this build back.';
      if (!window.confirm(msg)) e.preventDefault();
    },
    [showLocalPersistenceReminder],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const next = Math.min(Math.max(e.clientX, 280), 700);
      setChatWidth(next);
    };
    const onUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  const [loadedFromQueryId, setLoadedFromQueryId] = useState<string | null>(null);

  const canBuilderHighRes =
    isOwner ||
    isTestingCreditsEmail(user?.email) ||
    (!subLoading &&
      subscription.status === 'active' &&
      ['premium', 'agency', 'tester', 'testing'].includes(subscription.plan));

  const imageResFromUrl = searchParams.get('imageRes');
  const videoResFromUrl = searchParams.get('videoRes');

  useEffect(() => {
    if (subLoading) return;
    // Only apply imageRes from the URL when it is present — do not re-run on canBuilderHighRes alone,
    // or every subscription load overwrites the user's 1K choice (e.g. hero links with imageRes=2K).
    if (imageResFromUrl != null && imageResFromUrl !== '') {
      const irU = String(imageResFromUrl).toUpperCase();
      if (irU === '1K') setBuilderImageResolution('1K');
      else if (irU === '2K') {
        setBuilderImageResolution(canBuilderHighRes ? '2K' : '1K');
      }
    }
    if (videoResFromUrl != null && videoResFromUrl !== '') {
      const vr = String(videoResFromUrl).toLowerCase();
      if (vr === '720p') setVideoQuality('720p');
      else if (vr === '2k' || vr === '4k' || vr === '1080p') {
        setVideoQuality(canBuilderHighRes ? '2k' : '720p');
      }
    }
  }, [searchParams, subLoading, canBuilderHighRes, imageResFromUrl, videoResFromUrl]);

  const imageResQuery = searchParams.get('imageRes');
  const videoResQuery = searchParams.get('videoRes');

  // Agency: apply high-res defaults once when eligible — do not re-run when user later picks 1K / 720p.
  const agencyDefaultMediaOnceRef = useRef(false);
  useEffect(() => {
    if (subscription.status !== 'active' || subscription.plan !== 'agency') return;
    if (agencyDefaultMediaOnceRef.current) return;
    if (!canBuilderHighRes) return;

    if (!imageResQuery && builderImageResolution === '1K') setBuilderImageResolution('2K');
    if (!videoResQuery && videoQuality === '720p') setVideoQuality('2k');
    agencyDefaultMediaOnceRef.current = true;
  }, [
    subscription.status,
    subscription.plan,
    canBuilderHighRes,
    imageResQuery,
    videoResQuery,
    builderImageResolution,
    videoQuality,
  ]);

  useEffect(() => {
    if (subscription.status !== 'active') return;
    if (
      ['basic', 'basic-plus', 'pro', 'testing', 'free'].includes(subscription.plan) &&
      builderImageResolution === '2K'
    ) {
      setBuilderImageResolution('1K');
    }
  }, [subscription.plan, subscription.status, builderImageResolution]);

  useEffect(() => {
    if (subscription.status !== 'active') return;
    if (
      ['basic', 'basic-plus', 'pro', 'testing', 'free'].includes(subscription.plan) &&
      videoQuality === '2k'
    ) {
      setVideoQuality('720p');
    }
  }, [subscription.plan, subscription.status, videoQuality]);

  const openUpgradePopup = useCallback((title: string, description: string) => {
    setPaywallTitle(title);
    setPaywallDescription(description);
    setShowPaywall(true);
  }, []);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const workspacePreviewIframeRef = useRef<HTMLIFrameElement>(null);
  /** Blob URL for preview HTML — more reliable than document.write for large inlined frame payloads. */
  const previewBlobUrlRef = useRef<string | null>(null);

  /** Parent globals for same-origin preview iframe (see buildBuilderPreviewHtml). */
  useEffect(() => {
    window.__DRAFTLY_PREVIEW_FRAMES = siteRenderMode === 'frame-scroll' ? webpFrames : [];
    window.__DRAFTLY_PREVIEW_VIDEO = siteRenderMode === 'video-hero' ? (videoBase64 || null) : null;
    window.__DRAFTLY_PREVIEW_USER_ASSETS = Object.fromEntries(uploadedImages.map((i) => [i.id, i.dataUrl]));
    return () => {
      window.__DRAFTLY_PREVIEW_FRAMES = [];
      window.__DRAFTLY_PREVIEW_VIDEO = null;
      window.__DRAFTLY_PREVIEW_USER_ASSETS = {};
    };
  }, [webpFrames, videoBase64, siteRenderMode, uploadedImages]);

  /** Live preview: blob URL loads full HTML as a real document (doc.write can fail or race on large inlined WebP arrays). */
  useEffect(() => {
    if (!siteCode) return;
    window.__DRAFTLY_PREVIEW_FRAMES = siteRenderMode === 'frame-scroll' ? webpFrames : [];
    window.__DRAFTLY_PREVIEW_VIDEO = siteRenderMode === 'video-hero' ? (videoBase64 || null) : null;
    window.__DRAFTLY_PREVIEW_USER_ASSETS = Object.fromEntries(uploadedImages.map((i) => [i.id, i.dataUrl]));

    const html = buildBuilderPreviewHtml(siteCode, {
      siteRenderMode,
      videoBase64,
      webpFrames: siteRenderMode === 'frame-scroll' ? webpFrames : undefined,
    });

    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    previewBlobUrlRef.current = url;
    // Only drive one live preview at a time: workspace iframe OR fullscreen (not both — duplicate rAF scroll loops freeze the tab).
    if (showPreview) {
      if (fullPreviewPhase === 'ready' && previewIframeRef.current) {
        previewIframeRef.current.src = url;
      }
    } else if (workspacePreviewIframeRef.current) {
      workspacePreviewIframeRef.current.src = url;
    }

    return () => {};
  }, [siteCode, webpFrames, siteRenderMode, videoBase64, uploadedImages, showPreview, fullPreviewPhase]);

  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, []);

  /** Fullscreen: staged hold + bar, then `ready` → blob effect assigns iframe src. */
  useEffect(() => {
    if (!showPreview) {
      setFullPreviewPhase('idle');
      setFullPreviewBar(0);
      return;
    }
    setFullPreviewPhase('hold');
    setFullPreviewBar(0);
    const barMs = Math.min(15_000, Math.max(10_000, 9000 + webpFrames.length * 18));
    let rafId = 0;
    const delayTimer = window.setTimeout(() => {
      setFullPreviewPhase('bar');
      const start = Date.now();
      const step = () => {
        const p = Math.min(100, ((Date.now() - start) / barMs) * 100);
        setFullPreviewBar(p);
        if (p < 100) {
          rafId = requestAnimationFrame(step);
        } else {
          setFullPreviewPhase('ready');
        }
      };
      rafId = requestAnimationFrame(step);
    }, FULL_PREVIEW_HOLD_MS);
    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(rafId);
    };
  }, [showPreview, webpFrames.length]);

  /** Fullscreen open: park workspace iframe so only one copy of the heavy preview runs; iframe src is set when phase is `ready`. */
  useEffect(() => {
    const url = previewBlobUrlRef.current;
    const workspaceEl = workspacePreviewIframeRef.current;
    if (!showPreview) {
      if (workspaceEl && url) workspaceEl.src = url;
      return;
    }
    if (workspaceEl) workspaceEl.src = 'about:blank';
  }, [showPreview]);

  const appendGeneratedImageUrl = useCallback((url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return;
    setGeneratedImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const userScopedKey = getThreeDProjectsStorageKey(user?.uid || null);
        const rawUser = safeLocalStorageGetItem(userScopedKey);
        const rawGlobal = safeLocalStorageGetItem(GLOBAL_PROJECTS_KEY);

        const all: SavedProject[] = [];

        const pushParsed = (raw?: string | null) => {
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw) as SavedProject[];
            if (Array.isArray(parsed)) all.push(...parsed);
          } catch {
            // ignore malformed block
          }
        };

        pushParsed(rawGlobal);
        if (userScopedKey !== GLOBAL_PROJECTS_KEY) {
          pushParsed(rawUser);
        }

        const byId = new Map<string, SavedProject>();
        for (const p of all) {
          if (!p?.id) continue;
          const existing = byId.get(p.id);
          if (!existing || (p.updatedAt || 0) > (existing.updatedAt || 0)) {
            byId.set(p.id, p);
          }
        }

        if (user?.uid) {
          try {
            const firebaseList = await listProjectsFromFirebase(user.uid);
            for (const meta of firebaseList) {
              if (cancelled) return;
              const existing = byId.get(meta.id);
              const firebaseNewer = !existing || (meta.updatedAt ?? 0) > (existing.updatedAt ?? 0);
              // If Firebase is newer, we need to fetch from Storage (use metadata-only).
              // If local is same/newer and has siteCode, preserve it so Preview works without re-fetch.
              if (firebaseNewer) {
                byId.set(meta.id, {
                  id: meta.id,
                  name: meta.name,
                  sitePrompt: meta.sitePrompt,
                  bgPrompt: meta.bgPrompt,
                  bgImageUrl: meta.bgImageUrl,
                  siteCode: null,
                  renderMode: meta.renderMode,
                  buildTarget: (meta.buildTarget === 'mobile' ? 'mobile' : 'desktop') as BuildTarget,
                  messages: Array.isArray(meta.messages) ? (meta.messages as ChatMsg[]) : [],
                  uploadedImages: [],
                  createdAt: meta.createdAt,
                  updatedAt: meta.updatedAt,
                  siteCodePath: meta.siteCodePath,
                  framesPath: meta.framesPath,
                  videoPath: meta.videoPath,
                  videoChainPaths: meta.videoChainPaths,
                  uploadedImagesPaths: meta.uploadedImagesPaths,
                  generatedImageUrls: meta.generatedImageUrls,
                });
              } else if (existing?.siteCode || existing?.webpFrames?.length) {
                // Keep local data so Preview works when user returns; merge Firebase paths for cloud sync
                byId.set(meta.id, {
                  ...existing,
                  ...meta,
                  siteCode: existing.siteCode ?? null,
                  webpFrames: existing.webpFrames ?? undefined,
                  videoBase64: existing.videoBase64 ?? undefined,
                  videoChain: existing.videoChain ?? undefined,
                  videoChainPaths: meta.videoChainPaths ?? existing.videoChainPaths,
                  generatedImageUrls: existing.generatedImageUrls?.length
                    ? existing.generatedImageUrls
                    : meta.generatedImageUrls,
                  messages: existing.messages ?? [],
                  uploadedImages: existing.uploadedImages ?? [],
                  buildTarget: (existing.buildTarget === 'mobile' || meta.buildTarget === 'mobile' ? 'mobile' : 'desktop') as BuildTarget,
                });
              }
            }
          } catch (e) {
            logger.warn('Firebase list failed:', e);
          }
        }

        const merged = Array.from(byId.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        if (!cancelled) setProjects(merged);
      } catch {
        // ignore malformed local data
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const saveProjects = useCallback((next: SavedProject[]) => {
    setProjects(next);
    const userScopedKey = getThreeDProjectsStorageKey(user?.uid || null);
    const payload = JSON.stringify(compactProjectsForStorage(next));

    // Always persist to both global and user-scoped keys so projects
    // survive auth changes and remain tied to the device as well.
    const keysToTry = [GLOBAL_PROJECTS_KEY, userScopedKey].filter(Boolean);

    for (let i = 0; i < keysToTry.length; i++) {
      const key = keysToTry[i]!;
      if (safeLocalStorageSetItem(key, payload)) continue;
      const reduced = compactProjectsForStorage(next.slice(0, 8)).map((p) => ({ ...p, uploadedImages: [] }));
      if (safeLocalStorageSetItem(key, JSON.stringify(reduced))) continue;
      const latest = next[0];
      if (!latest) continue;
      const minimal: SavedProject[] = [{
        ...latest,
        siteCode: latest.siteCode ? latest.siteCode.slice(0, 120000) : latest.siteCode,
        uploadedImages: [],
        webpFrames: undefined,
        videoBase64: undefined,
        videoChain: undefined,
        messages: latest.messages.slice(-30).map((msg) => ({
          ...msg,
          videoSrc: msg.videoSrc?.startsWith('data:') ? undefined : msg.videoSrc,
          videoFallbackSrc: msg.videoFallbackSrc?.startsWith('data:') ? undefined : msg.videoFallbackSrc,
        })),
      }];
      safeLocalStorageSetItem(key, JSON.stringify(minimal));
    }
  }, [user?.uid]);

  const saveProjectLocalOnly = useCallback(() => {
    const hasRealMessages = messages.some(m => m.role !== 'system');
    if (!siteCode && !sitePrompt && !bgPrompt && !hasRealMessages) return;
    const id = activeProjectId || `proj_${Date.now()}`;
    const now = Date.now();
    const name = sitePrompt?.trim()?.slice(0, 48) || 'Untitled 3D Project';
    const record: SavedProject = {
      id,
      name,
      createdAt: projects.find(p => p.id === id)?.createdAt || now,
      updatedAt: now,
      sitePrompt,
      bgPrompt,
      bgImageUrl,
      siteCode,
      renderMode: siteRenderMode,
      buildTarget,
      messages,
      uploadedImages,
      webpFrames: webpFrames.length ? webpFrames : undefined,
      videoBase64: videoBase64 || undefined,
      videoChain: videoChain.length ? videoChain : undefined,
      generatedImageUrls: generatedImageUrls.length ? generatedImageUrls : undefined,
    };
    const next = [record, ...projects.filter(p => p.id !== id)].slice(0, 20);
    saveProjects(next);
    setActiveProjectId(id);
    lastPersistedProjectIdRef.current = id;
    safeSessionStorageSetItem(LAST_ACTIVE_PROJECT_KEY, id);
  }, [activeProjectId, projects, sitePrompt, bgPrompt, bgImageUrl, siteCode, siteRenderMode, buildTarget, messages, uploadedImages, webpFrames, videoBase64, videoChain, generatedImageUrls, saveProjects]);

  const saveProjectCloudOnly = useCallback(() => {
    if (is3DCloudSaveDisabled()) return;
    if (!user?.uid) return;
    const hasRealMessages = messages.some(m => m.role !== 'system');
    if (!(siteCode || sitePrompt || bgPrompt || hasRealMessages || webpFrames.length || videoBase64)) return;
    const id = lastPersistedProjectIdRef.current || activeProjectId || `proj_${Date.now()}`;
    const name = sitePrompt?.trim()?.slice(0, 48) || 'Untitled 3D Project';
    saveProjectToFirebase(user.uid, id, {
      name,
      sitePrompt,
      bgPrompt,
      bgImageUrl,
      siteCode: siteCode || null,
      webpFrames: [],
      videoBase64: videoBase64 || null,
      videoChain,
      generatedImageUrls: generatedImageUrls.length ? generatedImageUrls : undefined,
      renderMode: siteRenderMode,
      buildTarget,
      uploadedImages,
      messages: messages.slice(-150).map((m) => ({
        role: m.role,
        text: m.text,
        imageUrl: m.imageUrl?.startsWith('data:') ? undefined : m.imageUrl,
        videoSrc: m.videoSrc?.startsWith('data:') ? undefined : m.videoSrc,
        videoFallbackSrc: m.videoFallbackSrc?.startsWith('data:') ? undefined : m.videoFallbackSrc,
        ts: m.ts,
      })),
    })
      .then((meta) => {
        logger.log('Project saved to cloud');
        if (meta.bgImageUrl) {
          setBgImageUrl(meta.bgImageUrl);
        }
        setProjects((prev) => {
          const merged = prev.map((pr) =>
            pr.id === id
              ? {
                  ...pr,
                  bgImageUrl: meta.bgImageUrl ?? pr.bgImageUrl,
                  siteCodePath: meta.siteCodePath ?? pr.siteCodePath,
                  framesPath: meta.framesPath ?? pr.framesPath,
                  videoPath: meta.videoPath ?? pr.videoPath,
                  videoChainPaths: meta.videoChainPaths ?? pr.videoChainPaths,
                  generatedImageUrls: meta.generatedImageUrls?.length ? meta.generatedImageUrls : pr.generatedImageUrls,
                }
              : pr,
          );
          const payload = JSON.stringify(compactProjectsForStorage(merged));
          safeLocalStorageSetItem(GLOBAL_PROJECTS_KEY, payload);
          const userScopedKey = getThreeDProjectsStorageKey(user?.uid || null);
          if (userScopedKey !== GLOBAL_PROJECTS_KEY) {
            safeLocalStorageSetItem(userScopedKey, payload);
          }
          return merged;
        });
      })
      .catch((e) => {
        logger.warn('Cloud save failed:', e);
      });
  }, [activeProjectId, user?.uid, sitePrompt, bgPrompt, bgImageUrl, siteCode, siteRenderMode, buildTarget, messages, uploadedImages, webpFrames, videoBase64, videoChain, generatedImageUrls]);

  const saveCurrentProject = useCallback(() => {
    saveProjectLocalOnly();
    void saveProjectCloudOnly();
  }, [saveProjectLocalOnly, saveProjectCloudOnly]);

  const loadProject = useCallback(async (p: SavedProject) => {
    if (isGenerating) return;
    safeSessionStorageSetItem(LAST_ACTIVE_PROJECT_KEY, p.id);
    const isFirebaseProject =
      !!(p.siteCodePath || p.framesPath || p.videoPath || (p.videoChainPaths && p.videoChainPaths.length)) &&
      user?.uid;

    if (isFirebaseProject) {
      setLoadingProjectId(p.id);
      try {
        const data = await loadProjectFromFirebase(user!.uid, p.id);
        if (!data) {
          setMessages(prev => [...prev, { role: 'system', text: `[PROJECT] Could not load from cloud: ${p.name}`, ts: Date.now() }]);
          return;
        }
        setSitePrompt(p.sitePrompt);
        setBgPrompt(p.bgPrompt);
        setBgImageUrl(p.bgImageUrl ?? data.meta.bgImageUrl ?? null);
        setSiteCode(data.siteCode);
        // Render mode locked to frame-scroll (video-hero removed).
        setBuildTarget((data.meta.buildTarget === 'mobile' ? 'mobile' : 'desktop') as BuildTarget);
        setMessages(Array.isArray(data.messages) ? (data.messages as ChatMsg[]) : []);
        setUploadedImages(data.uploadedImages);
        setWebpFrames(data.webpFrames);
        setVideoBase64(data.videoBase64);
        setVideoChain(Array.isArray(data.videoChain) ? data.videoChain : []);
        setGeneratedImageUrls(
          data.generatedImageUrls?.length
            ? data.generatedImageUrls
            : p.generatedImageUrls?.length
              ? p.generatedImageUrls
              : (p.bgImageUrl ?? data.meta.bgImageUrl)
                ? [p.bgImageUrl ?? data.meta.bgImageUrl!]
                : [],
        );
        setVideoFallbackSrc(null);
        const nextStep: PipelineStep =
          data.siteCode ? 'ready'
            : (data.videoBase64 ? 'confirm-video' : 'idle');
        setStep(nextStep);
        setActiveProjectId(p.id);
        lastPersistedProjectIdRef.current = p.id;
        setBuildModeChosen('frontend');
        setMessages(prev => [...prev, { role: 'system', text: `[PROJECT] Loaded from cloud: ${p.name}`, ts: Date.now() }]);

        // Frames are not saved to cloud (too large). Regenerate from video on load.
        if (data.webpFrames.length === 0 && data.videoBase64) {
          const vidSrc = data.videoBase64;
          setMessages(prev => [...prev, { role: 'system', text: '[PROJECT] Restoring scroll frames from video…', ts: Date.now() }]);
          videoToWebpFrames(vidSrc).then((frames) => {
            setWebpFrames(frames);
            setMessages(prev => [...prev, { role: 'system', text: `[PROJECT] Scroll frames restored (${frames.length})`, ts: Date.now() }]);
          }).catch((err) => {
            logger.warn('[load] Frame regeneration failed:', err);
          });
        }
      } catch (e) {
        logger.warn('Load failed:', e);
        setMessages(prev => [...prev, { role: 'system', text: `[PROJECT] Failed to load from cloud: ${p.name}`, ts: Date.now() }]);
      } finally {
        setLoadingProjectId(null);
      }
      return;
    }

    setActiveProjectId(p.id);
    lastPersistedProjectIdRef.current = p.id;
    setSitePrompt(p.sitePrompt);
    setBgPrompt(p.bgPrompt);
    setBgImageUrl(p.bgImageUrl);
    setGeneratedImageUrls(
      p.generatedImageUrls?.length
        ? p.generatedImageUrls
        : p.bgImageUrl
          ? [p.bgImageUrl]
          : [],
    );
    setSiteCode(p.siteCode);
    // Render mode locked to frame-scroll.
    setBuildTarget((p.buildTarget === 'mobile' ? 'mobile' : 'desktop') as BuildTarget);
    setMessages(Array.isArray(p.messages) ? p.messages : []);
    setUploadedImages(Array.isArray(p.uploadedImages) ? p.uploadedImages : []);
    setWebpFrames(Array.isArray(p.webpFrames) ? p.webpFrames : []);
    setVideoBase64(p.videoBase64 ?? null);
    setVideoChain(Array.isArray(p.videoChain) ? p.videoChain : []);
    setVideoFallbackSrc(null);
    const nextStep: PipelineStep =
      p.siteCode ? 'ready'
        : (p.videoBase64 ? 'confirm-video' : 'idle');
    setStep(nextStep);
    setMessages(prev => [...prev, { role: 'system', text: `[PROJECT] Loaded: ${p.name}`, ts: Date.now() }]);
    setBuildModeChosen('frontend');
  }, [user?.uid, isGenerating]);

  useEffect(() => {
    const projectIdFromQuery = searchParams.get('projectId');
    const viewFromQuery = searchParams.get('view');

    if (!projectIdFromQuery || projects.length === 0) return;
    if (loadedFromQueryId === projectIdFromQuery) return;

    const target = projects.find((p) => p.id === projectIdFromQuery);
    if (!target) return;

    loadProject(target);
    if (viewFromQuery === 'workspace') {
      setMobilePane('workspace');
    }
    setLoadedFromQueryId(projectIdFromQuery);
  }, [projects, searchParams, loadProject, loadedFromQueryId]);

  // Do NOT auto-restore last project when opening /3d-builder without projectId.
  // Users expect a fresh start. To continue a project, they must use the project list or URL with ?projectId=xxx.

  // ── Template auto-fill: pre-load sitePrompt + bgPrompt from URL query params ──
  // When user clicks "Use This" on a landing page template, both prompts are
  // encoded into the URL. We pre-fill step-1 input (website prompt) immediately,
  // and store the bgPrompt so it auto-fills when the builder reaches step 2.
  const [pendingBgPrompt, setPendingBgPrompt] = useState<string>('');
  const templateFillDone = useRef(false);
  useEffect(() => {
    if (templateFillDone.current) return;
    const urlSitePrompt = searchParams.get('sitePrompt');
    const urlBgPrompt = searchParams.get('bgPrompt');
    const homePrompt = searchParams.get('prompt');
    const fillWith = urlSitePrompt || homePrompt;
    if (!fillWith) return;
    templateFillDone.current = true;
    setInput(fillWith.slice(0, chatPromptMaxChars));
    if (urlBgPrompt) setPendingBgPrompt(urlBgPrompt.slice(0, chatPromptMaxChars));
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('sitePrompt');
      url.searchParams.delete('bgPrompt');
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  }, [searchParams, chatPromptMaxChars]);

  const createNewProject = useCallback(() => {
    setActiveProjectId(null);
    setBuildModeChosen(null);
    safeSessionStorageRemoveItem(LAST_ACTIVE_PROJECT_KEY);
    setSitePrompt('');
    setBgPrompt('');
    setBgImageUrl(null);
    setVideoBase64(null);
    setVideoFallbackSrc(null);
    setVideoQuality('720p');
    setWebpFrames([]);
    setSiteCode(null);
    setBuildTarget('desktop');
    setUploadedImages([]);
    setGeneratedImageUrls([]);
    setFirstFrameUrl(null);
    setLastFrameUrl(null);
    setVideoChain([]);
    setStep('idle');
    setMessages([]);
  }, []);

  // When the builder transitions to step 2 (background image prompt),
  // auto-fill the input with the stored pending bg prompt from the template.
  useEffect(() => {
    if (step === 'describe' && pendingBgPrompt) {
      setInput(pendingBgPrompt.slice(0, chatPromptMaxChars));
      setPendingBgPrompt(''); // only auto-fill once
    }
  }, [step, pendingBgPrompt, chatPromptMaxChars]);

  const push = useCallback((role: ChatMsg['role'], text: string, extra?: { imageUrl?: string; videoSrc?: string; videoFallbackSrc?: string; integrationHint?: ChatMsg['integrationHint'] }) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now(), ...extra }]);
  }, []);

  const restartVisualPipeline = useCallback(async () => {
    if (!user?.uid || !siteCode) {
      push('system', '[ PIPELINE ] A completed site is required before running a background-only pass.');
      return;
    }
    const backgroundPrompt = (bgPrompt || sitePrompt || '').trim();
    if (!backgroundPrompt) {
      push('system', '[ PIPELINE ] No background prompt found. Please describe your background first.');
      return;
    }

    setSending(true);
    setRightTab('pipeline');
    setVideoChain([]);
    try {
      push('system', '[ PIPELINE ] Regenerating background visuals without changing layout/text...');
      const imageUrl = await generateImage(backgroundPrompt);
      const videoSrc = await generateVideo(imageUrl, animPromptInput.trim() || undefined);
      setStep('preparing');
      const videoDurationSec = outputVideoDurationSec;
      const framesTarget = computeScrollFrameCount(videoDurationSec, extractionFps);
      setFrameProgress({ done: 0, total: framesTarget });
      const frames = await videoToWebpFrames(videoSrc, framesTarget, (done, total) =>
        setFrameProgress({ done, total }),
      );
      setWebpFrames(frames);
      push('system', `[ 04 ] ✓ ${frames.length} WebP frames extracted at ${extractionFps} FPS (background-only update)`);
      setStep('ready');
      push('assistant', 'Background visuals updated. Your 3D website layout and text remain the same.');
    } catch (err: any) {
      const msg = err?.message || 'Background regeneration failed';
      setError(msg);
      push('system', `[ERROR] ${msg}`);
      setStep('ready');
    } finally {
      setSending(false);
    }
  }, [user?.uid, siteCode, bgPrompt, sitePrompt, animPromptInput, push, extractionFps, videoQuality, outputVideoDurationSec]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (step !== 'confirm-image' || !bgImageUrl || !canBuilderKeyframeAndChain) return;
    setFirstFrameUrl((prev) => prev ?? bgImageUrl);
  }, [step, bgImageUrl, canBuilderKeyframeAndChain]);

  const toggleDictation = useCallback(() => {
    if (!speechSupported) {
      push('system', '[INFO] Voice typing works best in Chrome or Edge with microphone permission.');
      return;
    }
    if (speechListening) {
      try {
        (speechRecRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {
        /* ignore */
      }
      speechRecRef.current = null;
      setSpeechListening(false);
      return;
    }
    type RecClass = new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((e: { results: Array<{ 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    const Win = window as unknown as { webkitSpeechRecognition?: RecClass; SpeechRecognition?: RecClass };
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) {
      push('system', '[INFO] Speech recognition is not available in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = String(event.results?.[0]?.[0]?.transcript ?? '').trim();
      if (!text) return;
      if (step === 'confirm-image') {
        setAnimPromptInput((p) => `${p}${p ? ' ' : ''}${text}`.slice(0, chatPromptMaxChars));
      } else {
        setInput((p) => `${p}${p ? ' ' : ''}${text}`.slice(0, chatPromptMaxChars));
      }
      requestAnimationFrame(() => adjustPromptTextareaHeight());
    };
    rec.onerror = () => setSpeechListening(false);
    rec.onend = () => {
      setSpeechListening(false);
      speechRecRef.current = null;
    };
    speechRecRef.current = rec;
    try {
      rec.start();
      setSpeechListening(true);
    } catch {
      setSpeechListening(false);
      push('system', '[INFO] Could not start the microphone. Check browser permissions.');
    }
  }, [
    speechSupported,
    speechListening,
    step,
    chatPromptMaxChars,
    adjustPromptTextareaHeight,
    push,
  ]);

  const codeStructure = useMemo(() => {
    if (!siteCode) return null;
    return splitGeneratedSiteFiles(siteCode);
  }, [siteCode]);

  const getNodeDetail = useCallback((id: string): string | undefined => {
    if (id === 'image' && step === 'gen-image') return 'Designing your visual direction...';
    if (id === 'image' && step === 'confirm-image') return 'Waiting for your confirmation...';
    if (id === 'video' && step === 'gen-video') return 'Crafting motion and depth...';
    if (id === 'video' && step === 'confirm-video') return 'Waiting for your confirmation...';
    if (id === 'prepare' && step === 'preparing' && frameProgress.total > 0) {
      const pct = Math.round((frameProgress.done / frameProgress.total) * 100);
      return `Extracting frames ${pct}% (${frameProgress.done}/${frameProgress.total})`;
    }
    if (id === 'prepare' && step === 'preparing') return 'Preparing assets…';
    if (id === 'prepare' && step === 'gen-site') return 'Composing your live website...';
    return undefined;
  }, [step, frameProgress]);

  const getArrowStatus = useCallback((afterIdx: number): 'pending' | 'active' | 'complete' => {
    if (step === 'idle') return 'pending';
    const a = getNodeStatus(PIPELINE_NODES[afterIdx], step);
    const b = getNodeStatus(PIPELINE_NODES[afterIdx + 1], step);
    if (a === 'complete' && b === 'complete') return 'complete';
    if (a === 'complete' && b === 'active') return 'active';
    if (a === 'active') return 'active';
    return 'pending';
  }, [step]);

  const readApiResponse = useCallback(async <T extends Record<string, unknown>>(res: Response): Promise<T> => {
    const raw = await res.text();
    let data: Record<string, unknown> = {};

    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      const text = raw.trim();
      if (res.status === 413 || /request entity too large/i.test(text)) {
        throw new Error('Uploaded payload is too large. Please use fewer or smaller images and retry.');
      }
      throw new Error(text || `Request failed (${res.status})`);
    }

    if (!res.ok) {
      const rawError =
        (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        (res.status === 413
          ? 'Uploaded payload is too large. Please use fewer or smaller images and retry.'
          : `Request failed (${res.status})`);

      // Hide provider/model/internal labels from end users.
      const lowered = rawError.toLowerCase();
      const isBackendDetail =
        lowered.includes('generateapieasytext') ||
        lowered.includes('api-easy') ||
        lowered.includes('veo-') ||
        lowered.includes('gemini-') ||
        lowered.includes('deepseek') ||
        lowered.includes('fal') ||
        lowered.includes('ltx') ||
        lowered.includes('timed out after');
      const friendly = isBackendDetail
        ? 'Our AI backend took too long or hit an error while building your website. Please try again in a minute or switch to a different model.'
        : rawError;

      throw new Error(friendly);
    }

    return data as T;
  }, []);

  const fillReferenceBgPrompt = useCallback(
    async (dataUrls: string[]) => {
      if (!user?.uid || dataUrls.length === 0) return;
      setRefBriefLoading(true);
      try {
        const res = await fetch('/api/3d-builder/reference-bg-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, images: dataUrls.slice(0, 4) }),
        });
        const data = await readApiResponse<{ prompt: string }>(res);
        const p = String(data.prompt || '').trim();
        if (p) {
          setInput((prev) => (prev.trim() ? prev : p.slice(0, chatPromptMaxChars)));
          push('system', 'Drafted a background prompt from your reference image(s). Edit it or tap Send.');
        }
      } catch {
        push(
          'system',
          '[INFO] Could not auto-draft from references — type a background description or send with images only.',
        );
      } finally {
        setRefBriefLoading(false);
      }
    },
    [user?.uid, readApiResponse, chatPromptMaxChars, push],
  );

  const onPickImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const MAX_DIM = 1200;
    const JPEG_QUALITY = 0.75;

    const compressImage = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const scale = MAX_DIM / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(dataUrl);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
        img.src = url;
      });

    const next: UploadedImage[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImage(file);
        next.push({ id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: file.name, dataUrl });
      } catch (err) {
        logger.warn('Image compression failed:', file.name);
      }
    }
    if (next.length > 0) {
      setUploadedImages((prev) => {
        const merged = [...prev, ...next].slice(0, 12);
        if ((step === 'idle' || step === 'describe') && user?.uid && !input.trim()) {
          void fillReferenceBgPrompt(merged.map((x) => x.dataUrl));
        }
        return merged;
      });
      if (siteCode) {
        push(
          'assistant',
          `${next.length} image(s) added. Mention where to place them in your website (example: "Put asset hero-shoe.png in hero right column").`,
        );
      } else {
        push(
          'assistant',
          `${next.length} reference image(s) added.${step === 'idle' || step === 'describe' ? ' Drafting a hero background prompt from your refs…' : ''}`,
        );
      }
    }
  }, [push, step, user?.uid, input, fillReferenceBgPrompt, siteCode]);

  // ─── Generate Image ──
  const generateImage = useCallback(async (prompt: string): Promise<string> => {
    if (!user?.uid) throw new Error('Authentication required. Please sign in to generate images.');
    const scopeId = activeProjectIdRef.current || `proj_${Date.now()}`;
    if (!activeProjectIdRef.current) setActiveProjectId(scopeId);
    generationProjectIdRef.current = scopeId;
    const recoveryStep: PipelineStep = bgImageUrl ? 'confirm-image' : 'describe';
    setStep('gen-image');
    push('system', 'Creating your background image…');
    let lastError: unknown = null;
    let data: { imageUrl: string } | null = null;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const assetsForAttempt = attempt <= 2 ? uploadedImages : [];
          const res = await fetch('/api/3d-builder/generate-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              aspectRatio: selectedAspectRatio,
              buildTarget,
              userId: user?.uid || null,
              userAssets: assetsForAttempt,
              displayImageModelId: BUILDER_FIXED_IMAGE_MODEL_ID,
              imageResolution: builderImageResolution,
            }),
          });
          data = await readApiResponse<{ imageUrl: string }>(res);
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 3) throw err;
          const msg = (err instanceof Error ? err.message : '').toLowerCase();
          if (attempt === 2 && (msg.includes('too large') || msg.includes('413') || msg.includes('payload'))) {
            push('system', 'Retrying…');
          } else {
            push('system', 'Retrying…');
          }
        }
      }
      if (!data) {
        throw (lastError instanceof Error ? lastError : new Error('Failed to generate image'));
      }
      if (activeProjectIdRef.current !== scopeId) return data.imageUrl;
      setBgImageUrl(data.imageUrl);
      appendGeneratedImageUrl(data.imageUrl);
      push('system', 'Background image ready', { imageUrl: data.imageUrl });
      push('assistant', 'Here is the generated background image. Use the action buttons below to confirm or regenerate.');
      setStep('confirm-image');
      return data.imageUrl;
    } catch (e) {
      setStep(recoveryStep);
      throw e;
    }
  }, [push, selectedAspectRatio, buildTarget, user?.uid, uploadedImages, readApiResponse, bgImageUrl, appendGeneratedImageUrl, builderImageResolution]);

  // ─── Generate Video ──
  const generateVideo = useCallback(async (
    imageUrl: string,
    animPrompt?: string,
    options?: { forceFL?: boolean },
  ): Promise<string> => {
    if (!user?.uid) throw new Error('Authentication required. Please sign in to generate videos.');
    const scopeId = activeProjectIdRef.current || `proj_${Date.now()}`;
    if (!activeProjectIdRef.current) setActiveProjectId(scopeId);
    generationProjectIdRef.current = scopeId;
    const recoveryStep: PipelineStep =
      videoBase64 || videoChain.length > 0 ? 'confirm-video' : 'confirm-image';
    setStep('gen-video');
    const flStartUrl =
      firstFrameUrl ?? (lastFrameUrl && bgImageUrl ? bgImageUrl : null);
    const usingFL = Boolean(
      flStartUrl && lastFrameUrl && (options?.forceFL === true || imageUrl === flStartUrl),
    );
    push('system', 'Creating video animation…');
    const forcedPrompt = [
      animPrompt || (usingFL
        ? 'Smoothly transition between the first and last frame with cinematic camera movement and depth.'
        : 'Slow cinematic camera drift with subtle depth and premium parallax motion.'),
      selectedAspectRatio === '9:16'
        ? 'STRICT OUTPUT RULE: render PORTRAIT only, 9:16 ratio, never landscape.'
        : selectedAspectRatio === '1:1'
          ? 'STRICT OUTPUT RULE: render SQUARE only, 1:1 ratio.'
          : 'STRICT OUTPUT RULE: render LANDSCAPE only, 16:9 ratio, never portrait 9:16.',
    ].join(' ');

    try {
    let acceptedVideo: string | null = null;
    let acceptedVideoFallback: string | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const resolvedDeviceId = getOrCreateDeviceId();
      const videoBody: Record<string, unknown> = {
        prompt: forcedPrompt,
        aspectRatio: selectedAspectRatio,
        userId: user?.uid || null,
        deviceId: resolvedDeviceId,
        resolution: videoQuality,
        sitePrompt: sitePrompt.trim() || undefined,
        bgPrompt: bgPrompt.trim() || undefined,
        displayVideoModelId: BUILDER_FIXED_VIDEO_MODEL_ID,
      };
      if (usingFL) {
        videoBody.firstFrameUrl = flStartUrl;
        videoBody.lastFrameUrl = lastFrameUrl;
      } else {
        videoBody.imageUrl = imageUrl;
      }
      const res = await fetch('/api/3d-builder/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoBody),
      });
      const data = await readApiResponse<{
        videoBase64?: string;
        videoUrl?: string;
      }>(res);

      const primaryVideoSrc = (data.videoBase64 || data.videoUrl) as string;
      const secondaryVideoSrc = (data.videoBase64 && data.videoUrl)
        ? (data.videoBase64 === primaryVideoSrc ? data.videoUrl : data.videoBase64)
        : null;
      if (!primaryVideoSrc) {
        throw new Error('Video API returned no playable source');
      }

      let metaWidth = 0;
      let metaHeight = 0;
      let aspectOk = true;
      try {
        const { width, height } = await getVideoDimensions(primaryVideoSrc);
        metaWidth = width;
        metaHeight = height;
        aspectOk = selectedAspectRatio === '9:16' ? height > width : width >= height;
      } catch (metaErr) {
        // If metadata probing fails (CORS/codec quirks), still accept and display the video.
        logger.warn('Video metadata probe failed');
        aspectOk = true;
      }
      if (aspectOk) {
        acceptedVideo = primaryVideoSrc;
        acceptedVideoFallback = secondaryVideoSrc || null;
        break;
      }

      if (attempt < 2) {
        const dimLabel = metaWidth && metaHeight ? `${metaWidth}x${metaHeight}` : 'unknown dimensions';
        push('system', 'Retrying…');
      }
    }

    if (!acceptedVideo) {
      throw new Error(`Video API returned wrong aspect ratio twice (${selectedAspectRatio} requested). Please retry.`);
    }

    if (activeProjectIdRef.current !== scopeId) return acceptedVideo;
    setVideoBase64(acceptedVideo);
    setVideoFallbackSrc(acceptedVideoFallback);
    setVideoChain(prev => [...prev, acceptedVideo!]);
    push('system', 'Video ready', {
      videoSrc: acceptedVideo,
      videoFallbackSrc: acceptedVideoFallback || undefined,
    });
    const chainCount = videoChain.length + 1;
    const canAddMore = chainCount < planVideoLimit;
    push('assistant', canAddMore
      ? `Video ${chainCount} ready. You can add another continuation video (up to ${planVideoLimit} for your plan) or proceed to build.`
      : 'Video ready. Use the action buttons below to continue or regenerate.');
    setStep('confirm-video');
    return acceptedVideo;
    } catch (e) {
      setStep(recoveryStep);
      throw e;
    }
  }, [
    push,
    selectedAspectRatio,
    user?.uid,
    readApiResponse,
    getOrCreateDeviceId,
    videoChain.length,
    planVideoLimit,
    firstFrameUrl,
    lastFrameUrl,
    bgImageUrl,
    videoQuality,
    videoBase64,
    sitePrompt,
    bgPrompt,
  ]);

  const SUBSCRIPTION_3D_TITLE = 'Subscription required';
  const SUBSCRIPTION_3D_DESCRIPTION =
    'The 3D Website Builder generates images, motion, frames, and a full site using paid credits. Choose Basic or higher to continue — compare plans on the next screen.';

  const onBrainstorm = useCallback(async () => {
    if (!input.trim() && uploadedImages.length === 0) return;
    if (sending) return;
    
    setSending(true);
    push('user', input || '[Uploaded image(s) for brainstorming]');
    push('system', 'Brainstorming a professional prompt using AI...');
    
    try {
      const chatHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.text }));

      const res = await fetch('/api/3d-builder/brainstorm-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: input,
          images: uploadedImages.map(img => img.dataUrl),
          messages: chatHistory,
        }),
      });
      const data = await readApiResponse<{ response?: string; prompt?: string }>(res);
      const response = data.response || data.prompt || '';
      if (response) {
        push('assistant', response);
        const promptMatch = response.match(/(?:Brand|Hero|Headline|Tagline)[^:]*:.*$/m);
        if (promptMatch || response.length > 100) {
          setInput(response.slice(0, chatPromptMaxChars));
        }
      }
    } catch (err: any) {
      push('system', `[ERROR] ${err.message || 'Brainstorming failed'}`);
    } finally {
      setSending(false);
    }
  }, [input, uploadedImages, sending, push, readApiResponse, chatPromptMaxChars, messages]);

  const enhancePrompt = useCallback(async (type: 'image' | 'video') => {
    if (!isProUser) {
      openUpgradePopup(SUBSCRIPTION_3D_TITLE, SUBSCRIPTION_3D_DESCRIPTION);
      return;
    }
    const source = type === 'image' ? input : animPromptInput;
    const trimmed = source.trim();
    if (!trimmed || !user?.uid) return;

    if (type === 'image') setEnhancingMain(true);
    else setEnhancingAnim(true);

    try {
      const res = await fetch('/api/3d-builder/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, type, userId: user.uid }),
      });
      const data = await readApiResponse<{ enhancedPrompt?: string }>(res);
      const enhanced = String(data.enhancedPrompt || '').trim();
      if (!enhanced) throw new Error('Enhancer returned empty prompt');

      const capped = enhanced.slice(0, chatPromptMaxChars);
      if (type === 'image') setInput(capped);
      else setAnimPromptInput(capped);
      push('system', '[ AI ] Prompt enhanced');
    } catch (err: any) {
      push('system', `[ERROR] ${err.message || 'Prompt enhancement failed'}`);
    } finally {
      if (type === 'image') setEnhancingMain(false);
      else setEnhancingAnim(false);
    }
  }, [
    input,
    animPromptInput,
    user?.uid,
    push,
    readApiResponse,
    chatPromptMaxChars,
    isProUser,
    openUpgradePopup,
  ]);

  const generateLastFrame = useCallback(async () => {
    if (!user?.uid || generatingLastFrame) return;
    const scopeId = activeProjectIdRef.current || `proj_${Date.now()}`;
    if (!activeProjectIdRef.current) setActiveProjectId(scopeId);
    generationProjectIdRef.current = scopeId;
    const customPrompt = lastFramePrompt.trim();
    const fallbackPrompt = (bgPrompt || sitePrompt || input || '').trim();
    const prompt = customPrompt || fallbackPrompt;
    if (!prompt) {
      push('system', '[INFO] Enter a prompt for the last frame, or add a website/background description first.');
      return;
    }
    setGeneratingLastFrame(true);
    push('system', '[ 02 ] Generating last frame image...');
    try {
      const res = await fetch('/api/3d-builder/generate-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt ? prompt : prompt + ' — cinematic end frame, same visual style and mood as a natural continuation.',
          aspectRatio: selectedAspectRatio,
          buildTarget,
          userId: user.uid,
          userAssets: [],
          displayImageModelId: BUILDER_FIXED_IMAGE_MODEL_ID,
          imageResolution: builderImageResolution,
        }),
      });
      const data = await readApiResponse<{ imageUrl: string }>(res);
      if (activeProjectIdRef.current !== scopeId) return;
      setLastFrameUrl(data.imageUrl);
      appendGeneratedImageUrl(data.imageUrl);
      push('system', '[ 02 ] ✓ Last frame generated', { imageUrl: data.imageUrl });
    } catch (err: any) {
      push('system', `[ERROR] ${err.message || 'Failed to generate last frame'}`);
    } finally {
      setGeneratingLastFrame(false);
    }
  }, [user?.uid, lastFramePrompt, bgPrompt, sitePrompt, input, selectedAspectRatio, buildTarget, push, readApiResponse, generatingLastFrame, appendGeneratedImageUrl, builderImageResolution]);

  const onConfirmImage = useCallback(async () => {
    if (!bgImageUrl || sending) return;
    setSending(true);
    try {
      const prompt = animPromptInput.trim() || undefined;
      if (prompt) push('assistant', `Using custom animation prompt: "${prompt}"`);
      await generateVideo(bgImageUrl, prompt);
      setAnimPromptInput('');
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [bgImageUrl, sending, animPromptInput, generateVideo, push]);

  const onRegenerateImage = useCallback(async () => {
    if (sending) return;
    setSending(true);
    try {
      push('assistant', 'Regenerating image...');
      await generateImage(bgPrompt);
      setAnimPromptInput('');
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [sending, push, generateImage, bgPrompt]);

  const onRegenerateVideo = useCallback(async () => {
    if (!bgImageUrl || sending) return;
    setSending(true);
    try {
      push('assistant', 'Regenerating video...');
      const regenStart = lastFrameUrl ? (firstFrameUrl ?? bgImageUrl) : bgImageUrl;
      await generateVideo(regenStart, animPromptInput.trim() || undefined, {
        forceFL: Boolean(lastFrameUrl),
      });
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [bgImageUrl, sending, push, generateVideo, animPromptInput, lastFrameUrl, firstFrameUrl]);

  const onPickFrameImage = useCallback(async (files: FileList | null, target: 'first' | 'last') => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'first') {
        setFirstFrameUrl(result);
        appendGeneratedImageUrl(result);
        push('system', `First frame image set: ${file.name}`);
      } else {
        setLastFrameUrl(result);
        appendGeneratedImageUrl(result);
        push('system', `Last frame image set: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  }, [push, appendGeneratedImageUrl]);

  const onConfirmFL = useCallback(async () => {
    const startUrl = firstFrameUrl ?? bgImageUrl;
    if (!startUrl || !lastFrameUrl || sending) return;
    setSending(true);
    try {
      push('assistant', 'Generating video from first → last frame (Premium motion)…');
      const prompt = animPromptInput.trim() || undefined;
      await generateVideo(startUrl, prompt, { forceFL: true });
      setAnimPromptInput('');
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [firstFrameUrl, lastFrameUrl, bgImageUrl, sending, animPromptInput, generateVideo, push]);

  const canProceedImageConfirm = Boolean(bgImageUrl);
  /** When a last frame exists, confirm runs first→last video; otherwise single-image motion. */
  const useFlConfirm = Boolean(lastFrameUrl && bgImageUrl);

  // ─── Prepare Website (frames + code) ──
  const prepareWebsite = useCallback(async (vidBase64: string) => {
    const scopeId = activeProjectIdRef.current || `proj_${Date.now()}`;
    if (!activeProjectIdRef.current) setActiveProjectId(scopeId);
    generationProjectIdRef.current = scopeId;
    const uid = user?.uid;
    if (!uid) {
      throw new Error('You must be signed in to generate the website. Please sign in with Google.');
    }
    setStep('preparing');

    const allVideos = videoChain.length > 0 ? [...videoChain] : [vidBase64];
    const allFrames: string[] = [];
    let globalDone = 0;
    const videoDurationSec = outputVideoDurationSec;
    const framesPerVideo = computeScrollFrameCount(videoDurationSec, extractionFps);
    const totalExpected = allVideos.length * framesPerVideo;
    const stitchedTimelineSec = allVideos.length * videoDurationSec;

    push(
      'system',
      `[ 04 ] Video → frames: ${allVideos.length} clip(s) × ~${framesPerVideo} frames @ ${extractionFps} FPS (≈${videoDurationSec}s each, ~${stitchedTimelineSec.toFixed(1)}s stitched) → up to ${totalExpected} scroll frames.`,
    );
    setFrameProgress({ done: 0, total: totalExpected });

    for (let vi = 0; vi < allVideos.length; vi++) {
      const vid = allVideos[vi];
      const frames = await videoToWebpFrames(vid, framesPerVideo, (done) => {
        setFrameProgress({ done: globalDone + done, total: totalExpected });
      });
      allFrames.push(...frames);
      globalDone += frames.length;
    }

    push('system', 'Making the scroll animation…');
    if (activeProjectIdRef.current !== scopeId) return;
    setWebpFrames(allFrames);
    setStep('gen-site');
    push('system', 'Building your website…');
    try {
      const resolvedDeviceId = getOrCreateDeviceId();
      const combinedSitePrompt = [sitePrompt.trim(), bgPrompt.trim()].filter(Boolean).join('\n\n—\n\n');
      const siteRes = await fetch('/api/3d-builder/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: combinedSitePrompt || sitePrompt,
          totalFrames: allFrames.length,
          buildTarget,
          userAssets: uploadedImages,
          userId: uid,
          deviceId: resolvedDeviceId,
          websiteModelId: BUILDER_FIXED_WEBSITE_MODEL_ID,
          graphicsStack: graphicsStackPicks,
        }),
      });
      const siteData = await readApiResponse<{
        code: string;
        billing?: { creditCost?: number; inputTokens?: number; outputTokens?: number };
      }>(siteRes);
      const code = siteData?.code;
      if (!code || typeof code !== 'string') {
        throw new Error('Website generation returned no code. Please try again.');
      }
      setSiteCode(code);
      setStep('ready');
      if (uid) {
        fetch('/api/3d-builder/confirm-site-built', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid }),
        }).catch(() => { });
      }
      if (siteData.billing?.creditCost) {
        push('system', 'Build complete');
      }
      safeSessionStorageSetItem(
        'draftly_build_hint',
        JSON.stringify({ t: `${sitePrompt}\n${bgPrompt}`.slice(0, 500) }),
      );
      void saveCurrentProject();
      setRightTab('launchpad');
      setMobilePane('workspace');
      push(
        'system',
        `Build complete — live preview is below. Open Full screen when you want: we wait ${Math.round(FULL_PREVIEW_HOLD_MS / 1000)}s, then load ${allFrames.length} frames over a short progress bar so scrolling stays smooth.`,
      );
    } catch (err: any) {
      const msg = err?.message || 'Website build failed';
      setError(msg);
      push('system', `[ERROR] ${msg}`);
      setStep('confirm-video');
    } finally {
      // Note: sending is managed by callers; keep consistent.
    }
  }, [
    push,
    sitePrompt,
    bgPrompt,
    uploadedImages,
    user?.uid,
    extractionFps,
    videoChain,
    readApiResponse,
    getOrCreateDeviceId,
    buildTarget,
    saveCurrentProject,
    outputVideoDurationSec,
    graphicsStackPicks,
  ]);

  const onConfirmVideo = useCallback(async () => {
    if (!videoBase64 || sending) return;
    // Enforce "full 3D sites per month" limit for non-owner users before starting a new full build.
    // Iterations (edits) are handled server-side by passing `existingCode`, which sets `isIteration=true`.
    const sites3DUsedNow = generationTracking.sites3DGenerated || 0;
    const sitesLimitMap: Record<string, number> = {
      free: 0,
      tester: 1,
      testing: 1,
      basic: 2,
      'basic-plus': 2,
      pro: 4,
      premium: 10,
    };
    const sites3DTotalNow = isOwner ? 999999 : (sitesLimitMap[subscription.plan] ?? 0);

    if (!isOwner && sites3DTotalNow > 0 && sites3DUsedNow >= sites3DTotalNow) {
      openUpgradePopup(
        'Upgrade Required',
        `You've reached your monthly 3D website limit (${sites3DUsedNow}/${sites3DTotalNow}) on ${subscription.plan}. Upgrade to generate more websites.`
      );
      push('assistant', 'Upgrade to generate more 3D websites this month.');
      return;
    }
    setSending(true);
    try {
      await prepareWebsite(videoBase64);
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
      setStep('confirm-video');
    } finally {
      setSending(false);
    }
  }, [
    videoBase64,
    sending,
    prepareWebsite,
    push,
    isOwner,
    generationTracking.sites3DGenerated,
    subscription.plan,
    openUpgradePopup,
  ]);

  // ─── Handle Send ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const allowDescribeWithoutText = step === 'describe' && uploadedImages.length > 0;
    const allowIdleWithRefsOnly = step === 'idle' && uploadedImages.length > 0;
    if (sending) return;
    if (!text && !allowDescribeWithoutText && !allowIdleWithRefsOnly) return;

    // Guard: wait for Firebase auth to resolve before calling any API.
    if (authLoading) {
      push('system', '[INFO] Waiting for authentication to load, please try again in a moment.');
      return;
    }
    if (!user?.uid) {
      push('system', '[ERROR] You must be signed in to use the 3D Builder. Please sign in with Google.');
      return;
    }

    const intent = detectIntegrationChatIntent(text.trim());
    if (intent) {
      push('user', text.trim());
      setInput('');
      setSending(false);
      if (intent.type === 'wizard') {
        const def = getIntegrationDefinition(intent.integrationId);
        const name = def?.name || intent.integrationId;
        push('assistant', `Connect ${name} in one tap.`, {
          integrationHint: { kind: 'connect', integrationIds: [intent.integrationId] },
        });
      } else {
        push('assistant', intent.assistantText, {
          integrationHint: { kind: 'suggest', integrationIds: intent.integrationIds },
        });
      }
      return;
    }

    if (step === 'idle' && !activeProjectIdRef.current) {
      const newId = `proj_${Date.now()}`;
      setActiveProjectId(newId);
      generationProjectIdRef.current = newId;
    } else if (step !== 'idle' && step !== 'ready') {
      generationProjectIdRef.current = activeProjectIdRef.current;
    }
    setInput('');
    setSending(true);

    const describeBgFromRefs =
      'Create a cinematic full-bleed hero background that matches the uploaded reference image(s): preserve product identity, materials, lighting mood, and palette. No generic stock look.';
    const idleSiteFromRefs =
      'Landing page for the product or brand shown in the uploaded reference image(s). Follow the references for category, tone, and visual direction.';

    try {
      if (step === 'idle') {
        const siteText = text || (allowIdleWithRefsOnly ? idleSiteFromRefs : '');
        if (!siteText) {
          push('system', 'Describe your site or add reference images with the + button.');
          setSending(false);
          return;
        }

        const promptIntent = detectIntent(siteText);
        if (promptIntent === 'fullstack') {
          push('user', text || '[Reference images — site intent from uploads]');
          push('assistant', 'Detected a full-stack app request. Redirecting to Full App Builder...');
          const payload = { v: 1, sitePrompt: siteText, bgPrompt: '', chatDraft: siteText };
          safeSessionStorageSetItem('draftly_full_app_handoff', JSON.stringify(payload));
          setSending(false);
          if (typeof window !== 'undefined') window.location.href = '/full-app-builder';
          return;
        }

        push('user', text || '[Reference images — site intent from uploads]');
        setSitePrompt(siteText);
        push('assistant', 'Next: describe the background look — or send empty with refs.');
        setStep('describe');
      } else if (step === 'describe') {
        const bgText = text || (allowDescribeWithoutText ? describeBgFromRefs : '');
        if (!bgText) {
          push('system', 'Describe the background or keep reference images and send again to generate from them.');
          setSending(false);
          return;
        }
        push('user', text || '[Reference images — background from uploads]');
        setBgPrompt(bgText);
        await generateImage(bgText);
      } else if (step === 'confirm-image') {
        if (text) push('user', text);
        push('assistant', 'Use Confirm or Regenerate above the box.');
      } else if (step === 'confirm-video') {
        if (text) push('user', text);
        push('assistant', 'Use Continue or Regenerate above the box.');
      } else if (step === 'ready' && siteCode) {
        if (!isProUser) {
          openUpgradePopup(
            'Upgrade Required',
            'The 3D Website Builder is a premium feature. Upgrade to Tester or higher to continue.',
          );
          push('assistant', 'Upgrade required to edit or download 3D Builder projects.');
          setSending(false);
          return;
        }

        push('user', text);
        push('assistant', 'Updating your site…');
        const finalPrompt = buildSiteIterationPrompt(text, messages, chatPromptMaxChars);
        setStep('gen-site');
        const resolvedDeviceId = getOrCreateDeviceId();
        const res = await fetch('/api/3d-builder/generate-site', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            totalFrames: webpFrames.length,
            existingCode: siteCode,
            buildTarget,
            userAssets: uploadedImages,
            userId: user?.uid || null,
            deviceId: resolvedDeviceId,
            websiteModelId: BUILDER_FIXED_WEBSITE_MODEL_ID,
            graphicsStack: graphicsStackPicks,
          }),
        });
        const data = await readApiResponse<{
          code: string;
          billing?: { creditCost?: number; inputTokens?: number; outputTokens?: number };
        }>(res);
        setSiteCode(data.code);
        setStep('ready');
        const siteAiLabel = getWebsiteDisplayModelById(BUILDER_FIXED_WEBSITE_MODEL_ID).label;
        push('system', `✓ Website updated — ${siteAiLabel}`);
      }
    } catch (err: any) {
      setError(err.message);
      push('system', `[ERROR] ${err.message}`);
      if (
        typeof err?.message === 'string' &&
        (/requires upgrade|exclusively available for paid plans/i.test(err.message))
      ) {
        refreshSubscription(); // Reconcile from Dodo in case user paid but subscription wasn't synced
        openUpgradePopup(
          'Upgrade Required',
          'The 3D Website Builder is a premium feature. Please upgrade your plan to continue.',
        );
      }
      // Restore a usable step after site iteration errors (gen-site); image/video flows reset their own steps.
      if (siteCode) {
        setStep('ready');
      }
    }
    setSending(false);
  }, [input, sending, step, bgPrompt, bgImageUrl, videoBase64, siteCode, webpFrames.length, sitePrompt, messages, chatPromptMaxChars, push, generateImage, generateVideo, prepareWebsite, isProUser, activeProjectId, buildTarget, uploadedImages, uploadedImages.length, user?.uid, authLoading, readApiResponse, openUpgradePopup, getOrCreateDeviceId, refreshSubscription, graphicsStackPicks]);

  const downloadZip = useCallback(async () => {
    if (!siteCode) return;

    if (!canExportZipUser) {
      openUpgradePopup(
        'Premium required for ZIP',
        'ZIP download and self-hosting export are included on Premium ($200/mo) and above. Build on Basic or Pro, then upgrade when you are ready to host or export.',
      );
      push('assistant', 'Premium ($200/mo)+ required to download your project as a ZIP.');
      return;
    }
    push('system', '[ ZIP ] Bundling files...');
    const zip = new JSZip();
    const { indexHtml, cssText, jsText } = splitGeneratedSiteFiles(siteCode);
    zip.file('index.html', indexHtml);
    zip.folder('assets')?.folder('css')?.file('main.css', cssText || '/* Styles generated inline by AI */');
    zip.folder('assets')?.folder('js')?.file('main.js', jsText || '// Script generated inline by AI');
    if (webpFrames.length) {
      const folder = zip.folder('frames-jpg')!;
      webpFrames.forEach((d, i) => folder.file(`frame_${String(i + 1).padStart(6, '0')}.jpg`, d.split(',')[1], { base64: true }));
    }
    if (uploadedImages.length) {
      const uploads = zip.folder('assets')?.folder('uploads');
      const map: Record<string, string> = {};
      uploadedImages.forEach((img, idx) => {
        const mt = (img.dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/) || [])[1] || 'image/png';
        const ext = mt.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const safe = `${String(idx + 1).padStart(2, '0')}_${img.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`.replace(/\.(png|jpg|jpeg|webp|gif)\.(png|jpg|jpeg|webp|gif)$/i, '.$2');
        const b64 = img.dataUrl.split(',')[1];
        if (b64) uploads?.file(safe, b64, { base64: true });
        map[img.id] = `assets/uploads/${safe}`;
      });
      let withAssets = indexHtml;
      const assetsScript = `<script>window.__USER_ASSETS=${JSON.stringify(map)};</script>`;
      withAssets = withAssets.includes('<head>') ? withAssets.replace('<head>', '<head>' + assetsScript) : assetsScript + withAssets;
      zip.file('index.html', withAssets);
      zip.file('frontend/index.html', withAssets);
    }
    const apiPort = 8787;
    const rootPackageJson = {
      name: 'draftly-fullstack-site',
      private: true,
      version: '1.0.0',
      scripts: {
        start: 'npx serve . -l 3000',
        'dev:api': 'npm --prefix backend run dev',
        'dev:web': 'npx serve frontend -l 3000',
      },
    };
    zip.file('package.json', JSON.stringify(rootPackageJson, null, 2));
    zip.file('frontend/index.html', indexHtml);
    zip.folder('frontend')?.folder('assets')?.folder('css')?.file('main.css', cssText || '/* Styles generated inline by AI */');
    zip.folder('frontend')?.folder('assets')?.folder('js')?.file('main.js', jsText || '// Script generated inline by AI');
    if (webpFrames.length) {
      const ffolder = zip.folder('frontend')?.folder('frames-jpg');
      webpFrames.forEach((d, i) => ffolder?.file(`frame_${String(i + 1).padStart(6, '0')}.jpg`, d.split(',')[1], { base64: true }));
    }

    const backendPackage = {
      name: 'draftly-site-backend',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'node --watch src/server.js',
        start: 'node src/server.js',
      },
      dependencies: {
        cors: '^2.8.5',
        express: '^4.21.2',
      },
    };
    zip.file('backend/package.json', JSON.stringify(backendPackage, null, 2));
    zip.file(
      'backend/src/server.js',
      `import express from 'express';\nimport cors from 'cors';\n\nconst app = express();\napp.use(cors());\napp.use(express.json({ limit: '5mb' }));\n\nlet leads = [];\n\napp.get('/api/health', (_req, res) => {\n  res.json({ ok: true, service: 'draftly-site-backend' });\n});\n\napp.post('/api/contact', (req, res) => {\n  const { name, email, message } = req.body || {};\n  if (!name || !email || !message) {\n    return res.status(400).json({ error: 'name, email and message are required' });\n  }\n  const item = { id: String(Date.now()), name, email, message, createdAt: new Date().toISOString() };\n  leads.unshift(item);\n  if (leads.length > 200) leads = leads.slice(0, 200);\n  return res.json({ success: true, item });\n});\n\napp.get('/api/leads', (_req, res) => {\n  res.json({ items: leads });\n});\n\nconst port = Number(process.env.PORT || ${apiPort});\napp.listen(port, () => {\n  console.log('API running on http://localhost:' + port);\n});\n`,
    );
    const envExample = `# Copy this file to .env and fill in your keys
# Get these from your connected services (Settings → Integrations on draftly.space)

# Supabase (database, auth, storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase (optional - for your own Firebase project)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
`;
    zip.file('.gitignore', `.env\n.env.local\nnode_modules/\n`);
    zip.file('.env.example', envExample);
    zip.file('frontend/.env.example', envExample);
    const readmeContent = `# Draftly 3D Website Export

## Quick Start (Windows, Mac, Linux)

1. **Unzip** this folder to your computer.
2. **Open Terminal** (Command Prompt on Windows, Terminal on Mac/Linux) in the extracted folder.
3. **Run** one of these commands:
   - \`npx serve . -l 3000\` — serves the site (no install needed)
   - Or: \`npm run start\` — if you prefer the npm script
4. **Open** http://localhost:3000 in your browser.

## Structure

- \`index.html\` — main website
- \`assets/\` — CSS, JS, and uploads
- \`frames-jpg/\` — scroll-driven frame sequence
- \`frontend/\` — same content for alternate setup
- \`backend/\` — optional Express API (contact form, leads)

## Run Backend (optional)

\`\`\`
cd backend
npm install
npm run dev
\`\`\`

## Notes

- View and edit on your own computer for full environment control.
- Full application hosting services are coming soon.
`;
    zip.file('README.md', readmeContent);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '3d-website.zip'; a.click();
    URL.revokeObjectURL(url);
    push('system', '[ ZIP ] ✓ Download started');
  }, [siteCode, webpFrames, push, siteRenderMode, videoBase64, uploadedImages, canExportZipUser, openUpgradePopup]);

  // ─── Publish to Draftly subdomain ──
  const publishSite = useCallback(async () => {
    if (!user || !activeProjectId) return;
    setPublishLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/hosting/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      const data = await res.json() as { ok?: boolean; url?: string; subdomain?: string; error?: string };
      if (!res.ok || !data.ok) {
        push('system', `[ Publish ] Error: ${data.error || 'Unknown error'}`);
        return;
      }
      setPublishedUrl(data.url || null);
      push('system', `[ Publish ] Site live at: ${data.url}`);
    } catch (e) {
      push('system', `[ Publish ] Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPublishLoading(false);
    }
  }, [user, activeProjectId, push]);

  // ─── Placeholder ──
  const placeholder = step === 'idle' ? 'Describe the website you want to build...' :
    step === 'describe' ? 'Describe the background vibe & style...' :
      step === 'confirm-image' ? 'Optional: describe camera motion (e.g. "slow pan right")...' :
        step === 'confirm-video' ? 'Optional: extra instructions for layout...' :
          step === 'ready'
            ? 'Preview your site above, or describe changes to iterate...'
            : 'Processing — please wait...';

  useEffect(() => {
    const hasRealMessages = messages.some(m => m.role !== 'system');
    if (!sitePrompt && !bgPrompt && !siteCode && !hasRealMessages) return;
    const t = setTimeout(() => saveProjectLocalOnly(), 250);
    return () => clearTimeout(t);
  }, [messages, siteCode, sitePrompt, bgPrompt, bgImageUrl, buildTarget, siteRenderMode, uploadedImages, webpFrames, videoBase64, videoChain, saveProjectLocalOnly]);

  useEffect(() => {
    if (!user?.uid) return;
    const hasRealMessages = messages.some(m => m.role !== 'system');
    if (!sitePrompt && !bgPrompt && !siteCode && !hasRealMessages) return;
    const t = setTimeout(() => void saveProjectCloudOnly(), cloudSaveDebounceMs);
    return () => clearTimeout(t);
  }, [
    messages,
    siteCode,
    sitePrompt,
    bgPrompt,
    bgImageUrl,
    buildTarget,
    siteRenderMode,
    uploadedImages,
    webpFrames,
    videoBase64,
    videoChain,
    user?.uid,
    saveProjectCloudOnly,
    cloudSaveDebounceMs,
  ]);

  // Save on page unload so project persists when user leaves
  useEffect(() => {
    const onBeforeUnload = () => { saveCurrentProject(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveCurrentProject]);

  const wasBuildReadyRef = useRef(false);
  // Track first ready-with-code per project; don't reset during gen-site iterations (same siteCode).
  useEffect(() => {
    const ready = step === 'ready' && !!siteCode;
    if (ready && !wasBuildReadyRef.current) {
      wasBuildReadyRef.current = true;
      setRightTab('launchpad');
    }
    if (!siteCode) {
      wasBuildReadyRef.current = false;
      setRightTab((t) => (t === 'launchpad' ? 'pipeline' : t));
    }
  }, [step, siteCode]);

  const canType = ['idle', 'describe', 'confirm-image', 'confirm-video', 'ready'].includes(step);
  const showBuildChoice = false; // Disabled by user request: auto-detect or default to frontend

    const shipDashboard = step === 'ready' && !!siteCode;
    // ─── Available tabs ──
    const tabs: { id: RightTab; label: string; visible: boolean }[] = [
      ...(shipDashboard ? [{ id: 'launchpad' as const, label: 'Ship', visible: true }] : []),
      { id: 'pipeline', label: shipDashboard ? 'Build log' : 'Pipeline', visible: true },
      {
        id: 'image',
        label: generatedImageUrls.length > 1 ? `Images (${generatedImageUrls.length})` : 'Image',
        visible: !!bgImageUrl || generatedImageUrls.length > 0,
      },
      { id: 'video', label: videoChain.length > 1 ? `Videos (${videoChain.length})` : 'Video', visible: !!videoBase64 || videoChain.length > 0 },
      { id: 'frames', label: `Frames${webpFrames.length ? ` (${webpFrames.length})` : ''}`, visible: webpFrames.length > 0 },
      { id: 'code', label: 'Code', visible: !!siteCode },
    ];

  // Credit calculations for display (synced with subscription-plans.ts)
  // Owner/dev accounts get unlimited credits
  const creditsUsed = generationTracking.creditsUsed || 0;
  const customStudioCredits = (subscription as unknown as Record<string, unknown>).customStudioCredits;
  const creditsTotal = isOwner
    ? 999999
    : typeof customStudioCredits === 'number'
      ? customStudioCredits
      : isTestingCreditsEmail(user?.email)
        ? PLAN_LIMITS.testing.credits
        : ({ free: 0, tester: 200, testing: PLAN_LIMITS.testing.credits, basic: 1500, 'basic-plus': 2500, pro: 6000, premium: 25000, agency: 100000 }[
            subscription.plan
          ] ?? 0);
  const creditsRemaining = isOwner ? 999999 : Math.max(0, creditsTotal - creditsUsed);
  const sites3DUsed = generationTracking.sites3DGenerated || 0;
  const sites3DTotal = isOwner
    ? 999999
    : isTestingCreditsEmail(user?.email)
      ? PLAN_LIMITS.testing.sites3D
      : ({ free: 0, tester: 1, testing: 1, basic: 2, 'basic-plus': 2, pro: 4, premium: 10, agency: 50 }[subscription.plan] ?? 0);

  const workspacePreviewVideoSrc = videoBase64 || (videoChain.length ? videoChain[0] : '');

  // Wait for auth only. Subscription defaults are safe; Firestore onSnapshot can stall on Safari (ITP / persistence),
  // which previously left subLoading true forever and blocked the whole builder (user only saw global layout textures).
  if (authLoading) {
    return <BuilderLoadingFallback />;
  }

  return (
    <div className="draftly-builder-viewport fixed inset-0 z-[1] isolate font-sans text-white overflow-hidden flex flex-col bg-[#070810] min-h-0">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 108, 255, 0.18), transparent),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(0, 212, 170, 0.06), transparent),
            radial-gradient(ellipse 50% 30% at 0% 80%, rgba(99, 102, 241, 0.1), transparent)
          `,
        }}
      />

      <BuilderTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => {
          setShowTutorial(false);
          safeLocalStorageSetItem('draftly_builder_tutorial_seen', 'true');
        }}
      />

      {/* Credit Warning Banner (hidden for owner/dev accounts) */}
      {!isOwner && <CreditWarning remaining={creditsRemaining} total={creditsTotal} />}

      {/* Dashboard top bar */}
      <header className="relative z-20 flex-shrink-0 min-h-[52px] border-b border-white/[0.07] flex items-center px-3 md:px-5 gap-2 md:gap-4 bg-[#0a0d14]/95 backdrop-blur-xl [transform:translateZ(0)] pt-[max(0px,env(safe-area-inset-top))]">
        <Link href="/" onClick={guardNavigateFromBuilder} className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-600/20 border border-white/10 flex items-center justify-center group-hover:border-blue-400/40 transition-colors">
            <div className="w-2 h-2 rounded-sm bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
          </div>
          <span className="font-display text-[13px] font-semibold tracking-tight text-white/95 group-hover:text-white transition-colors hidden sm:inline">Draftly</span>
        </Link>
        <div className="hidden sm:block w-px h-5 bg-white/10" />
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
          <h1 className="font-display text-[13px] md:text-[15px] font-semibold tracking-tight text-white truncate">3D Builder</h1>
          <span className="text-[10px] md:text-[11px] text-white/40 font-medium hidden md:inline">Studio dashboard</span>
        </div>
        <span
          className={`hidden lg:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
            isProUser
              ? 'bg-blue-500/15 text-blue-200 border-blue-400/25'
              : 'bg-white/[0.04] text-white/45 border-white/10'
          }`}
        >
          {isProUser
            ? `${(isOwner ? 'DEV' : isTestingCreditsEmail(user?.email) ? 'testing' : subscription.plan || 'pro').toUpperCase()}`
            : 'Upgrade to build'}
        </span>
        <div className="hidden md:flex items-center gap-1 ml-1 p-0.5 rounded-lg bg-black/30 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              if (isWebsiteGenerating) return;
              setBuildTarget('desktop');
              setMediaAspectRatio('16:9');
            }}
            disabled={isWebsiteGenerating}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mediaAspectRatio === '16:9'
                ? 'bg-white text-[#0a0d14] shadow-sm'
                : 'text-white/55 hover:text-white/90'
            }`}
          >
            16:9
          </button>
          <button
            type="button"
            onClick={() => {
              if (isWebsiteGenerating) return;
              setBuildTarget('mobile');
              setMediaAspectRatio('9:16');
            }}
            disabled={isWebsiteGenerating}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mediaAspectRatio === '9:16'
                ? 'bg-white text-[#0a0d14] shadow-sm'
                : 'text-white/55 hover:text-white/90'
            }`}
          >
            9:16
          </button>
          <button
            type="button"
            onClick={() => {
              if (isWebsiteGenerating) return;
              setBuildTarget('desktop');
              setMediaAspectRatio('1:1');
            }}
            disabled={isWebsiteGenerating}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mediaAspectRatio === '1:1'
                ? 'bg-white text-[#0a0d14] shadow-sm'
                : 'text-white/55 hover:text-white/90'
            }`}
          >
            1:1
          </button>
        </div>
        <div className="flex-1 min-w-[8px]" />
        <BuilderIntegrationBar />
        <Link
          href="/business?from=build"
          onClick={guardNavigateFromBuilder}
          className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors shrink-0 ${
            step === 'ready' && siteCode
              ? 'border border-teal-400/40 bg-teal-500/15 text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.14)] ring-1 ring-teal-400/25 hover:bg-teal-500/20 hover:text-white'
              : 'border border-white/[0.1] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
          }`}
          title={step === 'ready' && siteCode ? 'Optional: hosting, ZIP, integrations in Business OS' : 'Business OS'}
        >
          <i className="fa-solid fa-gauge-high text-[9px] text-teal-300/90" aria-hidden />
          Business OS
        </Link>
        <div className="md:hidden flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobilePane('chat')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              mobilePane === 'chat'
                ? 'bg-blue-500/25 text-white border-blue-400/35'
                : 'bg-white/[0.04] text-white/55 border-white/10'
            }`}
          >
            Copilot
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('workspace')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              mobilePane === 'workspace'
                ? 'bg-blue-500/25 text-white border-blue-400/35'
                : 'bg-white/[0.04] text-white/55 border-white/10'
            }`}
          >
            Preview
          </button>
        </div>
        {!canType && step !== 'ready' && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1">
            <motion.div
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-teal-400"
            />
            <span className="text-[11px] text-white/75 font-medium">Working…</span>
          </div>
        )}
        {step === 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 shrink-0"
            id="header-preview-actions"
          >
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!!loadingProjectId || !siteCode}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-white/[0.08] border border-white/15 text-white/90 hover:bg-white/[0.12] transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Full screen
            </button>
          </motion.div>
        )}

        {isProUser && (
          <CreditTracker
            creditsUsed={creditsUsed}
            creditsTotal={creditsTotal}
            plan={isOwner ? 'owner' : subscription.plan}
            sitesUsed={sites3DUsed}
            sitesTotal={sites3DTotal}
            isUnlimited={isOwner}
          />
        )}
      </header>

      {showLocalPersistenceReminder && !persistenceTipDismissed && (
        <div
          role="status"
          className="relative z-30 flex-shrink-0 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/[0.14] to-amber-600/[0.08] px-3 py-2.5 md:px-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
        >
          <p className="text-[11px] md:text-[12px] text-amber-50/95 leading-snug flex-1">
            <span className="font-semibold text-amber-100">Your project is saved to the cloud</span> — you can reload or switch devices and it will be there.{' '}
            Large frame sets are stored locally for fast preview. <span className="font-semibold text-amber-100">Premium</span> includes ZIP export and keeps up to 30 projects.{' '}
            Your plan keeps the <span className="font-semibold">{planCloudProjectLimit(subscription.plan)} most recent</span> projects in cloud.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/pricing#pricing"
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white text-amber-950 hover:bg-amber-50 whitespace-nowrap shadow-sm"
            >
              Compare plans
            </Link>
            <button
              type="button"
              onClick={() => setPersistenceTipDismissed(true)}
              className="text-[10px] font-semibold text-amber-100/90 hover:text-white px-2 py-1 rounded-md hover:bg-white/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex min-h-0 flex-col md:flex-row pb-[env(safe-area-inset-bottom)] [transform:translateZ(0)]">

        {/* ── Copilot (chat) ── */}
        <div
          id="chat-panel"
          data-draftly-chat-panel
          className={`w-full md:flex-shrink-0 flex-col relative border-r border-white/[0.06] bg-[#080a11]/95 backdrop-blur-md shadow-[12px_0_40px_rgba(0,0,0,0.35)] [transform:translateZ(0)] ${mobilePane === 'chat' ? 'flex' : 'hidden md:flex'} ${chatCollapsed ? 'min-h-0' : ''}`}
          style={{ '--chat-w': `${chatWidth}px` } as React.CSSProperties}
        >
          <style>{`@media (min-width: 768px) { [data-draftly-chat-panel] { width: var(--chat-w, 420px) !important; } }`}</style>

          <div id="chat-header" className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3 bg-gradient-to-r from-blue-500/[0.07] via-transparent to-teal-500/[0.05]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/25 text-blue-200">
              <i className="fa-solid fa-comments text-[14px]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <div>
                <div className="font-display text-[13px] font-semibold text-white tracking-tight">Copilot</div>
                <div className="text-[10px] text-white/70 font-medium">Type less. Tap more.</div>
              </div>
              <InfoTip title="Copilot">
                Hover the (i) chips under Pipeline for steps. Ask for payments or login with phrases like “connect stripe” —
                you’ll get one-tap links to connect tools.
              </InfoTip>
            </div>
            {isGenerating && (
              <span className="text-[10px] text-teal-300/95 font-medium flex items-center gap-1.5 shrink-0">
                <i className="fa-solid fa-circle-notch fa-spin" aria-hidden />
                Running
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowStepGuide((v) => !v)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  showStepGuide
                    ? 'bg-blue-500/25 text-blue-100 border border-blue-400/30'
                    : 'bg-white/[0.04] text-white/45 hover:text-white/85 hover:bg-white/[0.08] border border-transparent'
                }`}
                title="Toggle guide"
              >
                <i className="fa-solid fa-map text-[11px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setShowProjectsPanel((v) => !v)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  showProjectsPanel
                    ? 'bg-teal-500/25 text-teal-100 border border-teal-400/30'
                    : 'bg-white/[0.04] text-white/45 hover:text-white/85 hover:bg-white/[0.08] border border-transparent'
                }`}
                title="My projects"
              >
                <i className="fa-solid fa-folder-open text-[11px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={createNewProject}
                disabled={isGenerating}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/45 hover:text-white/85 hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50"
                title="New project"
              >
                <i className="fa-solid fa-plus text-[11px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={saveCurrentProject}
                disabled={isGenerating}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/45 hover:text-white/85 hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50"
                title="Save project"
              >
                <i className="fa-solid fa-floppy-disk text-[11px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setChatCollapsed((c) => !c)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/45 hover:text-white/85 hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                title={chatCollapsed ? 'Expand copilot' : 'Collapse copilot'}
              >
                <i className={`fa-solid ${chatCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-[11px]`} aria-hidden />
              </button>
            </div>
          </div>

          {!chatCollapsed && (
          <>
          {/* Projects panel */}
          <AnimatePresence>
            {showProjectsPanel && user && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-white/[0.06]"
              >
                <div className="px-3 py-3 bg-[#060810] max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-folder-open text-teal-400/90 text-[11px]" aria-hidden />
                      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-white/50">My Projects</span>
                      <span className="text-[10px] text-white/30 font-mono">{projects.length}</span>
                    </div>
                  </div>
                  {(() => {
                    if (isOwner) return null;
                    const limit = planCloudProjectLimit(subscription.plan);
                    if (limit <= 0 || limit >= 30) return null;
                    return (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-[11px] leading-snug">
                        <i className="fa-solid fa-cloud text-[10px] mr-1.5" />
                        Cloud saves: <span className="font-semibold">{limit} most recent</span> projects kept. Older ones are removed automatically.{' '}
                        <a href="/pricing" className="underline underline-offset-2 hover:text-amber-200">Upgrade</a> for more.
                      </div>
                    );
                  })()}
                  {projects.length === 0 ? (
                    <p className="text-[11px] text-white/35 text-center py-6">No saved projects yet. Build your first site above.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { loadProject(p); setShowProjectsPanel(false); }}
                          disabled={isGenerating || !!loadingProjectId}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all disabled:opacity-40 ${
                            activeProjectId === p.id
                              ? 'border-teal-500/30 bg-teal-500/10'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-white/90 truncate">{p.name || 'Untitled'}</span>
                            {activeProjectId === p.id && (
                              <span className="text-[9px] font-bold text-teal-300 bg-teal-500/15 px-1.5 py-0.5 rounded shrink-0">Active</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-white/35">
                              {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {p.siteCode && <span className="text-[9px] text-emerald-400/70 font-medium">Built</span>}
                            {!p.siteCode && p.sitePrompt && <span className="text-[9px] text-amber-400/70 font-medium">Draft</span>}
                          </div>
                          {p.sitePrompt && (
                            <p className="text-[10px] text-white/30 mt-1 truncate">{p.sitePrompt.slice(0, 80)}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {user && (
            <div className="px-3 pt-3 pb-3 border-b border-white/[0.06] bg-[#06080e]">
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-route text-blue-400/90 text-[11px]" aria-hidden />
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-white/50">Pipeline</span>
              </div>
              <div className="flex items-stretch gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-white/15">
                {PIPELINE_NODES.map((node) => {
                  const st = getNodeStatus(node, step);
                  return (
                    <div
                      key={node.id}
                      className={`flex-shrink-0 min-w-[4.5rem] rounded-xl px-2.5 py-2 border transition-all ${
                        st === 'active'
                          ? 'border-blue-400/45 bg-blue-500/12 shadow-[0_0_24px_rgba(59,130,246,0.15)]'
                          : st === 'complete'
                            ? 'border-teal-500/20 bg-teal-500/[0.06]'
                            : 'border-white/[0.06] bg-white/[0.02] opacity-55'
                      }`}
                    >
                      <div className="text-[9px] font-mono text-white/50 mb-0.5">{node.num}</div>
                      <div className="text-[10px] font-semibold text-white/95 leading-tight">{node.title}</div>
                      {st === 'active' && <div className="mt-1.5 h-0.5 rounded-full bg-blue-400/90 animate-pulse" />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InfoTip title="Chat">
                  Keep messages short. The right panel shows your site, video, and stills as they’re created.
                </InfoTip>
                <InfoTip title="Decisions">
                  When it’s time to approve an image or clip, Confirm and Regenerate show above the message box — not in long
                  chat replies.
                </InfoTip>
                <InfoTip title="After your site is built">
                  You’ll land in Business Suite. Big icons at the top are for Stripe, Firebase, Supabase, analytics, and email.
                </InfoTip>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mt-4">
                <h3 className="font-display text-[16px] font-semibold text-white tracking-tight">Start here</h3>
                <p className="text-[12px] text-white/50 leading-snug max-w-[280px]">
                  Say what you’re building. Watch the preview on the right.
                </p>

                {/* Sign-in gate — shown when auth resolved and user is not logged in */}
                {!authLoading && !user && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 space-y-3">
                    <p className="text-[13px] text-amber-100 font-semibold">Get started with a quick onboarding</p>
                    <p className="text-[12px] text-amber-100/70">
                      Answer a few questions, see which plan fits you (from Basic Plus at $40/mo), then sign in with Google.
                    </p>
                    <Link
                      href="/onboarding"
                      className="w-full py-2.5 rounded-lg bg-white text-black text-[12px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-[13px]" />
                      Start onboarding
                    </Link>
                  </div>
                )}

                {/* Auth loading state */}
                {authLoading && (
                  <div className="flex items-center gap-2 text-white/40 text-[12px]">
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-white/40" />
                    Checking authentication...
                  </div>
                )}

                  {/* Build mode choice removed per user request */}

                <AnimatePresence>
                  {showStepGuide && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fa-solid fa-list-check text-white/70 text-[11px]"></i>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">Quick Guide</span>
                        </div>
                        <div className="space-y-3.5">
                          {[
                            {
                              icon: 'fa-pen-nib',
                              title: 'Describe the website',
                              detail:
                                'First message: brand, audience, nav labels, hero headline + subline, CTAs, and each section you want below the scroll. This drives HTML copy and layout — not the cinematic background.',
                            },
                            {
                              icon: 'fa-image',
                              title: 'Describe the background',
                              detail:
                                'Second message: only the world behind the UI — lighting, lens, mood, setting, motion feel (16:9). No logos or button copy here; that belongs in step 1.',
                            },
                            {
                              icon: 'fa-check-double',
                              title: 'Lock the still',
                              detail:
                                'Confirm or regenerate the hero image. Optional: first→last frame mode (paid) for motion between two stills. Use + chips for Three.js / Spline / etc. — selected chips are sent to the site AI.',
                            },
                            {
                              icon: 'fa-film',
                              title: 'Motion + optional chain',
                              detail:
                                'Generate video, confirm or redo. Add Video 2 / 3 if your plan allows — each clip is stitched for scroll: total timeline ≈ (clips × clip length), frames ≈ timeline × FPS (slider 10–40). Higher counts need a short preview warmup after build.',
                            },
                            {
                              icon: 'fa-layer-group',
                              title: 'Website build',
                              detail:
                                'Continue extracts frames, generates HTML, then shows a “Preparing preview” overlay (~10–50s) so frames decode before fullscreen opens. Workspace preview loads underneath.',
                            },
                            {
                              icon: 'fa-rocket',
                              title: 'Ship & iterate',
                              detail:
                                'Use chat for small edits, fullscreen to review, ZIP when your plan allows. Open the floating Guide for deeper help on prompts and troubleshooting.',
                            },
                          ].map((s, i) => (
                            <div key={s.title} className="flex gap-3">
                              <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                                <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center border border-white/[0.12]">
                                  <span className="text-[9px] font-bold text-white/70">{i + 1}</span>
                                </div>
                                <i className={`fa-solid ${s.icon} text-[10px] text-cyan-400/80`} aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-white/90 leading-snug">{s.title}</p>
                                <p className="text-[10px] text-white/50 leading-relaxed mt-1">{s.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-bolt text-blue-400 text-[11px]"></i>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/70">Quick Start</p>
                  </div>
                  {[
                      { label: 'Cinematic scroll + values deck', prompt: 'Premium scroll-frame landing: floating pill nav (MERIDIAN), editorial hero with accent eyebrow line, headline "Where vision meets global opportunity", stats row, scroll cue. First #pageRoot section MUST be id="section-who" with split header (Who we are + italic accent in H2) and five chamfered gradient value cards (01–05) with dot grid + grain texture and hover tilt. Then bento features, proof, pricing, contact. Dark cream on ink, liquid fill + scroll progress bar. No blur on #bgCanvas.' },
                      { label: 'SaaS Landing Page', prompt: 'A modern SaaS landing page for a project management tool called "FlowSync" with dark theme, gradient accents, feature cards with glassmorphism, pricing section with 3 tiers, and customer testimonials from Fortune 500' },
                      { label: 'Portfolio Website', prompt: 'A creative portfolio website for a UX designer named "Aria Chen" with minimalist dark layout, image gallery with hover effects, about section with timeline, and contact form with glassmorphism' },
                      { label: 'E-commerce Store', prompt: 'An elegant luxury e-commerce store for premium watches brand "ChronoLux" with cinematic product showcase, hero banner with floating watch, featured collections grid, and exclusive newsletter signup' },
                      { label: 'AI Startup', prompt: 'A futuristic AI startup landing page for "NeuralForge" — an AI code generation platform. Dark theme with purple/blue gradients, animated hero with code snippets, feature bento grid, pricing comparison, and enterprise CTA section' },
                      ].map(q => (
                        <button key={q.label} onClick={() => { setInput(q.prompt.slice(0, chatPromptMaxChars)); }}
                          className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.15] transition-all group flex items-center gap-3">
                          <i className="fa-solid fa-arrow-right text-[10px] text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all"></i>
                          <span className="text-[12px] font-medium text-white/80 group-hover:text-white transition-colors">{q.label}</span>
                        </button>
                      ))}
                  </div>
              </motion.div>
            )}

              {showStepGuide && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#111] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-compass text-white/60 text-[12px]"></i>
                        <p className="text-[11px] uppercase tracking-widest font-bold text-white/50">Current Step</p>
                      </div>
                      <p className="text-[13px] font-medium text-white/90 mt-1.5 leading-snug">
                      {step === 'idle'
                        ? 'Describe your site in one message.'
                        : step === 'describe'
                          ? 'Describe the background mood.'
                          : step === 'confirm-image'
                            ? 'Approve or redo the still.'
                            : step === 'confirm-video'
                              ? 'Approve or redo the motion.'
                              : step === 'ready'
                                ? 'Edit in chat or open Business Suite above.'
                                : 'Hang tight — we’re working.'}
                    </p>
                  </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/10 px-2 py-0.5 rounded">Status</span>
                      <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-black border border-white/20 text-white shadow-sm">
                        {step === 'idle' ? 'Describe site'
                          : step === 'describe' ? 'Background'
                            : step === 'confirm-image' ? 'Confirm image'
                              : step === 'confirm-video' ? 'Confirm video'
                                  : step === 'ready' ? 'Ready'
                                    : 'Working...'}
                      </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Commands - shown when site is ready */}
            {step === 'ready' && siteCode && (
              <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-[#14141c] to-[#0d0d12] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-bolt text-blue-200 text-lg" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white tracking-tight">Quick edits</p>
                    <p className="text-[11px] text-white/45 mt-0.5">Tap → fills box → Send.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { cmd: 'make it premium', icon: 'gem', hint: 'Polish visuals & spacing' },
                    { cmd: 'add testimonials', icon: 'quote-left', hint: 'Social proof section' },
                    { cmd: 'add pricing', icon: 'tags', hint: 'Plans & tiers' },
                    { cmd: 'add FAQ', icon: 'circle-question', hint: 'Accordion Q&A' },
                    { cmd: 'add contact form', icon: 'envelope', hint: 'Lead capture' },
                    { cmd: 'improve conversion', icon: 'arrow-trend-up', hint: 'Stronger CTAs' },
                    { cmd: 'add CTA', icon: 'bullhorn', hint: 'Call-to-action blocks' },
                    { cmd: 'dark mode', icon: 'moon', hint: 'Dark theme pass' },
                  ].map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => { setInput(item.cmd.slice(0, chatPromptMaxChars)); }}
                      className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-blue-400/35 px-3.5 py-3 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:border-blue-400/40 transition-colors">
                          <i className={`fa-solid fa-${item.icon} text-white/70 text-[13px] group-hover:text-blue-100`} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-bold text-white block truncate">{item.cmd}</span>
                          <span className="text-[10px] text-white/45">{item.hint}</span>
                        </div>
                        <i className="fa-solid fa-arrow-down text-white/25 text-[10px] group-hover:text-blue-300/90 transition-colors flex-shrink-0" title="Fills input below" aria-hidden />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/40 mt-3.5 pl-0.5">
                  Or type anything custom — e.g. &quot;add a team section&quot; or &quot;make it more minimal&quot;.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div key={msg.ts + '-' + i} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}>
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-4 mb-2">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-user text-white/50 text-[12px]"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">You</span>
                        <span className="text-[9px] text-white/40">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ) : msg.role === 'assistant' ? (
                  <div className="flex items-start gap-4 mb-2 bg-blue-500/[0.04] p-3 -mx-3 rounded-xl border border-blue-500/[0.12]">
                    <div className="w-8 h-8 rounded bg-blue-500/15 border border-blue-400/25 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                      <i className="fa-solid fa-wand-magic-sparkles text-blue-300 text-[12px]" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-blue-300/95">Copilot</span>
                        <span className="text-[9px] text-blue-300/60">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap">
                        <TypewriterText text={msg.text} speed={15} />
                      </div>
                      {msg.integrationHint && <IntegrationChatBubble hint={msg.integrationHint} />}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 mb-2">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-server text-white/60 text-[10px]"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">System Engine</span>
                        <span className="text-[9px] text-white/40">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-[12px] font-mono text-white/70">
                        {msg.text.includes('[ERROR]') ? (
                          <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                        ) : msg.text.includes('✓') ? (
                          <i className="fa-solid fa-circle-check text-emerald-400"></i>
                        ) : (
                          <i className="fa-solid fa-terminal text-white/30"></i>
                        )}
                        <span className={msg.text.includes('[ERROR]') ? 'text-rose-400' : msg.text.includes('✓') ? 'text-emerald-400' : 'text-white/60'}>
                          {msg.text.replace(/✓ /g, '')}
                        </span>
                      </div>
                      
                      {msg.imageUrl && (
                        <div className="mt-3 max-w-[340px] space-y-2">
                          <div className="rounded-lg overflow-hidden border border-white/10 bg-[#111] shadow-lg">
                            <img src={msg.imageUrl} alt="Generated image" className="w-full h-auto object-cover opacity-100" />
                          </div>
                          <a href={msg.imageUrl} download="draftly-image.png" className="inline-flex items-center justify-center gap-2 w-full py-2 rounded text-[11px] font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
                            <i className="fa-solid fa-download"></i> Download asset
                          </a>
                        </div>
                      )}
                      
                      {msg.videoSrc && (
                        <div className="mt-3 max-w-[340px] space-y-2">
                          <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg">
                            <BuilderVideoFrame src={msg.videoSrc} fallbackSrc={msg.videoFallbackSrc || undefined} />
                          </div>
                          <a href={msg.videoSrc} download="draftly-video.mp4" className="inline-flex items-center justify-center gap-2 w-full py-2 rounded text-[11px] font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
                            <i className="fa-solid fa-download"></i> Download asset
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex-shrink-0 border-t border-white/[0.05] px-3 sm:px-4 py-2.5 bg-[#0a0a0c]/95 backdrop-blur-3xl relative z-20">
            {/* Contextual Action Bar */}
            {(step === 'confirm-image' || step === 'confirm-video') && (
              <div className="mb-4 p-3.5 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.05] to-blue-500/[0.02] shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-wand-magic-sparkles text-cyan-400"></i>
                      {step === 'confirm-image' ? 'Hero Image Generated' : 'Motion Pass Complete'}
                    </h3>
                    <p className="text-[11px] text-white/60 mt-1">
                      {step === 'confirm-image'
                        ? 'Lock in this hero, or regenerate. Below you can replace the first frame or add an optional end frame for motion.'
                        : 'Review the video animation. If it looks good, proceed to build the website.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={step === 'confirm-image' ? onRegenerateImage : onRegenerateVideo} 
                      disabled={sending} 
                      className="px-4 py-2 rounded-xl text-[12px] font-bold bg-white/[0.05] border border-white/[0.1] text-white/80 hover:bg-white/[0.1] hover:text-white disabled:opacity-30 transition-all flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-rotate-right"></i> Regenerate
                    </button>
                    <button 
                      onClick={step === 'confirm-image' ? (useFlConfirm ? onConfirmFL : onConfirmImage) : onConfirmVideo} 
                      disabled={sending || (step === 'confirm-image' && !canProceedImageConfirm) || (step === 'confirm-video' && !videoBase64)} 
                      className="px-5 py-2 rounded-xl text-[12px] font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-30 transition-all flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-check"></i> {step === 'confirm-image' ? (useFlConfirm ? 'Confirm Frames' : 'Confirm Image') : 'Build Website'}
                    </button>
                  </div>
                </div>

                {/* First / last frame — compact, explicit actions */}
                {step === 'confirm-image' && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-col gap-3">
                    {canBuilderKeyframeAndChain && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] to-black/40 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-cyan-100">1 — First frame (start)</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200/90 border border-cyan-400/30">Motion start</span>
                          </div>
                          <p className="text-[10px] text-white/50 leading-snug">
                            Defaults to your generated hero. Upload a different image to replace it as the motion start.
                          </p>
                          {firstFrameUrl ? (
                            <div className="relative rounded-lg overflow-hidden border border-white/10 max-w-full">
                              <img src={firstFrameUrl} alt="First frame" className="w-full aspect-video object-cover" />
                              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
                                {bgImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFirstFrameUrl(bgImageUrl);
                                      push('system', 'First frame reset to the generated hero image.');
                                    }}
                                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-black/70 text-white border border-white/20 hover:bg-black/90"
                                  >
                                    Use hero
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => firstFrameInputRef.current?.click()}
                                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-cyan-500/30 text-cyan-50 border border-cyan-400/40 hover:bg-cyan-500/40"
                                >
                                  Replace image…
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {bgImageUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFirstFrameUrl(bgImageUrl);
                                    push('system', 'First frame set to generated hero.');
                                  }}
                                  className="px-3 py-2 rounded-lg text-[11px] font-bold bg-cyan-500/20 text-cyan-100 border border-cyan-400/35"
                                >
                                  Use generated hero
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => firstFrameInputRef.current?.click()}
                                className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-white/5 text-white/85 border border-white/12 hover:bg-white/10"
                              >
                                Upload first frame
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-black/40 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-amber-100">2 — Last frame (end)</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-100 border border-amber-400/30">Optional</span>
                          </div>
                          <p className="text-[10px] text-white/50 leading-snug">
                            Add an end still for first→last motion, or leave empty for single-image video.
                          </p>
                          {lastFrameUrl ? (
                            <div className="relative rounded-lg overflow-hidden border border-white/10">
                              <img src={lastFrameUrl} alt="Last frame" className="w-full aspect-video object-cover" />
                              <button
                                type="button"
                                onClick={() => setLastFrameUrl(null)}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-500 flex items-center justify-center transition-colors"
                                aria-label="Remove last frame"
                              >
                                <i className="fa-solid fa-xmark text-white text-[11px]"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={lastFramePrompt}
                                onChange={(e) => setLastFramePrompt(e.target.value.slice(0, chatPromptMaxChars))}
                                placeholder="Describe the ending still, or upload…"
                                disabled={generatingLastFrame}
                                rows={2}
                                className="w-full bg-black/50 border border-white/12 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/35 outline-none focus:border-amber-400/35 resize-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void generateLastFrame()}
                                  disabled={generatingLastFrame || !lastFramePrompt.trim()}
                                  className="flex-1 min-w-[100px] py-2 rounded-lg text-[11px] font-bold bg-amber-500/25 text-amber-50 border border-amber-400/35 hover:bg-amber-500/35 disabled:opacity-35"
                                >
                                  {generatingLastFrame ? <i className="fa-solid fa-spinner fa-spin mr-1" aria-hidden /> : null}
                                  Generate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => lastFrameInputRef.current?.click()}
                                  className="flex-1 min-w-[100px] py-2 rounded-lg text-[11px] font-semibold bg-white/5 text-white/85 border border-white/12 hover:bg-white/10"
                                >
                                  Upload
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional controls for video configuration when confirming video */}
                {step === 'confirm-video' && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-col gap-3">
                    {videoChain.length > 0 && (
                      <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05]">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Video Chain ({videoChain.length}/{planVideoLimit})</div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {videoChain.map((v, i) => (
                            <div key={i} className="flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden border border-white/[0.1] relative">
                              <video src={v} muted className="absolute inset-0 h-full w-full object-cover bg-black" />
                              <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 backdrop-blur-sm rounded font-medium text-white px-1.5 py-0.5">{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex sm:items-center flex-col sm:flex-row gap-3 bg-black/40 p-3 rounded-xl border border-white/[0.05]">
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 whitespace-nowrap">Extract FPS</span>
                        <input type="range" min={10} max={40} step={1} value={extractionFps} onChange={e => setExtractionFps(Number(e.target.value))}
                          className="flex-1 h-1.5 appearance-none bg-white/10 rounded-full accent-cyan-400 cursor-pointer" />
                        <span className="text-[12px] font-mono font-medium text-cyan-400 w-8 text-right">{extractionFps}</span>
                      </div>
                      {videoChain.length < planVideoLimit && canBuilderKeyframeAndChain && (
                        <button
                          onClick={() => {
                            if (videoBase64) {
                              setFirstFrameUrl(null);
                              setLastFrameUrl(null);
                              setStep('confirm-image');
                              push('assistant', `Add video ${videoChain.length + 1}: Confirm your hero, optionally add an end still, then continue.`);
                            }
                          }}
                          disabled={sending || !videoBase64}
                          className="px-4 py-2 rounded-lg text-[11px] font-bold text-white/70 hover:text-white border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-plus text-cyan-400"></i> Add Video ({videoChain.length}/{planVideoLimit})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async e => {
                const inputEl = e.currentTarget;
                await onPickImages(inputEl.files);
                inputEl.value = '';
              }}
            />
            <input ref={firstFrameInputRef} type="file" accept="image/*" className="hidden" onChange={e => { onPickFrameImage(e.target.files, 'first'); e.currentTarget.value = ''; }} />
            <input ref={lastFrameInputRef} type="file" accept="image/*" className="hidden" onChange={e => { onPickFrameImage(e.target.files, 'last'); e.currentTarget.value = ''; }} />

            <div className="flex items-end gap-1.5 relative">
                <button
                onClick={() => fileInputRef.current?.click()}
                className="h-[34px] w-[34px] rounded-[10px] bg-white/[0.06] border border-white/[0.12] text-white/70 hover:bg-white/[0.12] hover:text-white hover:border-white/[0.25] transition-all flex items-center justify-center flex-shrink-0 shadow-sm"
                title={siteCode ? 'Add product images' : 'Add reference images'}
              >
                <i className="fa-solid fa-image text-[14px]"></i>
              </button>
              <button
                type="button"
                onClick={toggleDictation}
                disabled={sending || !canType || authLoading || showBuildChoice}
                className={`h-[34px] w-[34px] rounded-[10px] border flex items-center justify-center flex-shrink-0 shadow-sm transition-all disabled:opacity-20 ${
                  speechListening
                    ? 'bg-rose-500/25 border-rose-400/40 text-rose-100'
                    : 'bg-white/[0.06] border-white/[0.12] text-white/70 hover:bg-white/[0.12] hover:text-white'
                }`}
                title={
                  !speechSupported
                    ? 'Voice typing is not available in this browser (try Chrome or Edge)'
                    : speechListening
                      ? 'Stop dictation'
                      : 'Dictate (voice to text)'
                }
              >
                <i className={`fa-solid fa-microphone text-[14px] ${speechListening ? 'animate-pulse' : ''}`} aria-hidden />
              </button>
              <div className="min-w-0 flex-1 relative group" id="chat-input">
                <textarea
                  ref={promptTextareaRef}
                  rows={1}
                  value={step === 'confirm-image' ? animPromptInput : input}
                  onChange={e => {
                    const val = e.target.value.slice(0, chatPromptMaxChars);
                    if (step === 'confirm-image') setAnimPromptInput(val);
                    else setInput(val);
                    requestAnimationFrame(() => adjustPromptTextareaHeight());
                  }}
                  maxLength={chatPromptMaxChars}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (step === 'confirm-image') {
                        if (useFlConfirm) onConfirmFL();
                        else onConfirmImage();
                      } else if (step === 'confirm-video') onConfirmVideo();
                      else handleSend();
                    }
                  }}
                  placeholder={placeholder}
                  disabled={sending || !canType}
                  spellCheck
                  className="w-full min-h-[34px] max-h-[200px] py-1.5 leading-snug resize-none overflow-y-auto bg-black/50 backdrop-blur-md border border-white/[0.15] rounded-[10px] pl-3 pr-[84px] sm:pr-[92px] text-[13px] font-medium text-white placeholder:text-white/60 outline-none focus:border-blue-500/45 focus:shadow-[0_0_22px_rgba(59,130,246,0.18)] transition-all"
                />
                
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 z-10">
                  {(step === 'describe' || step === 'idle') && (
                    <button
                      onClick={onBrainstorm}
                      disabled={sending || !canType || showBuildChoice || (!input.trim() && uploadedImages.length === 0)}
                      className="h-[28px] px-2 rounded-md bg-blue-500/15 border border-blue-400/25 text-blue-200 hover:bg-blue-500/25 hover:text-white disabled:opacity-20 disabled:grayscale flex items-center justify-center transition-all"
                      title="Brainstorm prompt with AI (uses uploaded images + text)"
                    >
                      <i className="fa-solid fa-lightbulb text-[12px]" aria-hidden />
                    </button>
                  )}
                  {(step === 'describe' || step === 'confirm-image') && (
                    <button
                      onClick={() => enhancePrompt(step === 'confirm-image' ? 'video' : 'image')}
                      disabled={
                        sending ||
                        enhancingMain ||
                        enhancingAnim ||
                        (!input.trim() && step === 'describe') ||
                        (!animPromptInput.trim() && step === 'confirm-image') ||
                        !canType ||
                        showBuildChoice
                      }
                      className="h-[28px] w-[28px] rounded-md bg-blue-500/12 border border-blue-400/25 text-blue-200 hover:bg-blue-500/20 hover:text-white disabled:opacity-20 disabled:grayscale flex items-center justify-center transition-all"
                      title={!isProUser ? 'Subscription required — opens pricing' : 'Enhance prompt with AI'}
                    >
                      {enhancingMain || enhancingAnim ? <i className="fa-solid fa-spinner fa-spin text-[12px]"></i> : <i className="fa-solid fa-wand-magic-sparkles text-[12px]" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (step === 'confirm-image') {
                    if (useFlConfirm) onConfirmFL();
                    else onConfirmImage();
                  } else if (step === 'confirm-video') onConfirmVideo();
                  else handleSend();
                }}
                disabled={sending || !canType || authLoading || showBuildChoice}
                title="Send"
                className="h-[34px] w-[34px] rounded-[10px] bg-white text-black flex items-center justify-center flex-shrink-0 hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all disabled:opacity-20 disabled:bg-white/10 disabled:text-white/30 disabled:scale-100 disabled:shadow-none"
              >
                {sending ? <i className="fa-solid fa-spinner fa-spin text-[14px]"></i> : <i className="fa-solid fa-paper-plane text-[14px]"></i>}
              </button>
            </div>
            
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 text-[8px] font-bold text-white/70 shrink-0"
                  title={
                    step === 'idle'
                      ? showBuildChoice
                        ? 'Choose build mode'
                        : 'Describe your website'
                      : step === 'describe'
                        ? 'Background visual style'
                        : step === 'confirm-image'
                          ? 'Animation & motion'
                          : step === 'confirm-video'
                            ? 'Finalize build'
                            : step === 'ready'
                              ? 'Iterate or publish'
                              : 'Processing'
                  }
                >
                  {step === 'idle' ? '1' : step === 'describe' ? '2' : step === 'confirm-image' ? '3' : step === 'confirm-video' ? '4' : '5'}
                </span>
                <span className="sr-only">
                  {step === 'idle' && (showBuildChoice ? 'Choose build mode to continue' : 'Describe your website')}
                  {step === 'describe' && 'Describe background visual style'}
                  {step === 'confirm-image' && 'Animation and motion settings'}
                  {step === 'confirm-video' && 'Finalize website build'}
                  {step === 'ready' && 'Iterate or publish'}
                  {!canType && 'Processing'}
                </span>
              </div>
              <div className="text-[9px] text-white/30 flex items-center gap-1.5 shrink-0">
                <span title="Character count">{(step === 'confirm-image' ? animPromptInput.length : input.length)}/{chatPromptMaxChars}</span>
                {chatPromptMaxChars === BUILDER_PROMPT_MAX_CHARS_EXTENDED && (
                  <span className="text-emerald-400/70 bg-emerald-500/10 px-1 py-0.5 rounded font-medium" title="Extended prompt limit">
                    <i className="fa-solid fa-bolt text-[8px]" aria-hidden />
                  </span>
                )}
                <span className="hidden sm:inline" title="Press Enter to send">
                  <i className="fa-solid fa-keyboard text-[9px]" aria-hidden />
                </span>
              </div>
            </div>

            {canType && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUILDER_GRAPHICS_STACK_LABELS.map((lib) => {
                  const on = graphicsStackPicks.includes(lib);
                  return (
                    <button
                      key={lib}
                      type="button"
                      onClick={() => {
                        const wasOn = graphicsStackPicks.includes(lib);
                        setGraphicsStackPicks((prev) =>
                          prev.includes(lib) ? prev.filter((x) => x !== lib) : [...prev, lib],
                        );
                        if (wasOn) {
                          requestAnimationFrame(() => adjustPromptTextareaHeight());
                          return;
                        }
                        const text = `Use ${lib} in the build (CDN-friendly, works in preview).`;
                        if (step === 'confirm-image') {
                          setAnimPromptInput((prev) => (prev ? `${prev}; ${text}` : text));
                        } else {
                          setInput((prev) => (prev ? `${prev}; ${text}` : text));
                        }
                        requestAnimationFrame(() => adjustPromptTextareaHeight());
                      }}
                      className={`px-2 py-1 text-[10px] font-medium border rounded-md transition-colors ${
                        on
                          ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                          : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.1] text-white/50 hover:text-white/90'
                      }`}
                      title={
                        on
                          ? `${lib} will be enforced in site generation (and in chat iterations while selected). Click to remove.`
                          : `Add ${lib} — model must ship working scripts in the HTML preview.`
                      }
                    >
                      {on ? <i className="fa-solid fa-check text-[9px] mr-1" aria-hidden /> : '+ '}
                      {lib}
                    </button>
                  );
                })}
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="mb-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-images text-white/40 text-[10px]"></i>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                    {siteCode ? 'Assets' : 'Reference images'}
                  </div>
                  {refBriefLoading && (
                    <span className="text-[10px] text-cyan-400/90 flex items-center gap-1.5 ml-auto">
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                      Drafting prompt…
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {uploadedImages.map(img => (
                    <div key={img.id} className="relative group">
                      <img src={img.dataUrl} alt={img.name} className="w-full aspect-square object-cover rounded-lg border border-white/[0.1] bg-black shadow-md" />
                      <button
                        onClick={() => setUploadedImages(prev => prev.filter(x => x.id !== img.id))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500/90 hover:bg-rose-400 border border-white/20 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow-lg transition-all"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isProUser && (step === 'describe' || step === 'confirm-image' || step === 'confirm-video') && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                <div className="flex items-center gap-2 text-amber-200/90 text-[11px] font-medium">
                  <i className="fa-solid fa-crown text-amber-400"></i>
                  Generating visuals requires a paid plan.
                </div>
                <Link
                  href="/pricing#pricing"
                  onClick={guardNavigateFromBuilder}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-400 text-black hover:bg-amber-300 whitespace-nowrap shadow-sm transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            )}
          </div>
          </>
          )}

          <AnimatePresence>
            {showPaywall && (
              <ProUpgradePopup
                onDismiss={() => setShowPaywall(false)}
                title={paywallTitle}
                description={paywallDescription}
                ctaHref="/pricing#pricing"
                ctaLabel="View Pricing"
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Resize handle ── */}
        <div
          className="hidden md:flex w-1.5 cursor-col-resize items-center justify-center bg-transparent hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors group flex-shrink-0 z-10"
          onMouseDown={() => {
            isDraggingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="w-px h-10 rounded-full bg-white/[0.12] group-hover:bg-blue-400/50 group-active:bg-blue-300 transition-colors" />
        </div>

        {/* ── Preview workspace ── */}
        <div
          id="preview-panel"
          className={`relative flex flex-1 flex-col min-w-0 bg-[#06080e] ${mobilePane === 'workspace' ? 'flex' : 'hidden md:flex'}`}
        >
          {/* Click-blocking overlay removed — users can always interact with the builder */}

          {/* Live preview stage — only visible when there is content to show */}
          <div
            className={`relative z-0 border-b border-white/[0.07] bg-[#04050a] ${
              (siteCode || bgImageUrl || workspacePreviewVideoSrc || loadingProjectId)
                ? shipDashboard
                  ? 'flex-1 min-h-[min(62vh,820px)] flex-shrink-0'
                  : [
                      'flex-shrink-0 min-h-0 md:h-[min(36vh,360px)] md:min-h-[min(36vh,360px)]',
                      mobilePane === 'workspace'
                        ? 'max-md:flex-1 max-md:min-h-[min(52vh,620px)]'
                        : 'max-md:h-[min(34vh,320px)] max-md:max-h-[40vh]',
                    ].join(' ')
                : 'hidden'
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(59,130,246,0.12),transparent_55%)]"
              aria-hidden
            />
            <div className="relative h-full flex flex-col p-3 sm:p-4 min-h-0">
              <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Live preview</span>
                  {mediaAspectRatio && (
                    <span className="hidden sm:inline text-[10px] text-white/30 font-mono">{mediaAspectRatio}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {siteCode && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      disabled={!!loadingProjectId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/[0.1] transition-all disabled:opacity-40"
                    >
                      <i className="fa-solid fa-expand text-[9px]" aria-hidden />
                      Full screen
                    </button>
                  )}
                </div>
              </div>
              <div className="relative flex-1 min-h-0 rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]">
                {loadingProjectId ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-white/50">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-7 h-7 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
                    />
                    <p className="text-[12px] font-medium">Loading project…</p>
                  </div>
                ) : siteCode ? (
                  <iframe
                    ref={workspacePreviewIframeRef}
                    src="about:blank"
                    className="w-full h-full border-none bg-[#030303]"
                    style={{ overflow: 'auto' }}
                    scrolling="yes"
                    tabIndex={0}
                    title="Live site preview"
                  />
                ) : workspacePreviewVideoSrc ? (
                  <div className="h-full w-full flex items-center justify-center bg-black p-2">
                    <div className="max-h-full max-w-full rounded-lg overflow-hidden border border-white/10">
                      <BuilderVideoFrame
                        src={workspacePreviewVideoSrc}
                        fallbackSrc={videoFallbackSrc}
                        autoPlay={false}
                      />
                    </div>
                  </div>
                ) : bgImageUrl ? (
                  <div className="h-full w-full flex items-center justify-center p-2">
                    <img
                      src={bgImageUrl}
                      alt="Background preview"
                      className="max-h-full max-w-full object-contain rounded-lg border border-white/10 shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-200">
                      <i className="fa-solid fa-cube text-xl" aria-hidden />
                    </div>
                    <p className="font-display text-[15px] font-semibold text-white/90 tracking-tight">Preview canvas</p>
                    <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-white/45">
                      Still frames, motion, and your built site show up here as you work. Use the copilot on the left to describe what you want.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workspace tabs */}
          <div
            className={`relative z-10 flex-shrink-0 px-3 sm:px-4 py-2.5 border-b flex items-center gap-1.5 overflow-x-auto backdrop-blur-md ${
              shipDashboard
                ? 'border-white/[0.07] bg-gradient-to-r from-teal-500/[0.06] via-[#0a0d12]/95 to-blue-500/[0.06]'
                : 'border-white/[0.06] bg-[#0a0d12]/90'
            }`}
          >
            {tabs
              .filter((t) => t.visible)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  id={t.id === 'pipeline' ? 'pipeline-tab' : t.id === 'launchpad' ? 'ship-tab' : undefined}
                  onClick={() => setRightTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all flex-shrink-0 border ${
                    rightTab === t.id
                      ? t.id === 'launchpad'
                        ? 'bg-teal-500/20 text-teal-50 border-teal-400/35 shadow-[0_0_20px_rgba(45,212,191,0.12)]'
                        : 'bg-white/12 text-white border-white/12'
                      : 'text-white/45 hover:text-white/88 hover:bg-white/[0.06] border-transparent'
                  }`}
                >
                  {t.id === 'launchpad' && <i className="fa-solid fa-rocket mr-1.5 text-[9px] text-teal-300/90" aria-hidden />}
                  {t.label}
                </button>
              ))}
            <div className="flex-1 min-w-2" />
            {step === 'ready' && siteCode && (
              <span className="hidden sm:inline text-[10px] font-medium text-white/35 tracking-wide">Workspace</span>
            )}
            {step === 'ready' && (
              <span className="text-[10px] font-semibold text-teal-300 flex items-center gap-1.5 flex-shrink-0 bg-teal-500/10 px-2.5 py-1 rounded-md border border-teal-500/25">
                <i className="fa-solid fa-check-circle text-[10px]" aria-hidden />
                Ready
              </span>
            )}
            {error && (
              <span className="text-[10px] text-rose-300 font-semibold flex-shrink-0 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/25 max-w-[200px] truncate">
                <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden />
                {error}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Ship — post-build command center (only when site is ready) */}
            {rightTab === 'launchpad' && shipDashboard && (
              <div className="relative min-h-full font-sans">
                <div className="pointer-events-none absolute inset-0 bg-[#050508]" aria-hidden />
                <div
                  className="pointer-events-none absolute inset-0 opacity-90 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(52,211,153,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(6,182,212,0.12),transparent_45%)]"
                  aria-hidden
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_28%,transparent_100%)]" aria-hidden />

                <div className="relative z-10 px-5 sm:px-8 lg:px-12 py-8 sm:py-10 max-w-5xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
                      Live build
                    </div>
                    <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-white [letter-spacing:-0.02em]">
                      Your 3D site is ready to ship
                    </h2>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/55">
                      Use full-screen preview from here, download ZIP (Premium $200/mo+) from this tab only, or browse code and assets. Iterate anytime from the chat on the left.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08 }}
                    className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      disabled={!!loadingProjectId || !siteCode}
                      className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-6 text-left transition-all hover:border-white/20 hover:bg-white/[0.09] disabled:opacity-40 sm:col-span-2 lg:col-span-1 lg:row-span-1"
                    >
                      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/25 to-cyan-500/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-70" aria-hidden />
                      <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black shadow-lg">
                          <i className="fa-solid fa-play text-sm" aria-hidden />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold text-white">Open live preview</h3>
                        <p className="mt-1.5 text-[13px] text-white/50 leading-relaxed">
                          Full-screen iframe of your generated site — same as the preview overlay.
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-emerald-300/90">
                          Launch <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={downloadZip}
                      disabled={!siteCode || !canExportZipUser}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition-all hover:border-amber-400/25 hover:bg-amber-500/[0.06] disabled:opacity-40"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-amber-200">
                        <i className="fa-solid fa-file-zipper text-sm" aria-hidden />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-white">Download ZIP</h3>
                      <p className="mt-1.5 text-[13px] text-white/45 leading-relaxed">
                        HTML, CSS, JS, frames, and a README for running locally.
                      </p>
                      {!canExportZipUser && (
                        <p className="mt-3 text-[11px] font-medium text-amber-200/80">
                          Premium ($200/mo)+ — ZIP, Business OS hosting tools, and integrations
                        </p>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRightTab('code')}
                      disabled={!codeStructure}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition-all hover:border-blue-400/30 hover:bg-blue-500/[0.06] disabled:opacity-40"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-blue-200">
                        <i className="fa-solid fa-code text-sm" aria-hidden />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-white">Browse code</h3>
                      <p className="mt-1.5 text-[13px] text-white/45 leading-relaxed">
                        index.html, styles, scripts, and frame assets in one place.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={publishSite}
                      disabled={!siteCode || publishLoading || !activeProjectId}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition-all hover:border-emerald-400/30 hover:bg-emerald-500/[0.06] disabled:opacity-40"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-emerald-300">
                        <i className={`fa-solid ${publishLoading ? 'fa-spinner fa-spin' : 'fa-rocket'} text-sm`} aria-hidden />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-white">
                        {publishLoading ? 'Publishing…' : publishedUrl ? 'Published!' : 'Publish to Draftly'}
                      </h3>
                      <p className="mt-1.5 text-[13px] text-white/45 leading-relaxed">
                        {publishedUrl
                          ? `Live at: ${publishedUrl}`
                          : 'Get a free yoursite.draftly.space subdomain instantly.'}
                      </p>
                      {publishedUrl && (
                        <a
                          href={publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-emerald-300/90"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open site <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden />
                        </a>
                      )}
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.15 }}
                    className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
                  >
                    {[
                      { k: 'Scroll frames', v: webpFrames.length ? String(webpFrames.length) : '—', sub: 'WebP' },
                      { k: 'Videos', v: String(Math.max(videoChain.length, videoBase64 ? 1 : 0)), sub: 'Clips' },
                      { k: 'Images', v: String(Math.max(generatedImageUrls.length, bgImageUrl ? 1 : 0)), sub: 'Stills' },
                      { k: 'Build log', v: '05', sub: 'Done' },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3 backdrop-blur-sm"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{row.k}</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-white">{row.v}</p>
                        <p className="text-[10px] text-white/30">{row.sub}</p>
                      </div>
                    ))}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.22 }}
                    className="mt-10 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-6 sm:p-8"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">Keep shipping</h3>
                        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/50">
                          Use quick commands in chat or describe changes in your own words. Open{' '}
                          <span className="text-white/80 font-medium">Build log</span> anytime to see the full timeline.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(!!bgImageUrl || generatedImageUrls.length > 0) && (
                          <button
                            type="button"
                            onClick={() => setRightTab('image')}
                            className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white/85 hover:bg-white/[0.1]"
                          >
                            Images
                          </button>
                        )}
                        {(!!videoBase64 || videoChain.length > 0) && (
                          <button
                            type="button"
                            onClick={() => setRightTab('video')}
                            className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white/85 hover:bg-white/[0.1]"
                          >
                            Video
                          </button>
                        )}
                        {webpFrames.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setRightTab('frames')}
                            className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white/85 hover:bg-white/[0.1]"
                          >
                            Frames
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRightTab('pipeline')}
                          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/15"
                        >
                          Build log
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Pipeline tab */}
            {rightTab === 'pipeline' && (
              <div className="px-6 py-8 max-w-2xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-3">
                    <i className="fa-solid fa-layer-group text-emerald-400"></i>
                    {shipDashboard ? 'Build timeline' : 'Generation Pipeline'}
                  </h2>
                  <p className="text-[13px] text-white/50 mt-1">
                    {shipDashboard
                      ? 'Step-by-step record of this run. Actions and downloads live on Ship.'
                      : 'Watch your website come to life step by step.'}
                  </p>
                </div>
                
                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent z-0" />
                  
                  <div className="space-y-4">
                    {PIPELINE_NODES.map((node, i) => {
                      const status = step === 'idle' ? 'pending' : getNodeStatus(node, step);
                      return (
                        <div key={node.id} className="relative z-10">
                          <PipelineNodeCard node={node} status={status} detail={getNodeDetail(node.id)} index={i} />
                          {i < PIPELINE_NODES.length - 1 && <AnimatedArrow status={getArrowStatus(i)} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {shipDashboard && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
                          <i className="fa-solid fa-circle-check text-lg" aria-hidden />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-white">Build complete</h3>
                          <p className="mt-0.5 text-[12px] text-white/55">
                            Preview, ZIP, and asset shortcuts are on the <span className="text-emerald-200/90 font-semibold">Ship</span> tab.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRightTab('launchpad')}
                        className="w-full rounded-xl bg-white py-3 text-center text-[12px] font-bold uppercase tracking-wide text-black shadow-[0_0_24px_rgba(255,255,255,0.12)] transition hover:bg-white/90 sm:w-auto sm:px-6"
                      >
                        Open Ship
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {step === 'idle' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 text-center p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <i className="fa-solid fa-terminal text-white/30 text-[16px]"></i>
                    </div>
                    <p className="text-[14px] font-medium text-white/50">Waiting for your prompt...</p>
                    <p className="text-[12px] text-white/30 mt-1">Describe what you want to build in the chat panel.</p>
                  </motion.div>
                )}
                
                {/* Business Tips Widget */}
                {step === 'idle' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <i className="fa-solid fa-lightbulb text-blue-400 text-[14px]"></i>
                        </div>
                        <h4 className="text-[13px] font-bold text-white group-hover:text-blue-300 transition-colors">Agency Pro Tip</h4>
                      </div>
                      <p className="text-[12px] text-white/70 leading-relaxed">
                        Agencies charge $5k+ for scroll-driven 3D websites. Use the <strong>Front-end only</strong> mode to generate a cinematic hero section, then download the ZIP and integrate it into your client's existing CMS or React app.
                      </p>
                    </div>
                    
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <i className="fa-solid fa-chart-line text-amber-400 text-[14px]"></i>
                        </div>
                        <h4 className="text-[13px] font-bold text-white group-hover:text-amber-300 transition-colors">Conversion Focus</h4>
                      </div>
                      <p className="text-[12px] text-white/70 leading-relaxed">
                        3D scroll experiences increase time-on-page by 300%. Make sure to include a clear Call-to-Action (CTA) at the end of the scroll sequence to capture the engaged user.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Image tab */}
            {rightTab === 'image' && (bgImageUrl || generatedImageUrls.length > 0) && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto space-y-5">
                  <p className="text-[12px] text-white/40 uppercase tracking-wider font-bold">
                    Generated images ({generatedImageUrls.length || (bgImageUrl ? 1 : 0)})
                  </p>
                  <p className="text-[10px] text-white/35 leading-relaxed">
                    Background, last-frame, and other AI stills from this project. Current hero background is marked.
                  </p>
                  {(generatedImageUrls.length ? generatedImageUrls : bgImageUrl ? [bgImageUrl] : []).map((url, idx) => {
                    const isCurrentBg = url === bgImageUrl;
                    return (
                      <div key={`${url.slice(0, 48)}-${idx}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider">
                            Image {idx + 1}
                            {isCurrentBg ? ' · Active background' : ''}
                          </span>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                          <img src={url} alt={`Generated ${idx + 1}`} className="w-full h-auto object-cover opacity-100 bg-black" />
                        </div>
                        <a
                          href={url}
                          download={`draftly-image-${idx + 1}.png`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[11px] font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Video tab */}
            {rightTab === 'video' && (videoBase64 || videoChain.length > 0) && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  {videoChain.length > 1 ? (
                    <>
                      <p className="text-[12px] text-white/40 uppercase tracking-wider font-bold">Video Chain ({videoChain.length} videos)</p>
                      {videoChain.map((v, i) => (
                        <div key={i}>
                          <p className="text-[10px] text-white/30 mb-1 font-semibold">Video {i + 1}</p>
                          <BuilderVideoFrame src={v} autoPlay={false} />
                          <a href={v} download={`draftly-video-${i + 1}.mp4`} className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Download
                          </a>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] text-white/40 uppercase tracking-wider font-bold">Generated Video Animation</p>
                      <BuilderVideoFrame
                        src={videoBase64 || videoChain[0]}
                        fallbackSrc={videoFallbackSrc}
                      />
                      <a
                        href={videoBase64 || videoChain[0]}
                        download="draftly-video.mp4"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[11px] font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Download Video
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Frames tab */}
            {rightTab === 'frames' && webpFrames.length > 0 && (
              <div className="p-6">
                <p className="text-[12px] text-white/40 mb-3 uppercase tracking-wider font-bold">Extracted Frames ({webpFrames.length} total)</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                  {webpFrames.slice(0, 60).map((f, i) => (
                    <div key={i} className="aspect-video rounded-md overflow-hidden border border-white/10 relative">
                      <img src={f} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 text-[9px] px-1.5 py-0.5 bg-black/70 text-white/80">{i + 1}</span>
                    </div>
                  ))}
                </div>
                {webpFrames.length > 60 && <p className="text-[11px] text-white/40 mt-2">+ {webpFrames.length - 60} more frames</p>}
              </div>
            )}

            {/* Code tab — folder structure (Vercel/Cursor-style) */}
            {rightTab === 'code' && siteCode && codeStructure && (
              <div className="flex flex-1 min-h-0">
                <div className="w-[220px] flex-shrink-0 border-r border-white/[0.06] bg-[#08080e] flex flex-col overflow-hidden">
                  <p className="text-[10px] text-white/40 px-3 py-2.5 uppercase tracking-widest font-bold border-b border-white/[0.06]">Project</p>
                  <nav className="p-2 overflow-auto flex-1">
                    {[
                      { id: 'index.html', label: 'index.html', icon: 'html' },
                      { id: 'assets/css/main.css', label: 'assets/css/main.css', icon: 'css' },
                      { id: 'assets/js/main.js', label: 'assets/js/main.js', icon: 'js' },
                      ...(webpFrames.length > 0 ? [{ id: 'frames-webp', label: `frames-webp (${webpFrames.length})`, icon: 'folder' as const }] : []),
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedCodeFile(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-mono flex items-center gap-2 transition-colors ${selectedCodeFile === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white/80'}`}
                      >
                        {item.icon === 'folder' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-amber-400/90"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                        ) : item.icon === 'css' ? (
                          <span className="w-4 text-[10px] font-bold text-blue-400 flex-shrink-0">CSS</span>
                        ) : item.icon === 'js' ? (
                          <span className="w-4 text-[10px] font-bold text-amber-400 flex-shrink-0">JS</span>
                        ) : (
                          <span className="w-4 text-[10px] font-bold text-emerald-400 flex-shrink-0">HTML</span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a12] overflow-hidden">
                  <p className="text-[10px] text-white/40 px-4 py-2 border-b border-white/[0.06] font-mono truncate">{selectedCodeFile}</p>
                  <div className="flex-1 overflow-auto p-4">
                    {selectedCodeFile === 'index.html' && (
                      <pre className="text-[11px] text-white/75 whitespace-pre-wrap break-words font-mono">{codeStructure.indexHtml}</pre>
                    )}
                    {selectedCodeFile === 'assets/css/main.css' && (
                      <pre className="text-[11px] text-white/75 whitespace-pre-wrap break-words font-mono">{codeStructure.cssText || '/* No extracted CSS */'}</pre>
                    )}
                    {selectedCodeFile === 'assets/js/main.js' && (
                      <pre className="text-[11px] text-white/75 whitespace-pre-wrap break-words font-mono">{codeStructure.jsText || '// No extracted JS'}</pre>
                    )}
                    {selectedCodeFile === 'frames-webp' && webpFrames.length > 0 && (
                      <div>
                        <p className="text-[12px] text-white/60 mb-3">WebP frames extracted from video ({webpFrames.length} files). Used for scroll-driven background.</p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {webpFrames.slice(0, 24).map((f, i) => (
                            <div key={i} className="aspect-video rounded border border-white/10 overflow-hidden">
                              <img src={f} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                        {webpFrames.length > 24 && <p className="text-[11px] text-white/40 mt-2">+ {webpFrames.length - 24} more frames</p>}
                      </div>
                    )}
                    {selectedCodeFile === 'frames-webp' && webpFrames.length === 0 && (
                      <p className="text-[12px] text-white/50">No frames in this build. Use frame-scroll mode to extract frames from video.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Business Center tab */}
            {rightTab === 'business' && (
              <div className="h-full">
                <BusinessCenter
                  siteCode={siteCode}
                  bgImageUrl={bgImageUrl}
                  videoBase64={videoBase64}
                  step={step}
                  setInput={setInput}
                  onSendMessage={(text) => {
                    const t = text.slice(0, chatPromptMaxChars);
                    setInput(t);
                    push('user', t);
                    // Auto-send after a short delay to let user see the prompt
                    setTimeout(() => {
                      handleSend();
                    }, 100);
                  }}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══ Site Preview (after build) — no frames-only preview ═══ */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-[#030303]"
          >
            {loadingProjectId ? (
              <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-white/60">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
                <p className="text-sm font-medium">Loading project…</p>
              </div>
            ) : siteCode ? (
              <div className="w-full h-full relative bg-[#030303]">
                <div className="absolute inset-0">
                  <iframe
                    ref={previewIframeRef}
                    src="about:blank"
                    className={`w-full h-full border-none bg-[#030303] ${fullPreviewPhase !== 'ready' ? 'pointer-events-none opacity-0' : ''}`}
                    style={{ overflow: 'auto' }}
                    scrolling="yes"
                    tabIndex={fullPreviewPhase === 'ready' ? 0 : -1}
                    title="Site preview"
                  />
                </div>
                {fullPreviewPhase !== 'ready' && (
                  <div
                    className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-4 bg-[#030303] px-6 text-center"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    {fullPreviewPhase === 'hold' && (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-9 h-9 border-2 border-cyan-400/35 border-t-cyan-400 rounded-full"
                        />
                        <div>
                          <p className="text-[15px] font-semibold text-white/92">Getting ready</p>
                          <p className="mt-2 text-[12px] text-white/45 max-w-sm leading-relaxed">
                            Short pause before we load your scroll frames so fullscreen scrolling stays smooth.
                          </p>
                        </div>
                      </>
                    )}
                    {fullPreviewPhase === 'bar' && (
                      <>
                        <p className="text-[15px] font-semibold text-white/92">Loading preview</p>
                        <div className="w-full max-w-xs">
                          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-150 ease-out"
                              style={{ width: `${Math.round(fullPreviewBar)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-white/45 tabular-nums">{Math.round(fullPreviewBar)}%</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="absolute top-4 right-4 z-20">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/75 border border-white/15 text-white/80 flex items-center justify-center backdrop-blur"
                    title="Close preview"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-white/60">
                <p className="text-sm font-medium">No preview available</p>
                <button onClick={() => setShowPreview(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">Close</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {(step === 'preparing' || step === 'gen-site') && (
        <div
          className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-5 md:w-[min(92vw,380px)] pointer-events-none"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#0c1018]/95 backdrop-blur-md p-4 shadow-2xl">
            {step === 'preparing' && frameProgress.total > 0 ? (
              <>
                <p className="text-sm font-semibold text-white">Preparing scroll frames</p>
                <p className="mt-1 text-xs text-white/55 tabular-nums">
                  {frameProgress.done} / {frameProgress.total} —{' '}
                  {Math.min(100, Math.round((frameProgress.done / frameProgress.total) * 100))}%
                </p>
                <div className="mt-3 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.min(100, (frameProgress.done / frameProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-white/40 leading-relaxed">
                  You can keep using the builder; up to {MAX_SCROLL_FRAMES} frames for smooth scroll.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Building your website</p>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Generating HTML and scroll-sync code (server; may take up to a minute). The page stays usable.
                </p>
                <div className="mt-3 flex justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-cyan-400/35 border-t-cyan-400 rounded-full"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!showPreview && <GuideChatWidget variant="builder" position="right" />}
    </div>
  );
}

function BuilderLoadingFallback() {
  return (
    <div className="draftly-builder-viewport fixed inset-0 z-[1] isolate font-sans text-white flex flex-col items-center justify-center bg-[#070810]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 108, 255, 0.18), transparent),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(0, 212, 170, 0.06), transparent),
            radial-gradient(ellipse 50% 30% at 0% 80%, rgba(99, 102, 241, 0.1), transparent)
          `,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-600/20 border border-white/10 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-sm bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse" />
        </div>
        <p className="text-[13px] text-white/50 font-medium animate-pulse">Loading 3D Builder…</p>
      </div>
    </div>
  );
}

export default function ThreeDBuilderPage() {
  return (
    <Suspense fallback={<BuilderLoadingFallback />}>
      <ThreeDBuilderInner />
    </Suspense>
  );
}
