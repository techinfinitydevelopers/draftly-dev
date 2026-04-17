import { NextRequest, NextResponse } from 'next/server';
import { downloadApiEasyVideo } from '@/lib/api-easy-studio';
import { downloadVeoVideo } from '@/lib/gemini-studio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * GET /api/studio/download-video?uri=<api-easy-video-uri>
 *
 * Proxy-downloads an API-Easy-generated video and streams it back as `video/mp4`.
 * The client can set this URL as the `<video src>` directly.
 */
const ALLOWED_VIDEO_HOSTS = [
  'generativelanguage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'googlevideo.com',
  'apiyi.com',
  'api.apiyi.com',
  'fal.media',
  'v3.fal.media',
  'replicate.delivery',
];

function isAllowedVideoHost(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    const h = hostname.toLowerCase();
    return ALLOWED_VIDEO_HOSTS.some(
      allowed => h === allowed || h.endsWith('.' + allowed),
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const uri = req.nextUrl.searchParams.get('uri');
    if (!uri) {
      return NextResponse.json({ error: 'uri is required' }, { status: 400 });
    }

    if (!isAllowedVideoHost(uri)) {
      return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 });
    }

    const range = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {};
    if (range) upstreamHeaders.Range = range;

    let sourceUri = uri;
    try {
      const parsed = new URL(uri);
      const host = parsed.hostname.toLowerCase();
      const isGeminiHost = host === 'generativelanguage.googleapis.com' || host === 'storage.googleapis.com' || host.endsWith('.googlevideo.com') || host === 'googlevideo.com';
      if (isGeminiHost && !parsed.searchParams.has('key')) {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
          parsed.searchParams.set('key', geminiKey);
          sourceUri = parsed.toString();
        }
      }
    } catch {
      // Fall through to raw URI.
    }

    let authHeader: string | null = null;
    try {
      const host = new URL(sourceUri).hostname.toLowerCase();
      if (host === 'apiyi.com' || host === 'api.apiyi.com' || host.endsWith('.apiyi.com')) {
        const apiKey = process.env.API_EASY_API_KEY || process.env.APIYI_API_KEY;
        if (apiKey) authHeader = `Bearer ${apiKey}`;
      }
    } catch {
      // noop
    }
    if (authHeader) upstreamHeaders.Authorization = authHeader;

    const upstream = await fetch(sourceUri, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      // Keep fallback behavior for providers that only return directly downloadable URLs.
      if (!upstream.ok && upstream.status !== 401 && upstream.status !== 403) {
        const host = (() => {
          try {
            return new URL(sourceUri).hostname.toLowerCase();
          } catch {
            return '';
          }
        })();
        const isGeminiHost = host.includes('googleapis.com') || host.includes('googlevideo.com');
        const downloaded = isGeminiHost
          ? { buffer: await downloadVeoVideo(uri), mimeType: 'video/mp4' }
          : await downloadApiEasyVideo(sourceUri);
        return new Response(Buffer.from(downloaded.buffer) as unknown as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': downloaded.mimeType || 'video/mp4',
            'Content-Length': downloaded.buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',
            'Content-Disposition': 'inline; filename="draftly-video.mp4"',
            'Accept-Ranges': 'bytes',
          },
        });
      }
      return NextResponse.json({ error: `Upstream video fetch failed (${upstream.status})` }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('Content-Disposition', 'inline; filename="draftly-video.mp4"');
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error: unknown) {
    console.error('[download-video] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download video' },
      { status: 500 },
    );
  }
}
