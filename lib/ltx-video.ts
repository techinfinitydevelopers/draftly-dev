/**
 * LTX Video official API — image-to-video (and first→last via last_frame_uri for LTX-2.3).
 * https://docs.ltx.video/
 */

import type { LtxOfficialApiModel } from '@/lib/ltx-builder-shared';

const LTX_IMAGE_TO_VIDEO_URL = 'https://api.ltx.video/v1/image-to-video';

export type { LtxOfficialApiModel };

/** @deprecated use LtxOfficialApiModel */
export type LtxVideoModelId = 'ltx-2-3-pro' | 'ltx-2-3-fast';

export async function ltxImageToVideo(params: {
  apiKey: string;
  imageUri: string;
  lastFrameUri?: string;
  prompt: string;
  model: LtxOfficialApiModel;
  durationSec: number;
  resolution: string;
  /** Builder backgrounds default to silent loops. */
  generateAudio?: boolean;
  fps?: number;
}): Promise<Buffer> {
  const body: Record<string, unknown> = {
    image_uri: params.imageUri,
    prompt: params.prompt,
    model: params.model,
    duration: params.durationSec,
    resolution: params.resolution,
    generate_audio: params.generateAudio ?? false,
  };
  if (params.lastFrameUri) body.last_frame_uri = params.lastFrameUri;
  if (params.fps != null) body.fps = params.fps;

  const res = await fetch(LTX_IMAGE_TO_VIDEO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600_000),
  });

  if (!res.ok) {
    let msg = `LTX API error (${res.status})`;
    try {
      const j = (await res.json()) as { error?: { message?: string }; message?: string };
      const m = j?.error?.message || j?.message;
      if (m) msg = String(m);
    } catch {
      try {
        const t = await res.text();
        if (t) msg = t.slice(0, 500);
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    const j = (await res.json()) as { error?: { message?: string } };
    throw new Error(j?.error?.message || 'LTX returned JSON instead of video');
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
