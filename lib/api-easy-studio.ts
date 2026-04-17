/**
 * API-Easy client for Studio image/video generation.
 *
 * This module intentionally does NOT call Google's direct Gemini/Veo APIs.
 * All requests route through API-Easy (OpenAI-compatible endpoints).
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { Agent } from 'undici';

/**
 * Node's global `fetch` uses undici with a default **headersTimeout of 300s**.
 * API-Easy / Veo often holds the connection open longer before returning JSON (especially first→last),
 * which throws `UND_ERR_HEADERS_TIMEOUT` even when AbortController allows 7+ minutes.
 */
function apiEasyLongRequestAgent(timeoutMs: number): Agent {
  const ms = Math.max(120_000, timeoutMs);
  return new Agent({
    connectTimeout: 120_000,
    headersTimeout: ms,
    bodyTimeout: ms,
  });
}

/** Next/Webpack can still hit Node's embedded undici (10s connect cap) if we use `fetch`. Native https avoids that. */
const VIDEO_DOWNLOAD_MAX_REDIRECTS = 10;
const VIDEO_DOWNLOAD_CONNECT_MS = 120_000;
const VIDEO_DOWNLOAD_BODY_MS = 600_000;

function downloadVideoWithNodeHttps(
  videoUri: string,
  headers: Record<string, string>,
): Promise<{ buffer: Buffer; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const run = (urlStr: string, redirectDepth: number) => {
      if (redirectDepth > VIDEO_DOWNLOAD_MAX_REDIRECTS) {
        reject(new Error('Too many redirects while downloading video'));
        return;
      }

      let u: URL;
      try {
        u = new URL(urlStr);
      } catch (e) {
        reject(e);
        return;
      }

      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        reject(new Error(`Unsupported URL protocol: ${u.protocol}`));
        return;
      }

      const isHttps = u.protocol === 'https:';
      const lib = isHttps ? https : http;
      let connectTimer: ReturnType<typeof setTimeout> | undefined;
      let bodyTimer: ReturnType<typeof setTimeout> | undefined;

      const req = lib.request(
        {
          hostname: u.hostname,
          port: u.port || (isHttps ? 443 : 80),
          path: `${u.pathname}${u.search}`,
          method: 'GET',
          headers: {
            ...headers,
            'User-Agent': 'Draftly/1.0 (server; video download)',
            Accept: 'video/*,*/*',
          },
        },
        (res) => {
          if (connectTimer) {
            clearTimeout(connectTimer);
            connectTimer = undefined;
          }

          const code = res.statusCode || 0;
          const loc = res.headers.location;
          if (code >= 300 && code < 400 && loc) {
            res.resume();
            run(new URL(loc, urlStr).href, redirectDepth + 1);
            return;
          }

          if (code !== 200) {
            res.resume();
            reject(new Error(`Failed to download video: ${code}`));
            return;
          }

          const chunks: Buffer[] = [];
          const rawCt = res.headers['content-type'];
          const mimeType = String(rawCt || 'video/mp4').split(';')[0].trim();

          bodyTimer = setTimeout(() => {
            res.destroy();
            reject(new Error('Video download body timed out'));
          }, VIDEO_DOWNLOAD_BODY_MS);

          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            if (bodyTimer) clearTimeout(bodyTimer);
            resolve({ buffer: Buffer.concat(chunks), mimeType });
          });
          res.on('error', (err) => {
            if (bodyTimer) clearTimeout(bodyTimer);
            reject(err);
          });
        },
      );

      connectTimer = setTimeout(() => {
        req.destroy(new Error(`Video CDN connect timed out after ${VIDEO_DOWNLOAD_CONNECT_MS}ms`));
      }, VIDEO_DOWNLOAD_CONNECT_MS);

      req.on('error', (err) => {
        if (connectTimer) clearTimeout(connectTimer);
        reject(err);
      });

      req.end();
    };

    run(videoUri, 0);
  });
}

function getApiEasyApiKey(): string {
  const key = process.env.API_EASY_API_KEY || process.env.APIYI_API_KEY;
  if (!key) {
    throw new Error('API_EASY_API_KEY is not set');
  }
  return key;
}

function getApiEasyBaseUrl(): string {
  return process.env.API_EASY_BASE_URL || process.env.APIYI_BASE_URL || 'https://api.apiyi.com/v1';
}

function getApiEasyImageModel(): string {
  return process.env.API_EASY_IMAGE_MODEL || process.env.APIYI_IMAGE_MODEL || 'nano-banana-pro';
}

function getApiEasyVideoModel(): string {
  return process.env.API_EASY_VIDEO_MODEL || process.env.APIYI_VIDEO_MODEL || 'veo-3.1-fast';
}

/** Single-image video: 9:16 → `veo-3.1-fast`, 16:9 → `veo-3.1-landscape-fast` (API-Easy fast tier). */
export function resolveApiEasyVideoModel(
  aspectRatio: '16:9' | '9:16',
  fallbackModel?: string,
  portraitFallbackModel?: string,
  landscapeFallbackModel?: string,
): string {
  const genericModel = (fallbackModel || getApiEasyVideoModel() || 'veo-3.1-fast').trim();
  const portraitDefault = (portraitFallbackModel || genericModel).trim();
  const landscapeDefault = (landscapeFallbackModel || genericModel).trim();
  const portraitModel = (process.env.API_EASY_VIDEO_MODEL_PORTRAIT || '').trim() || portraitDefault;
  const landscapeModel = (process.env.API_EASY_VIDEO_MODEL_LANDSCAPE || '').trim() || landscapeDefault;
  return aspectRatio === '9:16' ? portraitModel : landscapeModel;
}

/** First+last frame: 9:16 → `veo-3.1-fast-fl`, 16:9 → `veo-3.1-landscape-fast-fl` when `fast` (default). */
export function resolveApiEasyVideoModelFL(
  aspectRatio: '16:9' | '9:16',
  fast = true,
): string {
  if (aspectRatio === '9:16') {
    return fast ? 'veo-3.1-fast-fl' : 'veo-3.1-fl';
  }
  return fast ? 'veo-3.1-landscape-fast-fl' : 'veo-3.1-landscape-fl';
}

export interface ApiEasyImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  inputImageUrl?: string;
  inputImageUrls?: string[];
}

export interface ApiEasyImageResult {
  images: string[];
  text?: string;
}

export async function generateApiEasyImage(options: ApiEasyImageOptions): Promise<ApiEasyImageResult> {
  const { prompt, aspectRatio, imageSize, inputImageUrl, inputImageUrls } = options;

  const apiKey = getApiEasyApiKey();
  const baseUrl = getApiEasyBaseUrl();
  const model = options.model || getApiEasyImageModel();

  let fullPrompt = prompt;
  if (aspectRatio) fullPrompt += `\n\nAspect ratio: ${aspectRatio}`;
  if (imageSize) fullPrompt += `\nImage size preference: ${imageSize}`;

  const contentParts: Array<Record<string, unknown>> = [{ type: 'text', text: fullPrompt }];

  const allImageUrls: string[] = [];
  if (inputImageUrls && inputImageUrls.length > 0) allImageUrls.push(...inputImageUrls);
  else if (inputImageUrl) allImageUrls.push(inputImageUrl);

  for (const imageUrl of allImageUrls) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  const body = {
    model,
    messages: [{ role: 'user', content: contentParts }],
    temperature: 0.8,
    max_tokens: 4096,
  };

  const doFetch = async (attempt = 1): Promise<Response> => {
    try {
      return await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (e: any) {
      const cause = e?.cause || e;
      const code = String(cause?.code ?? cause?.errno ?? '');
      const msg = String(cause?.message ?? e?.message ?? '');
      const isTransient = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'fetch failed'].some(
        (c) => code.includes(c) || msg.toLowerCase().includes(c.toLowerCase())
      );
      if (isTransient && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        return doFetch(attempt + 1);
      }
      throw e;
    }
  };

  const res = await doFetch();

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `API-Easy image error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return parseApiEasyImageResponse(data as Record<string, unknown>);
}

function parseApiEasyImageResponse(data: Record<string, unknown>): ApiEasyImageResult {
  const result: ApiEasyImageResult = { images: [] };
  const choices = (data as any)?.choices;
  if (!choices?.length) return result;

  const message = choices[0]?.message;
  if (!message) return result;

  const content = message.content;

  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'text' && part.text) {
        result.text = part.text;
        extractBase64Images(part.text, result.images);
      } else if (part.type === 'image_url' && part.image_url?.url) {
        result.images.push(part.image_url.url);
      } else if (part.type === 'image' && part.image_url?.url) {
        result.images.push(part.image_url.url);
      }
    }
    return result;
  }

  if (typeof content === 'string') {
    result.text = content;
    extractBase64Images(content, result.images);

    const mdImageRegex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
    let match;
    while ((match = mdImageRegex.exec(content)) !== null) {
      if (!result.images.includes(match[1])) result.images.push(match[1]);
    }

    const urlRegex = /(https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp|gif))/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      if (!result.images.includes(match[1])) result.images.push(match[1]);
    }
  }

  return result;
}

function extractBase64Images(text: string, images: string[]): void {
  const b64Regex = /(data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+)/g;
  let match;
  while ((match = b64Regex.exec(text)) !== null) {
    if (!images.includes(match[1])) images.push(match[1]);
  }
}

export interface ApiEasyVideoOptions {
  prompt: string;
  model?: string;
  aspectRatio?: '16:9' | '9:16';
  /**
   * Optional output resolution hint for providers that support it.
   * Examples: '720p', '1080p', '2k', '4k'
   */
  resolution?: '720p' | '1080p' | '2k' | '4k';
  durationSeconds?: number;
  imageUrl?: string | null;
  firstFrameUrl?: string | null;
  lastFrameUrl?: string | null;
}

export interface ApiEasyOperationResult {
  operationName: string;
}

export interface ApiEasyPollResult {
  done: boolean;
  videoUri?: string;
  error?: string;
}

export async function startApiEasyVideoGeneration(
  options: ApiEasyVideoOptions,
): Promise<ApiEasyOperationResult> {
  const {
    prompt,
    aspectRatio = '16:9',
    resolution,
    durationSeconds = 8,
    imageUrl,
    firstFrameUrl,
    lastFrameUrl,
  } = options;

  const apiKey = getApiEasyApiKey();
  const baseUrl = getApiEasyBaseUrl();
  const model = options.model || getApiEasyVideoModel();

  const isFL = Boolean(firstFrameUrl || lastFrameUrl);
  const textPrefix = isFL
    ? `Generate a ${durationSeconds}-second video in ${aspectRatio} aspect ratio using the provided first/last frame images as start and end keyframes.\n\n`
    : `Generate a ${durationSeconds}-second video in ${aspectRatio} aspect ratio.\n\n`;

  const contentParts: Array<Record<string, unknown>> = [
    { type: 'text', text: textPrefix + prompt },
  ];

  if (isFL) {
    if (firstFrameUrl) {
      contentParts.push({ type: 'image_url', image_url: { url: firstFrameUrl } });
    }
    if (lastFrameUrl) {
      contentParts.push({ type: 'image_url', image_url: { url: lastFrameUrl } });
    }
  } else if (imageUrl) {
    contentParts.push({ type: 'image_url', image_url: { url: imageUrl } });
  }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: contentParts }],
    temperature: 0.7,
    max_tokens: 4096,
    aspect_ratio: aspectRatio,
    duration: durationSeconds,
  };

  if (resolution) {
    // API-Easy uses an OpenAI-compatible payload; providers that support
    // multi-resolution Veo models can use this hint.
    body.resolution = resolution;
  }

  if (isFL) {
    if (firstFrameUrl) {
      body.first_frame_url = firstFrameUrl;
      body.first_frame_image_url = firstFrameUrl;
      body.image_url = firstFrameUrl;
    }
    if (lastFrameUrl) {
      body.last_frame_url = lastFrameUrl;
      body.last_frame_image_url = lastFrameUrl;
      body.image_end_url = lastFrameUrl;
    }
  } else if (imageUrl) {
    body.image_url = imageUrl;
  }

  // Veo / video providers often keep the HTTP request open well past 5 min while the job is created.
  const videoStartTimeoutMs = Math.max(
    60_000,
    Number(process.env.API_EASY_VIDEO_START_TIMEOUT_MS) || 600_000,
  );
  const longFetchDispatcher = apiEasyLongRequestAgent(videoStartTimeoutMs);

  const fetchWithRetry = async (attempt = 1): Promise<Response> => {
    const maxRetries = 3;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), videoStartTimeoutMs);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
        dispatcher: longFetchDispatcher,
      } as RequestInit & { dispatcher: Agent });
      return res;
    } catch (e: unknown) {
      const err = e as { name?: string; cause?: { message?: string }; message?: string };
      const cause = err?.cause || err;
      const code = (cause as { code?: string })?.code ?? (cause as { errno?: string })?.errno ?? '';
      const msg = String((cause as { message?: string })?.message ?? err?.message ?? '');
      const isAbort =
        err?.name === 'AbortError' ||
        /aborted|abort/i.test(msg) ||
        (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError');
      // Do not retry our own deadline abort — that tripled wait time and still failed (3× ~3min).
      if (isAbort) {
        throw new Error(
          `Video start request timed out after ${Math.round(videoStartTimeoutMs / 1000)}s waiting for API-Easy. ` +
            `The provider may be slow or overloaded. Set API_EASY_VIDEO_START_TIMEOUT_MS (ms) to wait longer, or try again.`,
        );
      }
      const isTransient = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'fetch failed'].some(
        (c) => String(code).includes(c) || msg.toLowerCase().includes(c.toLowerCase()),
      );
      if (isTransient && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        return fetchWithRetry(attempt + 1);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  };

  const res = await fetchWithRetry();

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `API-Easy video error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const message = (data as any)?.choices?.[0]?.message;
  const content = message?.content;

  const videoUrl = extractVideoUrl(content) || extractVideoUrl(data as any);

  if (videoUrl) return { operationName: `api_easy_complete:${videoUrl}` };

  const jobId = (data as any)?.id || (data as any)?.job_id || (data as any)?.operation;
  if (jobId) return { operationName: `api_easy_job:${jobId}` };

  throw new Error('API-Easy did not return a video URL or job ID');
}

function extractVideoUrl(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const videoLike =
      value.match(/(https?:\/\/[^\s"')]+(?:\.mp4|\.webm|\.mov)(?:\?[^\s"')]*)?)/i)?.[1] ||
      value.match(/(https?:\/\/[^\s"')]+(?:video|download|file)[^\s"')]*)/i)?.[1] ||
      null;
    if (videoLike) return videoLike;

    const anyUrl = value.match(/(https?:\/\/[^\s"')]+)/i)?.[1] || null;
    return anyUrl;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const fromItem = extractVideoUrl(item);
      if (fromItem) return fromItem;
    }
    return null;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const directKeys = [
      'video_url',
      'videoUrl',
      'video_uri',
      'videoUri',
      'uri',
      'output_url',
      'outputUrl',
      'result_url',
      'resultUrl',
      'url',
      'file_url',
      'fileUrl',
      'media_url',
      'mediaUrl',
      'download_url',
      'downloadUrl',
    ];
    for (const key of directKeys) {
      const candidate = obj[key];
      if (typeof candidate === 'string' && candidate.startsWith('http')) return candidate;
    }

    const nestedBlock =
      (obj.video_url as any)?.url ||
      (obj.video as any)?.url ||
      (obj.file as any)?.url ||
      (obj.asset as any)?.url ||
      (obj.output as any)?.url ||
      null;
    if (typeof nestedBlock === 'string' && nestedBlock.startsWith('http')) return nestedBlock;

    const containerKeys = ['content', 'data', 'result', 'output', 'outputs', 'choices', 'message', 'files', 'assets', 'items'];
    for (const key of containerKeys) {
      const nested = obj[key];
      const fromNested = extractVideoUrl(nested);
      if (fromNested) return fromNested;
    }

    const asJson = JSON.stringify(obj);
    const jsonUrl =
      asJson.match(/https?:\/\/[^"'\\\s]+(?:\.mp4|\.webm|\.mov)(?:\?[^"'\\\s]*)?/i)?.[0] ||
      asJson.match(/https?:\/\/[^"'\\\s]+(?:video|download|file)[^"'\\\s]*/i)?.[0] ||
      null;
    if (jsonUrl) return jsonUrl;
  }

  return null;
}

export async function pollApiEasyOperation(operationName: string): Promise<ApiEasyPollResult> {
  if (operationName.startsWith('api_easy_complete:') || operationName.startsWith('apiyi_complete:')) {
    const videoUri = operationName.includes('api_easy_complete:')
      ? operationName.slice('api_easy_complete:'.length)
      : operationName.slice('apiyi_complete:'.length);
    return { done: true, videoUri };
  }

  if (operationName.startsWith('api_easy_job:') || operationName.startsWith('apiyi_job:')) {
    const jobId = operationName.includes('api_easy_job:')
      ? operationName.slice('api_easy_job:'.length)
      : operationName.slice('apiyi_job:'.length);
    return pollApiEasyJob(jobId);
  }

  // Fallback: treat unknown value as a job ID.
  return pollApiEasyJob(operationName);
}

async function pollApiEasyJob(jobId: string): Promise<ApiEasyPollResult> {
  const apiKey = getApiEasyApiKey();
  const baseUrl = getApiEasyBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return { done: false, error: `API-Easy poll failed: ${res.status}` };

    const data = await res.json();
    const status = String((data as any)?.status || '').toLowerCase();
    const videoUri = extractVideoUrl(data as any);
    const isCompleted = ['completed', 'succeeded', 'success', 'done', 'finished'].includes(status);

    if (isCompleted && videoUri) {
      return { done: true, videoUri };
    }

    if (isCompleted && !videoUri) {
      return { done: true, error: 'Video completed but no playable URL was returned by API-Easy.' };
    }

    if (status === 'failed' || status === 'error') {
      return { done: true, error: data.error || 'Video generation failed' };
    }

    return { done: false };
  } catch {
    return { done: false, error: 'API-Easy poll network error' };
  }
}

export async function downloadApiEasyVideo(
  videoUri: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const headers: Record<string, string> = {};
  try {
    const host = new URL(videoUri).hostname.toLowerCase();
    if (host.includes('apiyi.com') || host.includes('api-easy')) {
      headers.Authorization = `Bearer ${getApiEasyApiKey()}`;
    }
  } catch {
    // Ignore URL parse/auth derivation issues and try unauthenticated fetch.
  }

  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await downloadVideoWithNodeHttps(videoUri, headers);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < maxAttempts) {
        console.warn(
          `downloadApiEasyVideo attempt ${attempt}/${maxAttempts} failed (${msg}), retrying…`,
        );
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  const cause = lastErr instanceof Error && lastErr.cause ? ` (${String(lastErr.cause)})` : '';
  throw new Error(
    `Video URL download failed after ${maxAttempts} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}${cause}. Check network/firewall access to the CDN host.`,
  );
}

export interface ApiEasyTextOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateApiEasyText(options: ApiEasyTextOptions): Promise<string> {
  const apiKey = getApiEasyApiKey();
  const baseUrl = getApiEasyBaseUrl();
  const model = options.model || getApiEasyImageModel();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: options.prompt }] }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 65536,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `API-Easy text error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const content = (data as any)?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textPart = content.find((p: any) => p?.type === 'text' && typeof p?.text === 'string');
    if (textPart?.text) return textPart.text;
  }
  throw new Error('API-Easy did not return text content');
}

export async function generateApiEasyReferenceBrief(imageUrls: string[]): Promise<string> {
  const urls = (imageUrls || []).filter(Boolean).slice(0, 4);
  if (!urls.length) return '';

  const apiKey = getApiEasyApiKey();
  const baseUrl = getApiEasyBaseUrl();
  const model = 'gemini-1.5-flash';

  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text:
        'Analyze these reference images and return a concise product/style brief in 6-10 bullets: product category, shape/silhouette, materials, dominant colors, texture/finish, branding/logo placement, camera style, lighting style, and must-preserve details.',
    },
    ...urls.map((url) => ({
      type: 'image_url',
      image_url: { url },
    })),
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.3,
      max_tokens: 1200,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `API-Easy reference brief error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const result = (data as any)?.choices?.[0]?.message?.content;
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) {
    const textPart = result.find((p: any) => p?.type === 'text' && typeof p?.text === 'string');
    if (textPart?.text) return textPart.text;
  }
  return '';
}
