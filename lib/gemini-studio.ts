/**
 * Gemini API client for Studio — Image generation + Video generation
 *
 * Supports two providers:
 *   1. "direct"  — Google's native Gemini API (default)
 *   2. "apiyi"   — APIYI proxy (OpenAI-compatible format)
 *
 * Set GEMINI_PROVIDER=apiyi in env to switch. Old direct Gemini code is preserved.
 *
 * Image models:
 *   - direct: gemini-3-pro-image-preview (Nano Banana Pro)
 *   - apiyi:  nano-banana-pro (or APIYI_IMAGE_MODEL env override)
 *
 * Video models:
 *   - direct: veo-3.0-generate-001, veo-3.0-fast-generate-001
 *   - apiyi:  veo-3.1-fast (or APIYI_VIDEO_MODEL env override)
 */

// ── Provider config ──────────────────────────────────────────────────

type ProviderType = 'direct' | 'apiyi';

function getProvider(): ProviderType {
  return (process.env.GEMINI_PROVIDER || 'direct') as ProviderType;
}

function getDirectApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return key;
}

function getApiyiApiKey(): string {
  const key = process.env.APIYI_API_KEY;
  if (!key) throw new Error('APIYI_API_KEY is not set');
  return key;
}

function getApiyiBaseUrl(): string {
  return process.env.APIYI_BASE_URL || 'https://api.apiyi.com/v1';
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ── Image Generation ─────────────────────────────────────────────────

export interface GeminiImageOptions {
  prompt: string;
  model?: 'gemini-3-pro-image-preview';
  aspectRatio?: string;
  imageSize?: string;
  inputImageUrl?: string;
  inputImageUrls?: string[];
}

export interface GeminiImageResult {
  images: string[];
  text?: string;
}

export async function generateGeminiImage(options: GeminiImageOptions): Promise<GeminiImageResult> {
  const provider = getProvider();
  if (provider === 'apiyi') {
    return generateImageViaApiyi(options);
  }
  return generateImageDirect(options);
}

/** Direct Google Gemini API — original implementation */
async function generateImageDirect(options: GeminiImageOptions): Promise<GeminiImageResult> {
  const {
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio,
    imageSize,
    inputImageUrl,
    inputImageUrls,
  } = options;

  const apiKey = getDirectApiKey();
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  if (aspectRatio || imageSize) {
    const imageConfig: Record<string, string> = {};
    if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
    if (imageSize) imageConfig.imageSize = imageSize;
    generationConfig.imageConfig = imageConfig;
  }

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  const allImageUrls: string[] = [];
  if (inputImageUrls && inputImageUrls.length > 0) {
    allImageUrls.push(...inputImageUrls);
  } else if (inputImageUrl) {
    allImageUrls.push(inputImageUrl);
  }

  for (const imgUrl of allImageUrls) {
    let imageBase64: string | null = null;
    let mimeType = 'image/png';

    if (imgUrl.startsWith('data:')) {
      const match = imgUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
      }
    } else {
      try {
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type');
          if (contentType) mimeType = contentType;
          const arrayBuffer = await imgRes.arrayBuffer();
          imageBase64 = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (e) {
        console.warn('[gemini-studio] Failed to fetch input image:', e);
      }
    }

    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageBase64,
        },
      });
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.error?.status || `Gemini API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const result: GeminiImageResult = { images: [] };

  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.text) {
      result.text = part.text;
    } else if (part.inlineData) {
      const respMime = part.inlineData.mimeType || 'image/png';
      const b64 = part.inlineData.data;
      result.images.push(`data:${respMime};base64,${b64}`);
    }
  }

  return result;
}

/**
 * Google Gemini image API only (no APIYI proxy). Use for Studio 2K/4K output where
 * imageConfig.imageSize must be honored by the native API.
 */
export async function generateGeminiImageGoogleDirect(
  options: GeminiImageOptions,
): Promise<GeminiImageResult> {
  return generateImageDirect(options);
}

/** APIYI proxy — OpenAI-compatible chat completions format */
async function generateImageViaApiyi(options: GeminiImageOptions): Promise<GeminiImageResult> {
  const {
    prompt,
    aspectRatio,
    inputImageUrl,
    inputImageUrls,
  } = options;

  const apiKey = getApiyiApiKey();
  const baseUrl = getApiyiBaseUrl();
  const model = process.env.APIYI_IMAGE_MODEL || 'nano-banana-pro';

  // Build multimodal content parts
  let fullPrompt = prompt;
  if (aspectRatio) {
    fullPrompt += `\n\nAspect ratio: ${aspectRatio}`;
  }

  const contentParts: Array<Record<string, unknown>> = [
    { type: 'text', text: fullPrompt },
  ];

  const allImageUrls: string[] = [];
  if (inputImageUrls && inputImageUrls.length > 0) {
    allImageUrls.push(...inputImageUrls);
  } else if (inputImageUrl) {
    allImageUrls.push(inputImageUrl);
  }

  for (const imgUrl of allImageUrls) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: imgUrl },
    });
  }

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `APIYI error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return parseApiyiImageResponse(data);
}

/**
 * Parse APIYI response for images. Handles multiple formats:
 * 1. Structured content array with image_url parts
 * 2. Base64 data URLs embedded in text content
 * 3. Inline base64 image blocks
 */
function parseApiyiImageResponse(data: Record<string, unknown>): GeminiImageResult {
  const result: GeminiImageResult = { images: [] };
  const choices = (data as any)?.choices;
  if (!choices?.length) return result;

  const message = choices[0]?.message;
  if (!message) return result;

  const content = message.content;

  // Case 1: content is an array of parts (multimodal response)
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

  // Case 2: content is a string
  if (typeof content === 'string') {
    result.text = content;
    extractBase64Images(content, result.images);

    // Check for markdown image syntax: ![...](data:image/...)
    const mdImageRegex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
    let match;
    while ((match = mdImageRegex.exec(content)) !== null) {
      if (!result.images.includes(match[1])) {
        result.images.push(match[1]);
      }
    }

    // Check for URL-based images
    const urlRegex = /(https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp|gif))/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      if (!result.images.includes(match[1])) {
        result.images.push(match[1]);
      }
    }
  }

  return result;
}

function extractBase64Images(text: string, images: string[]): void {
  const b64Regex = /(data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+)/g;
  let match;
  while ((match = b64Regex.exec(text)) !== null) {
    if (!images.includes(match[1])) {
      images.push(match[1]);
    }
  }
}


// ── Video Generation ─────────────────────────────────────────────────

export interface VeoVideoOptions {
  prompt: string;
  model?: 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001';
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: number;
  negativePrompt?: string;
  personGeneration?: 'allow_adult' | 'dont_allow';
  imageUrl?: string | null;
}

export interface VeoOperationResult {
  operationName: string;
}

export interface VeoPollResult {
  done: boolean;
  videoUri?: string;
  error?: string;
}

export async function startVeoVideoGeneration(options: VeoVideoOptions): Promise<VeoOperationResult> {
  const provider = getProvider();
  if (provider === 'apiyi') {
    return startVideoViaApiyi(options);
  }
  return startVideoDirect(options);
}

export async function startVeoVideoGenerationDirect(options: VeoVideoOptions): Promise<VeoOperationResult> {
  return startVideoDirect(options);
}

/** Direct Google Veo API — original implementation */
async function startVideoDirect(options: VeoVideoOptions): Promise<VeoOperationResult> {
  const {
    prompt,
    model = 'veo-3.0-fast-generate-001',
    aspectRatio = '16:9',
    durationSeconds = 8,
    negativePrompt,
    personGeneration = 'allow_adult',
    imageUrl,
  } = options;

  const apiKey = getDirectApiKey();
  const url = `${GEMINI_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;

  const parameters: Record<string, unknown> = {
    aspectRatio,
    durationSeconds,
    personGeneration,
  };
  if (negativePrompt) parameters.negativePrompt = negativePrompt;

  const instance: Record<string, unknown> = { prompt };

  if (imageUrl) {
    try {
      let base64Data: string;
      let mimeType = 'image/png';

      if (imageUrl.startsWith('data:')) {
        const match = imageUrl.match(/^data:([\w/+.-]+);base64,([\s\S]+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        } else {
          base64Data = '';
        }
      } else {
        const imgRes = await fetch(imageUrl, { cache: 'no-store' });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type');
          if (contentType) mimeType = contentType.split(';')[0];
          const arrayBuffer = await imgRes.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
        } else {
          base64Data = '';
        }
      }

      if (base64Data) {
        instance.image = {
          bytesBase64Encoded: base64Data,
          mimeType,
        };
      }
    } catch (e) {
      console.warn('[Veo] Failed to process reference image, generating text-only:', e);
    }
  }

  const body = {
    instances: [instance],
    parameters,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.error?.status || `Veo API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return { operationName: data.name };
}

/** APIYI proxy — video generation via OpenAI-compatible format */
async function startVideoViaApiyi(options: VeoVideoOptions): Promise<VeoOperationResult> {
  const {
    prompt,
    aspectRatio = '16:9',
    durationSeconds = 8,
    imageUrl,
  } = options;

  const apiKey = getApiyiApiKey();
  const baseUrl = getApiyiBaseUrl();
  const model = process.env.APIYI_VIDEO_MODEL || 'veo-3.1-fast';

  const contentParts: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Generate a ${durationSeconds}-second video in ${aspectRatio} aspect ratio.\n\n${prompt}`,
    },
  ];

  if (imageUrl) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  const body = {
    model,
    messages: [
      { role: 'user', content: contentParts },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || err?.message || `APIYI video error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();

  // APIYI might return the video directly or as an operation
  // Try to extract a video URL from the response
  const message = (data as any)?.choices?.[0]?.message;
  const content = message?.content;

  let videoUrl: string | null = null;

  if (typeof content === 'string') {
    // Look for video URL in text
    const urlMatch = content.match(/(https?:\/\/[^\s"']+\.(?:mp4|webm|mov))/i);
    if (urlMatch) videoUrl = urlMatch[1];

    // Look for data URL video
    const dataMatch = content.match(/(data:video\/[^\s"']+)/);
    if (dataMatch) videoUrl = dataMatch[1];
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'video_url' && part.video_url?.url) {
        videoUrl = part.video_url.url;
        break;
      }
      if (part.type === 'text' && typeof part.text === 'string') {
        const urlMatch = part.text.match(/(https?:\/\/[^\s"']+\.(?:mp4|webm|mov))/i);
        if (urlMatch) { videoUrl = urlMatch[1]; break; }
      }
    }
  }

  // If we got a video URL directly, store it as the operation name with a prefix
  // so the poll function can return it immediately
  if (videoUrl) {
    return { operationName: `apiyi_complete:${videoUrl}` };
  }

  // If APIYI returned an operation/job ID
  const jobId = (data as any)?.id || (data as any)?.job_id || (data as any)?.operation;
  if (jobId) {
    return { operationName: `apiyi_job:${jobId}` };
  }

  throw new Error('APIYI did not return a video URL or job ID');
}


// ── Polling ──────────────────────────────────────────────────────────

export async function pollVeoOperation(operationName: string): Promise<VeoPollResult> {
  // Handle APIYI completed responses (video URL was returned immediately)
  if (operationName.startsWith('apiyi_complete:')) {
    const videoUri = operationName.slice('apiyi_complete:'.length);
    return { done: true, videoUri };
  }

  // Handle APIYI job polling (if they use async jobs)
  if (operationName.startsWith('apiyi_job:')) {
    const jobId = operationName.slice('apiyi_job:'.length);
    return pollApiyiJob(jobId);
  }

  // Direct Google Veo polling
  const apiKey = getDirectApiKey();
  const url = `${GEMINI_BASE}/${operationName}?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { done: false, error: `Poll failed: ${res.status}` };
  }

  const data = await res.json();

  if (data.done) {
    const videoUri =
      data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
      data.response?.generatedVideos?.[0]?.video?.uri ||
      data.response?.videos?.[0]?.uri ||
      null;

    if (videoUri) {
      return { done: true, videoUri };
    }

    if (data.error) {
      return { done: true, error: data.error.message || 'Video generation failed' };
    }

    return { done: true, error: 'No video URI in response' };
  }

  return { done: false };
}

async function pollApiyiJob(jobId: string): Promise<VeoPollResult> {
  const apiKey = getApiyiApiKey();
  const baseUrl = getApiyiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { done: false, error: `APIYI poll failed: ${res.status}` };
    }

    const data = await res.json();
    if (data.status === 'completed' && data.output_url) {
      return { done: true, videoUri: data.output_url };
    }
    if (data.status === 'failed') {
      return { done: true, error: data.error || 'Video generation failed' };
    }
    return { done: false };
  } catch {
    return { done: false, error: 'APIYI poll network error' };
  }
}


// ── Video Download ───────────────────────────────────────────────────

export async function downloadVeoVideo(videoUri: string): Promise<Buffer> {
  // For APIYI URLs, no API key needed in the URL
  if (videoUri.startsWith('http') && !videoUri.includes('googleapis.com')) {
    const res = await fetch(videoUri, { redirect: 'follow', cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Direct Google — needs API key appended
  const apiKey = getDirectApiKey();
  const separator = videoUri.includes('?') ? '&' : '?';
  const url = `${videoUri}${separator}key=${apiKey}`;

  const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
