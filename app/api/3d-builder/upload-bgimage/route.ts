import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { uploadToWasabi, wasabiProjectPath, isWasabiConfigured } from '@/lib/wasabi-server';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Upload bg-hero image to Wasabi.
 * POST /api/3d-builder/upload-bgimage
 * FormData: projectId + ext (png/webp/jpg) + bg (image blob)
 * Returns: { bgImagePath } — Firebase Storage-style path for load-asset proxy
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
    const ext = form.get('ext') || 'jpg';
    const bgFile = form.get('bg');

    if (typeof projectId !== 'string' || !projectId.trim()) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!(bgFile instanceof File) || bgFile.size === 0) {
      return NextResponse.json({ error: 'bg image is required' }, { status: 400 });
    }

    const filename = `bg-hero.${ext}`;
    const buf = Buffer.from(await bgFile.arrayBuffer());
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    await uploadToWasabi(
      wasabiProjectPath(uid, projectId.trim(), filename),
      buf,
      mimeType,
    );

    // Return Firebase Storage-style path so load-asset proxy can serve it via Wasabi fallback
    const bgImagePath = `users/${uid}/3d-projects/${projectId.trim()}/${filename}`;
    return NextResponse.json({ bgImagePath });
  } catch (e) {
    console.error('[upload-bgimage]', e);
    return NextResponse.json({ error: 'Failed to upload bg image' }, { status: 500 });
  }
}
