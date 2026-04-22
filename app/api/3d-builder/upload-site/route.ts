import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { uploadToWasabi, wasabiProjectPath, isWasabiConfigured } from '@/lib/wasabi-server';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Upload site.html directly to Wasabi.
 * POST /api/3d-builder/upload-site
 * FormData: projectId + site (HTML blob)
 * Returns: { siteCodePath }
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
    const siteFile = form.get('site');

    if (typeof projectId !== 'string' || !projectId.trim()) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!(siteFile instanceof File) || siteFile.size === 0) {
      return NextResponse.json({ error: 'site file is required' }, { status: 400 });
    }

    const buf = Buffer.from(await siteFile.arrayBuffer());
    const wasabiKey = wasabiProjectPath(uid, projectId.trim(), 'site.html');
    await uploadToWasabi(wasabiKey, buf, 'text/html; charset=utf-8');

    // Return the Firebase Storage-style path so Firestore siteCodePath is set correctly
    const siteCodePath = `users/${uid}/3d-projects/${projectId.trim()}/site.html`;
    return NextResponse.json({ siteCodePath });
  } catch (e) {
    console.error('[upload-site]', e);
    return NextResponse.json({ error: 'Failed to upload site' }, { status: 500 });
  }
}
