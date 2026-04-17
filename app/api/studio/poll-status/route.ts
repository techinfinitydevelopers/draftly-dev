import { NextRequest, NextResponse } from 'next/server';
import { getFalStatus } from '@/lib/fal';
import { getReplicatePrediction } from '@/lib/replicate';
import { pollApiEasyOperation } from '@/lib/api-easy-studio';
import { pollVeoOperation } from '@/lib/gemini-studio';
import { pollVeo31FastFirstLastJob } from '@/lib/fal-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function extractVideoUrl(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('//')) return `https:${value}`;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractVideoUrl(item);
      if (url) return url;
    }
    return null;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = [
      'video',
      'video_url',
      'videoUrl',
      'video_uri',
      'videoUri',
      'output',
      'output_url',
      'outputUrl',
      'url',
      'file',
      'file_url',
      'fileUrl',
      'download_url',
      'downloadUrl',
      'result',
      'data',
      'outputs',
      'items',
      'assets',
    ];
    for (const key of keys) {
      const url = extractVideoUrl(obj[key]);
      if (url) return url;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const provider = searchParams.get('provider');
    const model = searchParams.get('model');

    if (!jobId || !provider) {
      return NextResponse.json({ error: 'jobId and provider are required' }, { status: 400 });
    }

    if (provider === 'gemini') {
      // ── Gemini Veo polling ────────────────────────────────────
      const result = await pollVeoOperation(jobId);

      if (result.done && result.videoUri) {
        const proxyUrl = `/api/studio/download-video?uri=${encodeURIComponent(result.videoUri)}`;
        return NextResponse.json({
          status: 'completed',
          outputUrl: proxyUrl,
        });
      } else if (result.error) {
        return NextResponse.json({
          status: 'failed',
          error: result.error,
        });
      }

      return NextResponse.json({ status: 'processing', progress: null });
    } else if (provider === 'api-easy') {
      // ── API-Easy video polling ───────────────────────────────
      const result = await pollApiEasyOperation(jobId);

      if (result.done && result.videoUri) {
        // Always route through our proxy so playback works even when upstream
        // video URLs require auth/CORS handling.
        const proxyUrl = `/api/studio/download-video?uri=${encodeURIComponent(result.videoUri)}`;
        return NextResponse.json({
          status: 'completed',
          outputUrl: proxyUrl,
        });
      } else if (result.error) {
        return NextResponse.json({
          status: 'failed',
          error: result.error,
        });
      }

      // Still processing — no granular progress from API, client increments
      return NextResponse.json({ status: 'processing', progress: null });
    } else if (provider === 'fal') {
      if (model === 'veo-3.1-fast-fal-fl') {
        const veo = await pollVeo31FastFirstLastJob(jobId);
        if (veo.state === 'completed' && veo.videoUrl) {
          return NextResponse.json({
            status: 'completed',
            outputUrl: veo.videoUrl,
          });
        }
        if (veo.state === 'failed') {
          return NextResponse.json({
            status: 'failed',
            error: veo.message || 'Veo 3.1 video generation failed',
          });
        }
        return NextResponse.json({ status: 'processing', progress: null });
      }

      // ── fal.ai polling (WAN, Kling, …) ─────────────────────
      const falModelKey = model || 'kling-1.6';

      const result = await getFalStatus(falModelKey as any, jobId);

      if (result.status === 'completed' && result.data) {
        const videoUrl = extractVideoUrl(result.data);
        if (!videoUrl) {
          return NextResponse.json({
            status: 'failed',
            error: 'Video generation completed but no playable URL was found in provider response.',
          });
        }

        return NextResponse.json({
          status: 'completed',
          outputUrl: videoUrl,
        });
      } else if (result.status === 'failed') {
        return NextResponse.json({
          status: 'failed',
          error: 'Video generation failed on fal.ai',
        });
      }

      // fal.ai still processing — let client handle incremental progress
      return NextResponse.json({ status: 'processing', progress: null });
    } else {
      // ── Replicate polling ──────────────────────────────────
      const prediction = await getReplicatePrediction(jobId);

      if (prediction.status === 'succeeded') {
        const outputUrl = extractVideoUrl(prediction.output);
        if (!outputUrl) {
          return NextResponse.json({
            status: 'failed',
            error: 'Replicate completed but no playable video URL was found.',
          });
        }

        return NextResponse.json({
          status: 'completed',
          outputUrl,
        });
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        return NextResponse.json({
          status: 'failed',
          error: prediction.error || 'Video generation failed',
        });
      }

      // Map Replicate status to progress estimate
      const progressMap: Record<string, number> = {
        starting: 10,
        processing: 50,
      };

      return NextResponse.json({
        status: 'processing',
        progress: progressMap[prediction.status] || 30,
      });
    }
  } catch (error: unknown) {
    console.error('[studio/poll-status] Error:', error);
    return NextResponse.json({ error: 'Status check failed.' }, { status: 500 });
  }
}
