import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { resolveFirebaseStorageBucketName } from '@/lib/firebase-storage-bucket';
import { downloadFromWasabi, isWasabiConfigured } from '@/lib/wasabi-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Proxy Firebase Storage asset downloads through the server to avoid browser CORS issues.
 * GET /api/3d-builder/load-asset?path=users/uid/3d-projects/proj/site.html
 */
export async function GET(req: NextRequest) {
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

    const storagePath = req.nextUrl.searchParams.get('path');
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Security: only allow access to the requesting user's own files
    if (!storagePath.startsWith(`users/${uid}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try Firebase Storage first, fall back to Wasabi
    let buf: Buffer | null = null;
    let contentType = 'application/octet-stream';

    try {
      const storage = getAdminStorage();
      const bucketName = resolveFirebaseStorageBucketName();
      const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (exists) {
        const [downloaded] = await file.download();
        buf = downloaded;
        const [metadata] = await file.getMetadata();
        contentType = (metadata.contentType as string) || contentType;
      }
    } catch {
      // Firebase Storage unavailable — will try Wasabi below
    }

    if (!buf && isWasabiConfigured()) {
      try {
        // Wasabi uses a different path pattern: users/{uid}/projects/{projectId}/...
        const wasabiKey = storagePath.replace(/^users\/([^/]+)\/3d-projects\//, 'users/$1/projects/');
        buf = await downloadFromWasabi(wasabiKey);
        if (storagePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
        else if (storagePath.endsWith('.mp4')) contentType = 'video/mp4';
      } catch {
        // not found in Wasabi either
      }
    }

    if (!buf) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[load-asset]', e);
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 500 });
  }
}
