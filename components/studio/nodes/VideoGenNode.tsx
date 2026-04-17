'use client';

import { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useStudioStore } from '@/lib/studio-store';
import { compressImagesForApi } from '@/lib/image-utils';
import { handleStudioUpgradeRedirect } from '@/lib/studio-upgrade';
import { useSubscription } from '@/hooks/useSubscription';
import { getAvailableVideoModels, getVideoCreditCost } from '@/lib/model-router';

const VIDEO_PROGRESS_TARGET_MS = 60_000; // Reach near-complete in ~1 minute
const VIDEO_POLL_INTERVAL_MS = 1000; // Smoother decimal progress updates
const VIDEO_PROGRESS_TICK_MS = 200;

// Video models — Veo first (best quality), then fal.ai
// variableDuration: whether the model supports user-chosen duration
// fixedDuration: the fixed output length when not variable
const MODEL_OPTIONS = [
  { value: 'veo-3.1-fast', label: 'Veo 3.1 Fast', provider: 'gemini', creditsPerSec: 32, locked: false, variableDuration: false, fixedDuration: 8 },
  { value: 'veo-3.1', label: 'Veo 3.1 (Best)', provider: 'gemini', creditsPerSec: 48, locked: true, variableDuration: false, fixedDuration: 8 },
  { value: 'wan-video', label: 'WAN Video', provider: 'fal', creditsPerSec: 32, locked: true, variableDuration: false, fixedDuration: 4 },
  { value: 'kling-1.6', label: 'Kling 1.6', provider: 'fal', creditsPerSec: 36, locked: true, variableDuration: true, fixedDuration: 5 },
  { value: 'kling-1.6-pro', label: 'Kling 1.6 Pro', provider: 'fal', creditsPerSec: 36, locked: true, variableDuration: true, fixedDuration: 5 },
  { value: 'minimax-video-fal', label: 'Minimax Video', provider: 'fal', creditsPerSec: 32, locked: true, variableDuration: false, fixedDuration: 6 },
  { value: 'luma-dream-machine', label: 'Luma Dream Machine', provider: 'fal', creditsPerSec: 32, locked: true, variableDuration: false, fixedDuration: 5 },
  { value: 'hunyuan-video', label: 'Hunyuan Video', provider: 'fal', creditsPerSec: 32, locked: true, variableDuration: false, fixedDuration: 4 },
  { value: 'local-animatediff', label: 'Local AnimateDiff (Free)', provider: 'local', creditsPerSec: 0, locked: false, variableDuration: false, fixedDuration: 2 },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 Wide' },
  { value: '9:16', label: '9:16 Tall' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Standard' },
];

const RESOLUTION_OPTIONS = [
  { value: '1K', label: '1K (1080p)', locked: false },
  { value: '2K', label: '2K (1440p)', locked: true },
  { value: '4K', label: '4K (2160p)', locked: true },
];

function VideoGenNode({ id, data }: NodeProps) {
  const { subscription, loading: subLoading } = useSubscription();
  const updateNodeData = useStudioStore((s) => s.updateNodeData);
  const getUpstreamData = useStudioStore((s) => s.getUpstreamData);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const pollStartedAtRef = useRef<number | null>(null);

  const d = data as {
    model: string;
    duration: number;
    aspectRatio: string;
    resolution: string;
    outputUrl: string | null;
    jobId: string | null;
    isRunning: boolean;
    progress: number;
    error: string | null;
  };

  // Backward compatibility for older saved workflows that used veo-3.0* IDs.
  const normalizedModelValue =
    d.model === 'veo-3.0-fast' ? 'veo-3.1-fast' : d.model === 'veo-3.0' ? 'veo-3.1' : d.model;

  const selectedModelDef = useMemo(() => MODEL_OPTIONS.find((m) => m.value === normalizedModelValue), [normalizedModelValue]);
  const selectedRes = useMemo(() => RESOLUTION_OPTIONS.find((r) => r.value === (d.resolution || '1K')), [d.resolution]);
  const plan = subscription.plan || 'free';
  const availableVideoIds = useMemo(
    () => new Set(getAvailableVideoModels(plan).map((m) => m.id)),
    [plan],
  );

  const hasPaidStudioAccess = useMemo(
    () =>
      subscription.status === 'active' &&
      ['basic', 'basic-plus', 'testing', 'pro', 'premium', 'agency', 'tester'].includes(subscription.plan),
    [subscription.plan, subscription.status],
  );
  /** 2K/4K — Premium ($200) and above only. */
  const hasHighResAccess = useMemo(
    () =>
      subscription.status === 'active' &&
      ['premium', 'agency', 'tester', 'testing'].includes(subscription.plan),
    [subscription.plan, subscription.status],
  );
  const isModelLocked = useMemo(() => {
    if (normalizedModelValue === 'local-animatediff') return false;
    return !availableVideoIds.has(normalizedModelValue);
  }, [normalizedModelValue, availableVideoIds]);
  const isResolutionLocked = useMemo(
    () =>
      !!selectedRes &&
      selectedRes.locked &&
      !hasHighResAccess,
    [selectedRes, hasHighResAccess],
  );

  // Use the model's fixed duration when it doesn't support variable duration
  const effectiveDuration = useMemo(() => {
    if (!selectedModelDef) return d.duration;
    if (!selectedModelDef.variableDuration) return selectedModelDef.fixedDuration;
    return d.duration;
  }, [d.duration, selectedModelDef, normalizedModelValue]);

  const estimatedCredits = useMemo(() => {
    const id = normalizedModelValue || 'veo-3.1-fast';
    return getVideoCreditCost(id, effectiveDuration, d.resolution || '1K');
  }, [effectiveDuration, normalizedModelValue, d.resolution]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const stopTracking = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsedMs = pollStartedAtRef.current ? Date.now() - pollStartedAtRef.current : 0;
      const timedProgress = Math.min((elapsedMs / VIDEO_PROGRESS_TARGET_MS) * 99, 99);
      updateNodeData(id, { progress: Number(timedProgress.toFixed(1)) });
    }, VIDEO_PROGRESS_TICK_MS);
  }, [id, updateNodeData]);

  const pollStatus = useCallback(
    async (jobId: string, provider: string, modelName: string) => {
      pollCountRef.current = 0;
      pollStartedAtRef.current = Date.now();
      startProgressTracking();
      let networkErrorCount = 0;
      pollingRef.current = setInterval(async () => {
        try {
          pollCountRef.current += 1;
          const res = await fetch(
            `/api/studio/poll-status?jobId=${encodeURIComponent(jobId)}&provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(modelName)}`,
          );

          if (!res.ok) {
            networkErrorCount += 1;
            if (networkErrorCount >= 5) {
              stopTracking();
              updateNodeData(id, {
                isRunning: false,
                error: `Poll failed after ${networkErrorCount} retries (HTTP ${res.status})`,
                jobId: null,
              });
            }
            return;
          }

          networkErrorCount = 0; // reset on success
          let result;
          try {
            result = await res.json();
          } catch {
            return; // skip this poll if response isn't valid JSON
          }

          if (result.status === 'completed') {
            stopTracking();
            if (result.outputUrl) {
              updateNodeData(id, {
                outputUrl: result.outputUrl,
                isRunning: false,
                progress: 100,
                jobId: null,
              });
            } else {
              updateNodeData(id, {
                isRunning: false,
                error: 'Video completed but no URL returned. Try generating again.',
                jobId: null,
              });
            }
          } else if (result.status === 'failed') {
            stopTracking();
            updateNodeData(id, {
              isRunning: false,
              error: result.error || 'Video generation failed',
              jobId: null,
            });
          } else {
            // Still processing — keep smooth timer-driven progress, but allow
            // provider progress to jump ahead when it is available.
            const serverProgress =
              typeof result.progress === 'number' && Number.isFinite(result.progress) ? result.progress : null;
            if (serverProgress !== null) updateNodeData(id, { progress: Number(Math.min(serverProgress, 99).toFixed(1)) });
          }

          // Safety timeout — stop polling after 5 minutes
          const elapsedMs = pollStartedAtRef.current ? Date.now() - pollStartedAtRef.current : 0;
          if (elapsedMs > 5 * 60 * 1000) {
            stopTracking();
            updateNodeData(id, {
              isRunning: false,
              error: 'Video generation timed out. Try again.',
              jobId: null,
            });
          }
        } catch {
          networkErrorCount += 1;
          if (networkErrorCount >= 5) {
            stopTracking();
            updateNodeData(id, {
              isRunning: false,
              error: 'Lost connection to server. Try generating again.',
              jobId: null,
            });
          }
        }
      }, VIDEO_POLL_INTERVAL_MS);
    },
    [id, updateNodeData, startProgressTracking, stopTracking],
  );

  // Get userId from store for credit billing
  const currentUserId = useStudioStore((s) => s.currentUserId);

  const handleRun = useCallback(async () => {
    const upstream = getUpstreamData(id);
    if (!upstream.prompt && !upstream.imageUrl) {
      updateNodeData(id, { error: 'Connect a Text Prompt or Image source node first' });
      return;
    }

    if (!hasPaidStudioAccess) {
      updateNodeData(id, { error: 'Studio video generation requires a paid plan (Basic/Pro/Premium).' });
      return;
    }

    if (normalizedModelValue !== 'local-animatediff' && !availableVideoIds.has(normalizedModelValue)) {
      updateNodeData(id, {
        error: 'This video model is not on your plan. Premium ($200/mo) unlocks Veo and the full catalog.',
      });
      return;
    }

    // Check resolution lock
    const res = RESOLUTION_OPTIONS.find((r) => r.value === (d.resolution || '1K'));
    if (res?.locked && !hasHighResAccess) {
      updateNodeData(id, {
        error: '2K/4K video requires Premium ($200/mo) or Agency ($1,000/mo).',
      });
      return;
    }

    stopTracking();
    updateNodeData(id, { isRunning: true, error: null, outputUrl: null, progress: 0.5 });
    // Start optimistic progress immediately so long-running initial requests
    // do not appear frozen at 0.5% before job polling begins.
    pollStartedAtRef.current = Date.now();
    startProgressTracking();

    try {
      // Compress base64 images before sending to avoid body size limits
      const compressedImages = upstream.imageUrls.length > 0
        ? await compressImagesForApi(upstream.imageUrls)
        : [];

      const selectedModel = MODEL_OPTIONS.find((m) => m.value === normalizedModelValue) || MODEL_OPTIONS[0];
      const fetchRes = await fetch('/api/studio/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId || undefined,
          prompt: upstream.prompt || '',
          imageUrl: compressedImages[0] || null,
          imageUrls: compressedImages.length > 0 ? compressedImages : null,
          model: normalizedModelValue,
          provider: selectedModel.provider,
          duration: selectedModel.variableDuration ? effectiveDuration : selectedModel.fixedDuration,
          aspectRatio: d.aspectRatio || '16:9',
          resolution: d.resolution || '1K',
        }),
      });

      if (!fetchRes.ok) {
        let errMsg = 'Video generation failed';
        try {
          const err = await fetchRes.json();
          errMsg = handleStudioUpgradeRedirect(err, errMsg);
        } catch {
          const text = await fetchRes.text().catch(() => '');
          if (text.includes('Request Entity Too Large') || fetchRes.status === 413) {
            errMsg = 'Images too large. Try using smaller source images.';
          } else {
            errMsg = `Server error (${fetchRes.status})`;
          }
        }
        throw new Error(errMsg);
      }

      const result = await fetchRes.json();

      if (result.outputUrl) {
        stopTracking();
        updateNodeData(id, { outputUrl: result.outputUrl, isRunning: false, progress: 100 });
      } else if (result.jobId) {
        updateNodeData(id, { jobId: result.jobId, progress: 1 });
        const pollProvider =
          typeof (result as { provider?: string }).provider === 'string'
            ? (result as { provider: string }).provider
            : selectedModel.provider;
        pollStatus(result.jobId, pollProvider, (result as { model?: string }).model || normalizedModelValue);
      } else {
        throw new Error('No video job started. Try again.');
      }
    } catch (err: unknown) {
      stopTracking();
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateNodeData(id, { isRunning: false, error: message });
    }
  }, [
    id,
    normalizedModelValue,
    d.duration,
    d.aspectRatio,
    d.resolution,
    effectiveDuration,
    currentUserId,
    getUpstreamData,
    updateNodeData,
    pollStatus,
    stopTracking,
    hasPaidStudioAccess,
    availableVideoIds,
    hasHighResAccess,
    startProgressTracking,
  ]);

  useEffect(() => {
    if (subLoading) return;
    if (normalizedModelValue === 'local-animatediff' || availableVideoIds.has(normalizedModelValue)) return;
    const fb = getAvailableVideoModels(plan)[0]?.id ?? 'veo-3.1-fast';
    updateNodeData(id, { model: fb });
  }, [subLoading, availableVideoIds, normalizedModelValue, id, plan, updateNodeData]);

  // Batch trigger
  const batchVideoTrigger = useStudioStore((s) => s.batchVideoTrigger);
  const prevBatchRef = useRef(batchVideoTrigger);
  useEffect(() => {
    if (batchVideoTrigger > 0 && batchVideoTrigger !== prevBatchRef.current) {
      prevBatchRef.current = batchVideoTrigger;
      if (!d.isRunning) {
        handleRun();
      }
    }
  }, [batchVideoTrigger, d.isRunning, handleRun]);

  return (
    <div className="relative w-[400px]">
      <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-rose-600/20 to-pink-600/20 border-b border-white/5">
        <div className="w-6 h-6 rounded-md bg-rose-500/20 flex items-center justify-center">
          <i className="fa-solid fa-film text-rose-400 text-xs"></i>
        </div>
        <span className="text-xs font-semibold text-white/90 tracking-wide">VIDEO GENERATION</span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Model */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1 flex items-center justify-between">
            <span>Model</span>
            {estimatedCredits > 0 && (
              <span className="text-[9px] text-rose-300/60">~{estimatedCredits} credits</span>
            )}
          </label>
          <select
            value={normalizedModelValue}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer"
          >
            {MODEL_OPTIONS.map((m) => {
              const optLocked = m.value !== 'local-animatediff' && !availableVideoIds.has(m.value);
              return (
                <option key={m.value} value={m.value} className="bg-[#1a1a1a]">
                  {optLocked ? '🔒 ' : ''}
                  {m.label}
                  {m.creditsPerSec > 0 ? ` (${m.creditsPerSec}cr/s)` : ' (Free)'}
                  {optLocked ? ' [Premium $200/mo]' : ''}
                </option>
              );
            })}
          </select>
          {isModelLocked && (
            <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <i className="fa-solid fa-lock text-[9px] text-amber-400"></i>
              <span className="text-[10px] text-amber-400">Requires Premium ($200/mo) for Veo and locked models</span>
            </div>
          )}
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1 block">
            Aspect Ratio
          </label>
          <div className="flex gap-1 flex-wrap">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                onClick={() => updateNodeData(id, { aspectRatio: ar.value })}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  (d.aspectRatio || '16:9') === ar.value
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1 flex items-center justify-between">
            <span>Resolution</span>
            <button
              type="button"
              className="text-white/25 hover:text-rose-300/80 transition-colors p-0.5"
              title="2K and 4K video use premium APIs and cost much more than 1K. Unlocked on Premium ($200/mo) and Agency ($1,000/mo) only."
              aria-label="About 2K and 4K video pricing"
            >
              <i className="fa-solid fa-circle-info text-[10px]" />
            </button>
          </label>
          <div className="flex gap-1.5">
            {RESOLUTION_OPTIONS.map((res) => (
              <button
                key={res.value}
                onClick={() => (!res.locked || hasHighResAccess) && updateNodeData(id, { resolution: res.value })}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                  (d.resolution || '1K') === res.value
                    ? (res.locked && !hasHighResAccess)
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : (res.locked && !hasHighResAccess)
                      ? 'bg-white/[0.02] text-white/30 border border-white/5 cursor-not-allowed'
                      : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {res.locked && !hasHighResAccess && <i className="fa-solid fa-lock text-[8px]"></i>}
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration — only show slider for models that support variable duration */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              Duration
              <button
                type="button"
                className="text-white/25 hover:text-rose-300/80 transition-colors p-0.5"
                title="Credits scale with seconds and resolution (2K/4K are much higher). Estimates shown above include your current resolution."
                aria-label="About video duration and credits"
              >
                <i className="fa-solid fa-circle-info text-[10px]" />
              </button>
            </span>
            <span className="text-white/60">{effectiveDuration}s</span>
          </label>
          {selectedModelDef?.variableDuration ? (
            <input
              type="range"
              min={5}
              max={10}
              step="1"
              value={d.duration}
              onChange={(e) => updateNodeData(id, { duration: parseInt(e.target.value) })}
              className="w-full accent-rose-500"
            />
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
              <i className="fa-solid fa-clock text-[9px] text-white/30"></i>
              <span className="text-[10px] text-white/40 flex-1">
                Fixed at {selectedModelDef?.fixedDuration || 8}s for this model
              </span>
              <button
                type="button"
                className="text-white/25 hover:text-rose-300/80 transition-colors p-0.5 shrink-0"
                title="Credits scale with resolution (2K/4K are much higher). Pro/Premium unlock high resolution."
                aria-label="About fixed duration and credits"
              >
                <i className="fa-solid fa-circle-info text-[10px]" />
              </button>
            </div>
          )}
        </div>

        {/* Local badge */}
        {(MODEL_OPTIONS.find((m) => m.value === d.model)?.provider === 'local') && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">LOCAL GPU — Free, no API cost</span>
          </div>
        )}

        {/* Run */}
        <button
          onClick={handleRun}
          disabled={d.isRunning || isModelLocked || isResolutionLocked || !hasPaidStudioAccess}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isModelLocked || isResolutionLocked || !hasPaidStudioAccess
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/20'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          {d.isRunning ? (
            <>
              <i className="fa-solid fa-spinner fa-spin text-xs"></i>
              Generating ({(d.progress ?? 0).toFixed(1)}%)
            </>
          ) : (isModelLocked || isResolutionLocked || !hasPaidStudioAccess) ? (
            <>
              <i className="fa-solid fa-lock text-xs"></i>
              Upgrade Plan
            </>
          ) : (
            <>
              <i className="fa-solid fa-play text-xs"></i>
              Generate Video
            </>
          )}
        </button>

        {/* Progress bar */}
        {d.isRunning && (
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${d.progress}%` }}
            />
          </div>
        )}

        {d.error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{d.error}</div>
        )}

        {/* Video output */}
        {d.outputUrl && (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden border border-white/10">
              <video src={d.outputUrl} controls autoPlay loop muted className="w-full" />
            </div>
            <div className="flex gap-1.5">
              <a
                href={d.outputUrl}
                download={`draftly-video-${Date.now()}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 bg-rose-600/20 text-rose-300 hover:bg-rose-600/40 border border-rose-500/20"
              >
                <i className="fa-solid fa-download text-[10px]"></i>
                Download Video
              </a>
              <button
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center bg-white/5 text-white/50 hover:bg-white/10 border border-white/5"
                title="Open in new tab"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(d.outputUrl!, '_blank');
                }}
              >
                <i className="fa-solid fa-expand text-[10px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(VideoGenNode);
