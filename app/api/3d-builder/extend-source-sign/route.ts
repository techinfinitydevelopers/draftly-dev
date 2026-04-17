import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { resolveFirebaseStorageBucketName } from '@/lib/firebase-storage-bucket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STORAGE_PREFIX = 'users';

/**
 * Returns v4 signed URLs so the browser can PUT a large MP4 to GCS, then pass the read URL
 * to `/api/3d-builder/extend-video` (avoids JSON body limits on the extend route).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let adminAuth: ReturnType<typeof getAdminAuth>;
    try {
      adminAuth = getAdminAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Firebase Admin not configured';
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const storage = getAdminStorage();
    const bucketName = resolveFirebaseStorageBucketName();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const suffix = `${Date.now()}-${randomBytes(6).toString('hex')}`;
    const objectPath = `${STORAGE_PREFIX}/${uid}/3d-builder-temp/extend-${suffix}.mp4`;
    const file = bucket.file(objectPath);

    const expiresWrite = Date.now() + 20 * 60 * 1000;
    const expiresRead = Date.now() + 60 * 60 * 1000;

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresWrite,
      contentType: 'video/mp4',
    });

    const [readUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresRead,
    });

    return NextResponse.json({ uploadUrl, readUrl, objectPath });
  } catch (e: unknown) {
    console.error('[extend-source-sign]', e);
    return NextResponse.json(
      { error: (e as Error)?.message || 'Could not create upload URL.' },
      { status: 500 },
    );
  }
}
