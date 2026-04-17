/**
 * fal.ai models for 3D Website Builder (Kling Image V3, LTX, Veo FL, etc.).
 * Keys: FAL_SELL_API_KEY (optional dedicated), then FAL_KEY / fal_key — see https://fal.ai/docs
 */

import { fal } from '@fal-ai/client';
import { getFalApiKey } from '@/lib/fal';

let configured = false;

function ensureFal(): void {
  if (configured) return;
  fal.config({ credentials: getFalApiKey() });
  configured = true;
}

/** Kling V3 text-to-image (3D Builder hero + Studio). */
export const KLING_IMAGE_V3_T2I = 'fal-ai/kling-image/v3/text-to-image';

/** ByteDance Seedream 4.5 text-to-image (fal). ~$0.04/image; min edge 1920px per API. */
export const SEEDREAM_V45_T2I = 'fal-ai/bytedance/seedream/v4.5/text-to-image';

export type KlingV3Resolution = '1K' | '2K';

export type KlingV3AspectRatio =
  | '16:9'
  | '9:16'
  | '1:1'
  | '4:3'
  | '3:4'
  | '3:2'
  | '2:3'
  | '21:9';

/** Map builder / studio tier to Kling API (no native 4K — use 2K). */
export function mapBuilderImageTierToKlingResolution(tier: '1K' | '2K' | '4K'): KlingV3Resolution {
  return tier === '1K' ? '1K' : '2K';
}

export async function falKlingImageV3Generate(options: {
  prompt: string;
  aspectRatio: KlingV3AspectRatio;
  resolution: KlingV3Resolution;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}): Promise<{ imageUrl: string }> {
  ensureFal();
  const prompt = options.prompt.slice(0, 2500);
  console.log('[fal] Kling Image V3', { resolution: options.resolution, aspect: options.aspectRatio });
  const result = await fal.subscribe(KLING_IMAGE_V3_T2I, {
    input: {
      prompt,
      resolution: options.resolution,
      num_images: 1,
      aspect_ratio: options.aspectRatio,
      output_format: options.outputFormat ?? 'png',
    } as Record<string, unknown>,
    logs: false,
  });

  const data = result.data as { images?: Array<{ url?: string }> };
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('Kling Image V3 did not return an image URL');
  return { imageUrl: url };
}

/**
 * Seedream requires width/height each in [1920, 4096] (or `auto_2K`). Some aspect ratios
 * cannot be exact at the minimum size; we pick valid pairs close to the target ratio.
 */
function seedreamPixelSize(
  aspectRatio: KlingV3AspectRatio,
  tier: '1K' | '2K' | '4K',
): { width: number; height: number } {
  const hi = tier === '4K';
  switch (aspectRatio) {
    case '16:9':
      return hi ? { width: 3840, height: 2160 } : { width: 2560, height: 1440 };
    case '9:16':
      return hi ? { width: 2160, height: 3840 } : { width: 1440, height: 2560 };
    case '1:1':
      return hi ? { width: 4096, height: 4096 } : { width: 2048, height: 2048 };
    case '4:3':
      return hi ? { width: 3840, height: 2880 } : { width: 2560, height: 1920 };
    case '3:4':
      return hi ? { width: 2880, height: 3840 } : { width: 1920, height: 2560 };
    case '3:2':
      return hi ? { width: 4096, height: 2730 } : { width: 3000, height: 2000 };
    case '2:3':
      return hi ? { width: 2730, height: 4096 } : { width: 2000, height: 3000 };
    case '21:9':
      // True 21:9 at min 1920px short side is impossible within 4096; use wide 4096×1920.
      return hi ? { width: 4096, height: 1920 } : { width: 3440, height: 1920 };
    default:
      return { width: 2048, height: 2048 };
  }
}

export async function falSeedream45TextToImage(options: {
  prompt: string;
  aspectRatio: KlingV3AspectRatio;
  resolutionTier: '1K' | '2K' | '4K';
}): Promise<{ imageUrl: string; seed?: number }> {
  ensureFal();
  const prompt = options.prompt.slice(0, 8000);
  const image_size =
    options.resolutionTier === '2K'
      ? 'auto_2K'
      : seedreamPixelSize(options.aspectRatio, options.resolutionTier);

  console.log('[fal] Seedream 4.5 T2I', { aspect: options.aspectRatio, tier: options.resolutionTier });
  const result = await fal.subscribe(SEEDREAM_V45_T2I, {
    input: {
      prompt,
      image_size,
      num_images: 1,
      max_images: 1,
      enable_safety_checker: true,
    } as Record<string, unknown>,
    logs: false,
  });

  const data = result.data as { images?: Array<{ url?: string }>; seed?: number };
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('Seedream 4.5 did not return an image URL');
  return { imageUrl: url, seed: data.seed };
}

/** LTX 2.3 Fast — used by 3D Builder video (queue + subscribe). */
export const LTX_I2V_FAST = 'fal-ai/ltx-2.3/image-to-video/fast';

/** LTX 2.3 Pro extend-video — continues clip at end (or start); ~$0.10/s on fal. */
export const LTX_EXTEND_VIDEO = 'fal-ai/ltx-2.3/extend-video';

/** Upload a data URL to fal storage; returns an HTTPS URL for model inputs. */
export async function falUploadDataUrlToStorage(dataUrl: string): Promise<string> {
  ensureFal();
  const trimmed = dataUrl.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  const comma = trimmed.indexOf(',');
  if (!trimmed.startsWith('data:') || comma === -1) {
    throw new Error('Expected a data: URL or https URL for fal storage upload');
  }
  const header = trimmed.slice(5, comma);
  const b64part = trimmed.slice(comma + 1);
  const semi = header.indexOf(';');
  const mime =
    semi === -1 ? 'application/octet-stream' : header.slice(0, semi);
  const buf = Buffer.from(b64part, 'base64');
  const blob = new Blob([buf], { type: mime });
  return fal.storage.upload(blob, { lifecycle: { expiresIn: '1d' } });
}

export async function falLtx23ExtendVideo(options: {
  videoUrlOrDataUrl: string;
  prompt?: string;
  durationSec?: number;
  mode?: 'start' | 'end';
  contextSec?: number;
}): Promise<{ videoUrl: string }> {
  ensureFal();
  const publicUrl = options.videoUrlOrDataUrl.trim().startsWith('data:')
    ? await falUploadDataUrlToStorage(options.videoUrlOrDataUrl)
    : options.videoUrlOrDataUrl.trim();
  const duration = Math.min(20, Math.max(1, Number(options.durationSec) || 5));
  const input: Record<string, unknown> = {
    video_url: publicUrl,
    prompt: (options.prompt && options.prompt.trim()) || 'Continue the motion smoothly',
    duration,
    mode: options.mode ?? 'end',
  };
  if (options.contextSec != null) {
    input.context = Math.min(20, Math.max(1, options.contextSec));
  }
  console.log('[fal] LTX 2.3 extend-video', { duration, mode: input.mode });
  const result = await fal.subscribe(LTX_EXTEND_VIDEO, { input, logs: false });
  const data = result.data as { video?: { url?: string } };
  const url = data?.video?.url;
  if (!url) throw new Error('LTX extend-video did not return a video URL');
  return { videoUrl: url };
}

/** Google Veo 3.1 Fast — first & last frame to video (fal). */
export const VEO31_FAST_FIRST_LAST = 'fal-ai/veo3.1/fast/first-last-frame-to-video';

/** LTX Video 0.9.7 13B Distilled — text-to-video only (no image conditioning on API). */
export const LTX_VIDEO_13B_DISTILLED = 'fal-ai/ltx-video-13b-distilled';

export type Ltx13bResolution = '480p' | '720p';

export type LtxVideoResolution = '1080p' | '1440p' | '2160p';

export function mapBuilderVideoQualityToLtx(
  quality: '720p' | '1080p' | '2k' | '4k',
): LtxVideoResolution {
  if (quality === '4k') return '2160p';
  if (quality === '2k') return '1440p';
  return '1080p';
}

/** Studio / API: 1K ≈ 1080p, 2K ≈ 1440p, 4K ≈ 2160p (per fal LTX-2.3 Fast API). */
export function mapStudioVideoResolutionToLtx(
  resolution: string | undefined,
): LtxVideoResolution {
  const u = String(resolution || '1K').toUpperCase();
  if (u === '4K') return '2160p';
  if (u === '2K') return '1440p';
  return '1080p';
}

function buildLtxInput(options: {
  prompt: string;
  imageUrl: string;
  endImageUrl?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: LtxVideoResolution;
  durationSec?: number;
}): Record<string, unknown> {
  const duration = options.durationSec ?? 8;
  const clamped = Math.min(20, Math.max(6, duration));
  const input: Record<string, unknown> = {
    image_url: options.imageUrl,
    prompt: options.prompt,
    duration: clamped,
    resolution: options.resolution,
    aspect_ratio: options.aspectRatio === '1:1' ? 'auto' : options.aspectRatio === '9:16' ? '9:16' : '16:9',
    fps: 25,
    generate_audio: true,
  };
  if (options.endImageUrl) {
    input.end_image_url = options.endImageUrl;
  }
  return input;
}

/** Submit LTX job to fal queue only (fast). Use {@link pollLtxFalJob} from short serverless invocations. */
export async function submitLtx23FastImageToVideo(options: {
  prompt: string;
  imageUrl: string;
  endImageUrl?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: LtxVideoResolution;
  durationSec?: number;
}): Promise<{ requestId: string }> {
  ensureFal();
  const input = buildLtxInput(options);
  console.log('[fal] LTX 2.3 Fast i2v (queue submit)', {
    resolution: options.resolution,
    duration: input.duration,
    hasEnd: Boolean(options.endImageUrl),
  });
  const submitted = await fal.queue.submit(LTX_I2V_FAST, { input });
  const requestId = (submitted as { request_id?: string }).request_id;
  if (!requestId) throw new Error('fal queue did not return request_id');
  return { requestId };
}

export type LtxPollResult =
  | { state: 'pending' }
  | { state: 'completed'; videoUrl: string }
  | { state: 'failed'; message: string };

export async function submitVeo31FastFirstLastFrameToVideo(options: {
  prompt: string;
  firstFrameUrl: string;
  lastFrameUrl: string;
  aspectRatio: '16:9' | '9:16';
  resolutionTier: '2K' | '4K';
  durationSec: number;
  generateAudio?: boolean;
}): Promise<{ requestId: string }> {
  ensureFal();
  const d = Math.min(8, Math.max(4, Math.round(Number(options.durationSec) || 8)));
  const duration: '4s' | '6s' | '8s' = d <= 5 ? '4s' : d <= 7 ? '6s' : '8s';
  const resolution: '720p' | '1080p' | '4k' = options.resolutionTier === '4K' ? '4k' : '1080p';
  const input = {
    prompt: options.prompt,
    first_frame_url: options.firstFrameUrl,
    last_frame_url: options.lastFrameUrl,
    aspect_ratio: options.aspectRatio === '9:16' ? '9:16' : '16:9',
    duration,
    resolution,
    generate_audio: options.generateAudio ?? true,
    safety_tolerance: '4' as const,
  };
  console.log('[fal] Veo 3.1 Fast FL (queue submit)', { resolution, duration, aspect: input.aspect_ratio });
  const submitted = await fal.queue.submit(VEO31_FAST_FIRST_LAST, { input: input as any });
  const requestId = (submitted as { request_id?: string }).request_id;
  if (!requestId) throw new Error('fal queue did not return request_id');
  return { requestId };
}

export type Veo31FlfPollResult =
  | { state: 'pending' }
  | { state: 'completed'; videoUrl: string }
  | { state: 'failed'; message: string };

export async function pollVeo31FastFirstLastJob(requestId: string): Promise<Veo31FlfPollResult> {
  ensureFal();
  const status = await fal.queue.status(VEO31_FAST_FIRST_LAST, { requestId });
  if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
    return { state: 'pending' };
  }
  if (status.status !== 'COMPLETED') {
    return { state: 'failed', message: 'Unexpected fal queue status' };
  }
  try {
    const result = await fal.queue.result(VEO31_FAST_FIRST_LAST, { requestId });
    const data = result.data as { video?: { url?: string } };
    const url = data?.video?.url;
    if (!url) return { state: 'failed', message: 'Veo 3.1 did not return a video URL' };
    return { state: 'completed', videoUrl: url };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { state: 'failed', message: msg || 'Veo result fetch failed' };
  }
}

/** 3D Builder / synchronous jobs: wait for fal Veo 3.1 first-last-frame result. */
export async function falVeo31FastFirstLastFrameToVideoSubscribe(options: {
  prompt: string;
  firstFrameUrl: string;
  lastFrameUrl: string;
  aspectRatio: 'auto' | '16:9' | '9:16';
  duration: '4s' | '6s' | '8s';
  resolution: '720p' | '1080p' | '4k';
  generateAudio?: boolean;
}): Promise<{ videoUrl: string }> {
  ensureFal();
  console.log('[fal] Veo 3.1 Fast first-last (subscribe)', {
    resolution: options.resolution,
    duration: options.duration,
    aspect: options.aspectRatio,
  });
  const veoFlInput = {
    prompt: options.prompt,
    first_frame_url: options.firstFrameUrl,
    last_frame_url: options.lastFrameUrl,
    aspect_ratio: options.aspectRatio,
    duration: options.duration,
    resolution: options.resolution,
    generate_audio: options.generateAudio ?? true,
    safety_tolerance: '4',
  };
  const result = await fal.subscribe(VEO31_FAST_FIRST_LAST, { input: veoFlInput as any, logs: false });
  const data = result.data as { video?: { url?: string } };
  const url = data?.video?.url;
  if (!url) throw new Error('Veo 3.1 Fast (first-last) did not return a video URL');
  return { videoUrl: url };
}

export async function pollLtxFalJob(requestId: string): Promise<LtxPollResult> {
  ensureFal();
  const status = await fal.queue.status(LTX_I2V_FAST, { requestId });
  if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
    return { state: 'pending' };
  }
  if (status.status !== 'COMPLETED') {
    return { state: 'failed', message: 'Unexpected fal queue status' };
  }
  try {
    const result = await fal.queue.result(LTX_I2V_FAST, { requestId });
    const data = result.data as { video?: { url?: string } };
    const url = data?.video?.url;
    if (!url) return { state: 'failed', message: 'LTX 2.3 did not return a video URL' };
    return { state: 'completed', videoUrl: url };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { state: 'failed', message: msg || 'LTX result fetch failed' };
  }
}

export async function falLtx23FastImageToVideo(options: {
  prompt: string;
  imageUrl: string;
  endImageUrl?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: LtxVideoResolution;
  durationSec?: number;
}): Promise<{ videoUrl: string }> {
  ensureFal();
  const input = buildLtxInput(options);

  console.log('[fal] LTX 2.3 Fast i2v', { resolution: options.resolution, duration: input.duration, hasEnd: Boolean(options.endImageUrl) });
  const result = await fal.subscribe(LTX_I2V_FAST, {
    input,
    logs: false,
  });

  const data = result.data as { video?: { url?: string } };
  const url = data?.video?.url;
  if (!url) throw new Error('LTX 2.3 did not return a video URL');
  return { videoUrl: url };
}

/**
 * Text-to-video for 3D Builder test lane (cheap fal tier).
 * `aspect_ratio`: 16:9, 9:16, or 1:1 per API.
 */
export async function falLtx13bDistilledTextToVideo(options: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution?: Ltx13bResolution;
  numFrames?: number;
  frameRate?: number;
  enableDetailPass?: boolean;
}): Promise<{ videoUrl: string; seed?: number }> {
  ensureFal();
  const resolution = options.resolution ?? '720p';
  const num_frames = Math.min(1441, Math.max(9, Math.round(options.numFrames ?? 121)));
  const frame_rate = Math.min(60, Math.max(1, Math.round(options.frameRate ?? 24)));

  console.log('[fal] LTX 13B distilled T2V', {
    aspect: options.aspectRatio,
    resolution,
    num_frames,
    frame_rate,
  });

  const ltxInput = {
    prompt: options.prompt,
    negative_prompt:
      options.negativePrompt ??
      'worst quality, inconsistent motion, blurry, jittery, distorted',
    resolution,
    aspect_ratio: options.aspectRatio,
    num_frames,
    frame_rate,
    expand_prompt: false,
    enable_safety_checker: true,
    ...(options.enableDetailPass ? { enable_detail_pass: true as const } : {}),
  };
  const result = await fal.subscribe(LTX_VIDEO_13B_DISTILLED, {
    input: ltxInput as Parameters<typeof fal.subscribe<typeof LTX_VIDEO_13B_DISTILLED>>[1]['input'],
    logs: false,
  });

  const data = result.data as { video?: { url?: string }; seed?: number };
  const url = data?.video?.url;
  if (!url) throw new Error('LTX Video 13B Distilled did not return a video URL');
  return { videoUrl: url, seed: data.seed };
}

export async function fetchMediaAsBase64(
  url: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, mimeType };
}
