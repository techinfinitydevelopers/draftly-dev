'use client';

import { useState, useRef, useEffect, useLayoutEffect, forwardRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BUILDER_IMAGE_MODELS,
  BUILDER_FIXED_IMAGE_MODEL_ID,
  BUILDER_IMAGE_RESOLUTION_OPTIONS,
  BUILDER_VIDEO_MODELS,
  BUILDER_VIDEO_QUALITY_OPTIONS,
  BUILDER_WEBSITE_DISPLAY_MODELS,
  getVideoModelById,
  getWebsiteDisplayModelById,
  type BuilderImageResolutionTier,
  type BuilderVideoQuality,
} from '@/lib/builder-display-models';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
/** Paid 3D Builder tiers — same set as `/api/3d-builder/generate-bg` eligible plans. */
const PAID_BUILDER_MEDIA_PLANS = [
  'basic',
  'basic-plus',
  'pro',
  'premium',
  'agency',
  'tester',
  'testing',
] as const;
const PREMIUM_MEDIA_PLANS = ['premium', 'agency', 'tester', 'testing'] as const;

export const UPGRADE_PAID_FOR_1080P_TITLE =
  'A paid plan (Basic or higher) is required for 1080p motion. Upgrade to unlock.';
export const UPGRADE_PREMIUM_AGENCY_TITLE =
  'Premium ($200/mo) required for 2K / 4K image and video output.';

export const UPGRADE_VEO_BASIC_TITLE =
  'Basic ($25/mo) or higher required for Veo 3.1 Fast (Google) and first→last frame video.';

export function WebsiteModelSelect({
  value,
  onChange,
  disabled,
  compact,
  hideLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Screen-reader only label; use with visible heading in a popover */
  hideLabel?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className={hideLabel ? 'sr-only' : 'text-[10px] font-semibold text-white/50'}>Site AI model</span>
      <select
        value={value}
        disabled={disabled}
        aria-label="Site AI model for HTML generation"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-0 bg-[#1A1A1A] border border-white/10 rounded-lg text-white/90 outline-none focus:border-white/30 disabled:opacity-40 ${
          compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-2 text-[12px]'
        }`}
      >
        {BUILDER_WEBSITE_DISPLAY_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoTip({ title }: { title: string }) {
  return (
    <button
      type="button"
      className="text-white/35 hover:text-cyan-300/80 transition-colors p-0.5 shrink-0"
      title={title}
      aria-label="Info"
    >
      <i className="fa-solid fa-circle-info text-[10px]" />
    </button>
  );
}

type ToolbarPopPos = { top: number; left: number; width: number; maxH: number };

/**
 * Fixed flyout anchored to viewport coords from the icon row. Portaled to `document.body` so
 * `backdrop-filter` / `transform` ancestors (3D Builder chat footer) do not trap `position: fixed`
 * or paint it under sibling layers.
 */
const IconToolbarFlyoutPanel = forwardRef<
  HTMLDivElement,
  {
    pos: ToolbarPopPos;
    title: string;
    iconClass: string;
    toneClass: string;
    ariaLabel: string;
    children: ReactNode;
  }
>(function IconToolbarFlyoutPanel(
  { pos, title, iconClass, toneClass, ariaLabel, children },
  ref,
) {
  const node = (
    <div
      ref={ref}
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-white/[0.14] bg-[#0c0c10]/[0.97] backdrop-blur-xl shadow-[12px_8px_48px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.04] pointer-events-auto"
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
      role="dialog"
      aria-label={ariaLabel}
    >
      <div className="flex-shrink-0 flex items-center gap-2 px-3.5 pt-3 pb-2.5 border-b border-white/[0.07]">
        <i className={`fa-solid ${iconClass} ${toneClass} text-[11px]`} aria-hidden />
        <span className="text-[11px] font-bold text-white/92 tracking-tight">{title}</span>
      </div>
      <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-3.5 py-3">{children}</div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
});

export type BuilderModelPickerRowProps = {
  websiteModelId: string;
  onWebsite: (id: string) => void;
  imageModelId: string;
  onImageModel: (id: string) => void;
  imageResolution: BuilderImageResolutionTier;
  onImageResolution: (r: BuilderImageResolutionTier) => void;
  videoModelId: string;
  onVideoModel: (id: string) => void;
  videoQuality: BuilderVideoQuality;
  onVideoQuality: (q: BuilderVideoQuality) => void;
  /** @deprecated Legacy props; Veo-only builder ignores these. */
  ltxVideoDuration?: number;
  onLtxVideoDuration?: (sec: number) => void;
  ltxVideoFps?: number;
  onLtxVideoFps?: (fps: number) => void;
  disabled?: boolean;
  showImage?: boolean;
  showVideo?: boolean;
  compact?: boolean;
  /** Home hero: single horizontal wrap row, no footer blurb. */
  variant?: 'default' | 'hero';
  /**
   * When set, overrides subscription-derived access (e.g. tests).
   * Otherwise uses owner / testing-credits email / Premium+ plans, and waits for subscription load.
   */
  premiumMediaUnlocked?: boolean;
  onUpgradeRequired?: (title: string, desc: string) => void;
  /**
   * When true, opening "Models & Quality" is blocked — callers should show pricing via onModelsBlocked.
   * Use for free-tier users (no paid subscription).
   */
  blockModelsExpand?: boolean;
  /** Called when user taps Models & Quality while blocked (e.g. show upgrade popup). */
  onModelsBlocked?: () => void;
  /**
   * Icon-only toolbar: globe / image / video buttons open popovers (click again to close).
   * Native `title` on each button explains the control on hover.
   */
  iconToolbar?: boolean;
  /**
   * 3D Builder chat: always-visible cards (video first) with plain-language model help.
   * Takes precedence over `iconToolbar`.
   */
  builderChatLayout?: boolean;
};

const BUILDER_CHAT_VIDEO_INTRO =
  'Veo 3.1 Fast (Google) is the default for cinematic motion. It supports first frame → last frame: you define a starting still and an ending still, and Veo animates between them.';

const BUILDER_CHAT_IMAGE_INTRO =
  'Generates the hero background still using Nano Banana Pro or Nano Banana (API-Easy).';

const BUILDER_CHAT_SITE_INTRO =
  'Chooses which AI writes your full scroll-driven site HTML when you run the website build step.';

/**
 * Chat footer — Site AI, image/video models + resolution.
 * Video: 720p/1080p for any paid Builder plan; 2K/4K video Premium+ only.
 * Image: 1K for paid; 2K/4K Premium+ only.
 */
export function BuilderModelPickerRow(props: BuilderModelPickerRowProps) {
  const {
    showImage = true,
    showVideo = true,
    disabled,
    compact,
    variant = 'default',
    premiumMediaUnlocked,
    blockModelsExpand,
    onModelsBlocked,
    iconToolbar,
    builderChatLayout,
  } = props;
  const isHero = variant === 'hero';
  const { subscription, loading, isOwner } = useSubscription();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState<'site' | 'image' | 'video' | null>(null);
  const pickerRootRef = useRef<HTMLDivElement>(null);
  const flyoutPanelRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<ToolbarPopPos | null>(null);

  useLayoutEffect(() => {
    if (!iconToolbar) {
      setPopPos(null);
      return;
    }
    if (!menuOpen) {
      setPopPos(null);
      return;
    }
    const update = () => {
      const el = measureRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(300, Math.max(232, window.innerWidth - 24));
      const maxH = Math.min(580, window.innerHeight - 16);
      const margin = 8;
      let left = r.right + margin;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, r.left - width - margin);
      }
      let top = r.top;
      if (top + maxH > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - margin - maxH);
      }
      if (top < margin) top = margin;
      setPopPos({ top, left, width, maxH });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [iconToolbar, menuOpen]);

  useEffect(() => {
    if (!iconToolbar || !menuOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (pickerRootRef.current?.contains(t)) return;
      if (flyoutPanelRef.current?.contains(t)) return;
      setMenuOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [iconToolbar, menuOpen]);

  /**
   * Firestore subscription defaults to `free` until the first snapshot. Optimistic unlock
   * applies only to the 1080p video chip (not 2K/4K — avoids false Premium-tier UI during sync).
   */
  const paidBuilderMediaUnlocked =
    isOwner ||
    isTestingCreditsEmail(user?.email || '') ||
    (subscription.status === 'active' &&
      PAID_BUILDER_MEDIA_PLANS.includes(subscription.plan as (typeof PAID_BUILDER_MEDIA_PLANS)[number]));

  const syncPremiumMediaUnlocked =
    isOwner ||
    isTestingCreditsEmail(user?.email || '') ||
    (subscription.status === 'active' &&
      PREMIUM_MEDIA_PLANS.includes(subscription.plan as (typeof PREMIUM_MEDIA_PLANS)[number]));

  /** Only for 720p/1080p — never unlock 2K/4K optimistically (avoids Premium popups during Firestore sync). */
  const optimistic1080pWhileSync = loading && Boolean(user?.uid);

  const can1080p = premiumMediaUnlocked ?? (paidBuilderMediaUnlocked || optimistic1080pWhileSync);
  const canHighRes = premiumMediaUnlocked ?? syncPremiumMediaUnlocked;

  const videoModelsForPlan = BUILDER_VIDEO_MODELS.filter((m) => {
    if (m.id === 'veo-31-fast') return paidBuilderMediaUnlocked || optimistic1080pWhileSync;
    return true;
  });

  const imageModelsForPlan = BUILDER_IMAGE_MODELS;

  const vid = getVideoModelById(props.videoModelId);

  const openToolbarMenu = (next: 'site' | 'image' | 'video') => {
    if (blockModelsExpand && onModelsBlocked) {
      onModelsBlocked();
      return;
    }
    setMenuOpen((cur) => (cur === next ? null : next));
  };

  const webModel = getWebsiteDisplayModelById(props.websiteModelId);
  const imageModel = BUILDER_IMAGE_MODELS.find((m) => m.id === props.imageModelId);

  // Home uses `variant="hero"` to hide some chips; internal compact mode should still show
  // image/video chips, but we want the lane layout inline + wrapped horizontally.
  const gridClass = isHero
    ? 'flex flex-row flex-wrap items-end gap-x-2 sm:gap-x-3 gap-y-2 min-w-0'
    : compact
      ? 'flex flex-row flex-wrap items-end gap-x-2 sm:gap-x-3 gap-y-2 min-w-0'
      : 'grid grid-cols-1 lg:grid-cols-2 gap-2';

  const colClass = isHero || compact ? 'min-w-[118px] sm:min-w-[132px] max-w-[220px] flex-1' : '';

  if (builderChatLayout) {
    const videoLocked = Boolean(blockModelsExpand);
    return (
      <div className="rounded-xl border border-white/[0.12] bg-[#0d0f14] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="px-3 py-2 border-b border-white/[0.08] bg-white/[0.03]">
          <p className="text-[11px] font-bold text-white/90 tracking-tight">Models for this build</p>
          <p className="text-[10px] text-white/45 mt-0.5 leading-snug">
            Video first — motion quality and first/last frame depend on the video model below.
          </p>
        </div>
        <div className="p-3 space-y-3">
          {/* 1 — Motion video (priority) */}
          {showVideo && (
            <div className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.12] via-[#0a0c12] to-[#080a10] p-3 ring-1 ring-amber-400/10">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[12px] font-bold text-white">Motion video</span>
                <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-400/25 text-amber-50 border border-amber-300/40">
                  Veo 3.1 Fast
                </span>
              </div>
              <p className="text-[11px] text-amber-50/75 leading-relaxed mb-2.5">{BUILDER_CHAT_VIDEO_INTRO}</p>
              <label className="block">
                <span className="text-[10px] font-semibold text-white/50 mb-1 block">Video model</span>
                <select
                  value={props.videoModelId}
                  disabled={disabled || videoLocked}
                  aria-label="Video generation model"
                  onChange={(e) => {
                    if (videoLocked && onModelsBlocked) {
                      onModelsBlocked();
                      return;
                    }
                    const id = e.target.value;
                    if (id === 'veo-31-fast' && !paidBuilderMediaUnlocked && !optimistic1080pWhileSync) {
                      if (props.onUpgradeRequired) {
                        props.onUpgradeRequired('Paid plan required', UPGRADE_VEO_BASIC_TITLE);
                      }
                      return;
                    }
                    props.onVideoModel(id);
                  }}
                  className="w-full min-w-0 bg-[#14161f] border border-amber-400/25 rounded-lg text-white/95 outline-none focus:border-amber-400/50 disabled:opacity-40 px-2.5 py-2 text-[12px]"
                >
                  {videoModelsForPlan.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {' — single image or first + last frame'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2.5">
                <span className="text-[10px] font-semibold text-white/45 mb-1.5 block">Output quality</span>
                <div className="flex flex-wrap gap-1.5">
                  {BUILDER_VIDEO_QUALITY_OPTIONS.map((opt) => {
                    const lockedHighRes = opt.value === '2k' && !canHighRes;
                    const locked720 = opt.value === '720p' && !can1080p;
                    const locked = lockedHighRes || locked720 || videoLocked;
                    const titleMsg = lockedHighRes
                      ? UPGRADE_PREMIUM_AGENCY_TITLE
                      : locked720
                        ? UPGRADE_PAID_FOR_1080P_TITLE
                        : `Video output: ${opt.label}`;
                    const sel = props.videoQuality === opt.value;
                    const activeLook = sel && !locked;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (videoLocked && onModelsBlocked) {
                            onModelsBlocked();
                            return;
                          }
                          if (locked) {
                            if (props.onUpgradeRequired) props.onUpgradeRequired('Upgrade Required', titleMsg);
                            return;
                          }
                          props.onVideoQuality(opt.value);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                          activeLook
                            ? 'bg-amber-500/30 text-amber-50 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : locked
                              ? 'bg-rose-500/10 text-rose-300/90 border-rose-500/25'
                              : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
                        }`}
                        title={titleMsg}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2 — Hero image */}
          {showImage && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[12px] font-bold text-white">Hero still</span>
                <span className="text-[9px] font-semibold text-emerald-200/80 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/25">
                  Background image
                </span>
              </div>
              <p className="text-[11px] text-white/55 leading-relaxed mb-2.5">{BUILDER_CHAT_IMAGE_INTRO}</p>
              <label className="block">
                <span className="text-[10px] font-semibold text-white/50 mb-1 block">Image model</span>
                <select
                  value={props.imageModelId}
                  disabled={disabled || videoLocked}
                  aria-label="Image generation model"
                  onChange={(e) => {
                    if (videoLocked && onModelsBlocked) {
                      onModelsBlocked();
                      return;
                    }
                    const id = e.target.value;
                    props.onImageModel(id);
                  }}
                  className="w-full min-w-0 bg-[#14161f] border border-emerald-500/20 rounded-lg text-white/95 outline-none focus:border-emerald-400/45 disabled:opacity-40 px-2.5 py-2 text-[12px]"
                >
                  {imageModelsForPlan.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2.5">
                <span className="text-[10px] font-semibold text-white/45 mb-1.5 block">Still resolution</span>
                <div className="flex flex-wrap gap-1.5">
                  {BUILDER_IMAGE_RESOLUTION_OPTIONS.map((opt) => {
                    const locked = opt.value === '2K' && !canHighRes;
                    const sel = props.imageResolution === opt.value;
                    const activeLook = sel && !locked;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (videoLocked && onModelsBlocked) {
                            onModelsBlocked();
                            return;
                          }
                          if (locked) {
                            if (props.onUpgradeRequired) {
                              props.onUpgradeRequired('Premium Plan Required', UPGRADE_PREMIUM_AGENCY_TITLE);
                            }
                            return;
                          }
                          props.onImageResolution(opt.value);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                          activeLook
                            ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/45'
                            : locked
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                              : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
                        }`}
                        title={locked ? UPGRADE_PREMIUM_AGENCY_TITLE : `Still output: ${opt.label}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3 — Site AI */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-white">Site code</span>
              <span className="text-[9px] text-blue-200/70 font-medium">HTML generation</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mb-2">{BUILDER_CHAT_SITE_INTRO}</p>
            <WebsiteModelSelect
              value={props.websiteModelId}
              onChange={(id) => {
                if (videoLocked && onModelsBlocked) {
                  onModelsBlocked();
                  return;
                }
                props.onWebsite(id);
              }}
              disabled={disabled || videoLocked}
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  if (iconToolbar) {
    const iconBtn = (active: boolean, color: 'blue' | 'emerald' | 'amber') => {
      const colors = {
        blue: active
          ? 'border-blue-400/50 bg-blue-500/20 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.2)]'
          : 'border-blue-500/15 bg-blue-500/[0.06] text-blue-300/70 hover:bg-blue-500/15 hover:text-blue-200',
        emerald: active
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
          : 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-300/70 hover:bg-emerald-500/15 hover:text-emerald-200',
        amber: active
          ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.2)]'
          : 'border-amber-500/15 bg-amber-500/[0.06] text-amber-300/70 hover:bg-amber-500/15 hover:text-amber-200',
      };
      return `h-8 w-8 flex-shrink-0 rounded-lg border flex items-center justify-center transition-all disabled:opacity-40 ${colors[color]}`;
    };

    return (
      <div ref={pickerRootRef} className="relative overflow-visible rounded-lg border border-white/10 bg-[#111111] px-1 py-0.5">
        <div className="flex items-center justify-end gap-0.5 sm:justify-between">
          <span className="sr-only">Model and quality settings</span>
          <div className="hidden sm:flex items-center gap-1 text-white/25" aria-hidden>
            <i className="fa-solid fa-sliders text-[9px]" />
          </div>
          <div ref={measureRef} className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => openToolbarMenu('site')}
              className={iconBtn(menuOpen === 'site', 'blue')}
              title={`Site AI (${webModel.short}): picks the model that writes your full website HTML. Click to change.`}
            >
              <i className="fa-solid fa-globe text-[13px]" aria-hidden />
            </button>
            {showImage && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => openToolbarMenu('image')}
                className={iconBtn(menuOpen === 'image', 'emerald')}
                title={`Image model (${imageModel?.short ?? '?'} @ ${props.imageResolution}): hero stills and backgrounds. Click to change model or resolution.`}
              >
                <i className="fa-solid fa-image text-[13px]" aria-hidden />
              </button>
            )}
            {showVideo && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => openToolbarMenu('video')}
                className={iconBtn(menuOpen === 'video', 'amber')}
                title={`Video (${vid.short} · ${props.videoQuality}): Veo 3.1 motion. Click to change quality.`}
              >
                <i className="fa-solid fa-film text-[13px]" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {menuOpen === 'site' && popPos && (
          <IconToolbarFlyoutPanel
            ref={flyoutPanelRef}
            pos={popPos}
            title="Site AI"
            iconClass="fa-globe"
            toneClass="text-blue-300"
            ariaLabel="Site AI model"
          >
            <p className="text-[11px] text-white/55 leading-relaxed mb-2.5">
              Choose which AI generates your full site HTML, layout, and copy. Billing may differ by model — details appear at generate time.
            </p>
            <WebsiteModelSelect
              value={props.websiteModelId}
              onChange={props.onWebsite}
              disabled={disabled}
              compact
              hideLabel
            />
          </IconToolbarFlyoutPanel>
        )}

        {menuOpen === 'image' && showImage && popPos && (
          <IconToolbarFlyoutPanel
            ref={flyoutPanelRef}
            pos={popPos}
            title="Hero still"
            iconClass="fa-image"
            toneClass="text-emerald-300"
            ariaLabel="Image model"
          >
            <p className="text-[11px] text-white/55 leading-relaxed mb-2.5">
              Hero stills use Nano Banana Pro or Nano Banana. 2K/4K stills need Premium+.
            </p>
            <select
              value={props.imageModelId}
              disabled={disabled}
              aria-label="Image generation model"
              onChange={(e) => {
                props.onImageModel(e.target.value);
              }}
              className="w-full min-w-0 bg-[#1A1A1A] border border-white/10 rounded-lg text-white/90 outline-none focus:border-white/30 disabled:opacity-40 px-2 py-1.5 text-[11px] mb-2"
            >
              {imageModelsForPlan.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {BUILDER_IMAGE_RESOLUTION_OPTIONS.map((opt) => {
                const locked = opt.value === '2K' && !canHighRes;
                const sel = props.imageResolution === opt.value;
                const activeLook = sel && !locked;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (locked) {
                        if (props.onUpgradeRequired) props.onUpgradeRequired('Premium Plan Required', UPGRADE_PREMIUM_AGENCY_TITLE);
                        return;
                      }
                      props.onImageResolution(opt.value);
                    }}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-[11px] font-medium border transition-all min-w-[2.25rem] ${
                      activeLook
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : locked
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                    }`}
                    title={locked ? UPGRADE_PREMIUM_AGENCY_TITLE : `Still image output: ${opt.label}`}
                  >
                    {locked ? <i className="fa-solid fa-lock text-[9px] text-rose-400/80" aria-hidden /> : <span className="h-[8px]" aria-hidden />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </IconToolbarFlyoutPanel>
        )}

        {menuOpen === 'video' && showVideo && popPos && (
          <IconToolbarFlyoutPanel
            ref={flyoutPanelRef}
            pos={popPos}
            title="Motion & video"
            iconClass="fa-film"
            toneClass="text-amber-300"
            ariaLabel="Video model"
          >
            <p className="text-[11px] text-white/55 leading-relaxed mb-2.5">
              Veo 3.1 Fast (Google) on paid plans. 720p/1080p on any paid plan; 2K/4K video needs Premium+.
            </p>
            <select
              value={props.videoModelId}
              disabled={disabled}
              aria-label="Video generation model"
              onChange={(e) => {
                const id = e.target.value;
                if (
                  id === 'veo-31-fast' &&
                  !paidBuilderMediaUnlocked &&
                  !optimistic1080pWhileSync
                ) {
                  if (props.onUpgradeRequired) {
                    props.onUpgradeRequired('Paid plan required', UPGRADE_VEO_BASIC_TITLE);
                  }
                  return;
                }
                props.onVideoModel(id);
              }}
              className="w-full min-w-0 bg-[#1A1A1A] border border-white/10 rounded-lg text-white/90 outline-none focus:border-white/30 disabled:opacity-40 px-2 py-1.5 text-[11px] mb-2"
            >
              {videoModelsForPlan.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1 mb-2">
              {BUILDER_VIDEO_QUALITY_OPTIONS.map((opt) => {
                const lockedHighRes = opt.value === '2k' && !canHighRes;
                const locked720 = opt.value === '720p' && !can1080p;
                const locked = lockedHighRes || locked720;
                const titleMsg = lockedHighRes
                  ? UPGRADE_PREMIUM_AGENCY_TITLE
                  : locked720
                    ? UPGRADE_PAID_FOR_1080P_TITLE
                    : `Video output: ${opt.label}`;
                const sel = props.videoQuality === opt.value;
                const activeLook = sel && !locked;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (locked) {
                        if (props.onUpgradeRequired) props.onUpgradeRequired('Upgrade Required', titleMsg);
                        return;
                      }
                      props.onVideoQuality(opt.value);
                    }}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-[11px] font-medium border transition-all min-w-[2.25rem] ${
                      activeLook
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : locked
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                    }`}
                    title={titleMsg}
                  >
                    {locked ? <i className="fa-solid fa-lock text-[9px] text-rose-400/80" aria-hidden /> : <span className="h-[8px]" aria-hidden />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </IconToolbarFlyoutPanel>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${isHero ? 'mb-0' : 'mb-2.5'} rounded-xl border border-white/10 bg-[#111111] overflow-hidden`}
    >
      <button 
        onClick={() => {
          if (blockModelsExpand && onModelsBlocked) {
            onModelsBlocked();
            return;
          }
          setExpanded(!expanded);
        }}
        type="button"
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors ${expanded ? 'border-b border-white/10' : ''}`}
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-sliders text-white/40 text-[10px]" />
          <p className="text-[10px] font-semibold text-white/70 flex items-center gap-1.5">
            Models & Quality
            {blockModelsExpand && (
              <i className="fa-solid fa-lock text-[9px] text-amber-400/90" aria-hidden title="Subscription required" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-[9px] text-white/40 font-mono hidden sm:inline-block truncate max-w-[240px]">
              {props.imageResolution} · {vid.short} · {props.videoQuality}
            </span>
          )}
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[10px] text-white/40`} />
        </div>
      </button>

      {expanded && (
        <div className={`p-3`}>
          <div className={gridClass}>
        <div className={colClass}>
        <WebsiteModelSelect
          value={props.websiteModelId}
          onChange={props.onWebsite}
          disabled={disabled}
          compact={compact || isHero}
        />
        </div>

        {showImage && (
          <div className={`flex flex-col gap-2 min-w-0 ${colClass}`}>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-white/50">Image</span>
              <InfoTip title="Nano Banana Pro or Nano Banana for hero stills. First→last frame video uses Veo when you enable it in the flow." />
            </div>
            <select
              value={props.imageModelId}
              disabled={disabled}
              onChange={(e) => props.onImageModel(e.target.value)}
              className={`w-full min-w-0 bg-[#1A1A1A] border border-white/10 rounded-lg text-white/90 outline-none focus:border-white/30 disabled:opacity-40 ${
                compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-2 text-[12px]'
              }`}
            >
              {imageModelsForPlan.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {!isHero && (
              <div className="flex flex-wrap gap-1">
                {BUILDER_IMAGE_RESOLUTION_OPTIONS.map((opt) => {
                  const locked = opt.value === '2K' && !canHighRes;
                  const sel = props.imageResolution === opt.value;
                  const activeLook = sel && !locked;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (locked) {
                          if (props.onUpgradeRequired) props.onUpgradeRequired('Premium Plan Required', UPGRADE_PREMIUM_AGENCY_TITLE);
                          return;
                        }
                        props.onImageResolution(opt.value);
                      }}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-[11px] font-medium border transition-all min-w-[2.5rem] ${
                        activeLook
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : locked
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                      }`}
                      title={locked ? UPGRADE_PREMIUM_AGENCY_TITLE : opt.label}
                    >
                      {locked ? (
                        <i className="fa-solid fa-lock text-[10px] text-rose-400/80" aria-hidden />
                      ) : (
                        <span className="h-[10px]" aria-hidden />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showVideo && (
          <div className={`flex flex-col gap-2 min-w-0 ${colClass}`}>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-white/50">Video</span>
              <InfoTip title="Veo 3.1 Fast (Google / API-Easy) on Basic+. 2K/4K video: Premium+. First→last frame uses Veo." />
            </div>
            <select
              value={props.videoModelId}
              disabled={disabled}
              onChange={(e) => {
                const id = e.target.value;
                if (
                  id === 'veo-31-fast' &&
                  !paidBuilderMediaUnlocked &&
                  !optimistic1080pWhileSync
                ) {
                  if (props.onUpgradeRequired) {
                    props.onUpgradeRequired('Paid plan required', UPGRADE_VEO_BASIC_TITLE);
                  }
                  return;
                }
                props.onVideoModel(id);
              }}
              className={`w-full min-w-0 bg-[#1A1A1A] border border-white/10 rounded-lg text-white/90 outline-none focus:border-white/30 disabled:opacity-40 ${
                compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-2 text-[12px]'
              }`}
            >
              {videoModelsForPlan.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {!isHero && (
              <div className="flex flex-wrap gap-1">
                {BUILDER_VIDEO_QUALITY_OPTIONS.map((opt) => {
                  const lockedHighRes = opt.value === '2k' && !canHighRes;
                  const locked720 = opt.value === '720p' && !can1080p;
                  const locked = lockedHighRes || locked720;
                  const titleMsg = lockedHighRes
                    ? UPGRADE_PREMIUM_AGENCY_TITLE
                    : locked720
                      ? UPGRADE_PAID_FOR_1080P_TITLE
                      : opt.label;

                  const sel = props.videoQuality === opt.value;
                  const activeLook = sel && !locked;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (locked) {
                          if (props.onUpgradeRequired) props.onUpgradeRequired('Upgrade Required', titleMsg);
                          return;
                        }
                        props.onVideoQuality(opt.value);
                      }}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-[11px] font-medium border transition-all min-w-[2.5rem] ${
                        activeLook
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.15)] font-bold'
                          : locked
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            : opt.value === '2k'
                              ? 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/20 hover:bg-emerald-500/15'
                              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                      }`}
                      title={titleMsg}
                    >
                      {locked ? (
                        <i className="fa-solid fa-lock text-[10px] text-rose-400/80" aria-hidden />
                      ) : (
                        <span className="h-[10px]" aria-hidden />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
        {!isHero && (
          <p className="mt-3 text-[10px] text-white/30 leading-snug">
            Site AI chooses the model for site generation. Image and video choices set the models for backgrounds and motion.
          </p>
        )}
      </div>
      )}
    </div>
  );
}
