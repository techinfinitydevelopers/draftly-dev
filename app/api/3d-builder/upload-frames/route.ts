import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { uploadToWasabi, wasabiProjectPath, isWasabiConfigured } from '@/lib/wasabi-server';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Upload individual frames to Wasabi in batches.
 * POST /api/3d-builder/upload-frames
 * FormData: projectId + frame_000001 ... frame_NNNNNN (binary blobs)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    let uid: string;
    try {
      const adminAuth = getAdminAuth();
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!isWasabiConfigured()) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const form = await req.formData();
    const projectId = form.get('projectId');
    if (typeof projectId !== 'string' || !projectId.trim()) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const uploads: Promise<void>[] = [];
    let total = 0;

    for (const [key, value] of Array.from(form.entries())) {
      if (!key.startsWith('frame_') || !(value instanceof File) || value.size === 0) continue;
      const frameNum = key.slice('frame_'.length); // e.g. "000001"
      total++;
      const buf = Buffer.from(await value.arrayBuffer());
      uploads.push(
        uploadToWasabi(
          wasabiProjectPath(uid, projectId.trim(), `frames-jpg/frame_${frameNum}.jpg`),
          buf,
          'image/jpeg',
        ).catch((e) => {
          console.warn(`[upload-frames] frame_${frameNum} upload failed:`, e);
        }),
      );
    }

    await Promise.all(uploads);

    return NextResponse.json({ uploaded: total });
  } catch (e) {
    console.error('[upload-frames]', e);
    return NextResponse.json({ error: 'Failed to upload frames' }, { status: 500 });
  }
}
