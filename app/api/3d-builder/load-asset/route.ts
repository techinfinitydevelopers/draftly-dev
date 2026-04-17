import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { resolveFirebaseStorageBucketName } from '@/lib/firebase-storage-bucket';

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

    const storage = getAdminStorage();
    const bucketName = resolveFirebaseStorageBucketName();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const [bufferRaw] = await file.download();
    const buffer = new Uint8Array(bufferRaw);
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || 'application/octet-stream';

    return new NextResponse(buffer, {
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
