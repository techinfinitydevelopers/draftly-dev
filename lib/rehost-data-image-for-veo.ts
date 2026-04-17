import { randomBytes } from 'node:crypto';
import { getAdminStorage } from '@/lib/firebase-admin';
import { resolveFirebaseStorageBucketName } from '@/lib/firebase-storage-bucket';

const DATA_URL_RE = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/i;

/**
 * Veo / API-Easy video often rejects `data:image/...;base64,...` keyframes. Upload to Storage and
 * return a time-limited HTTPS URL the provider can fetch.
 */
export async function rehostDataImageUrlForVeoIfNeeded(url: string, userId: string): Promise<string> {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image/')) return trimmed;

  const compact = trimmed.replace(/\s/g, '');
  const m = DATA_URL_RE.exec(compact);
  if (!m) throw new Error('Invalid base64 image data for video keyframes');

  const mimeRaw = m[1].toLowerCase();
  const ext =
    mimeRaw === 'png' || mimeRaw === 'x-png'
      ? 'png'
      : mimeRaw === 'webp'
        ? 'webp'
        : mimeRaw === 'jpeg' || mimeRaw === 'jpg'
          ? 'jpg'
          : 'png';
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 14 * 1024 * 1024) {
    throw new Error(
      'Keyframe image is too large (max ~14MB). Use a smaller upload or generate the frame in-app.',
    );
  }

  const storage = getAdminStorage();
  const bucketName = resolveFirebaseStorageBucketName();
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const path = `users/${userId}/3d-builder-temp/veo-fl-${Date.now()}-${randomBytes(5).toString('hex')}.${ext}`;
  const file = bucket.file(path);

  try {
    await file.save(buf, {
      contentType,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=3600' },
    });
  } catch (e: unknown) {
    console.warn(
      '[rehostDataImageUrlForVeoIfNeeded] Storage upload failed; passing original data URL (Veo may still reject long payloads).',
      e,
    );
    return trimmed;
  }

  try {
    const [readUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3 * 60 * 60 * 1000,
    });
    return readUrl;
  } catch (e: unknown) {
    console.warn('[rehostDataImageUrlForVeoIfNeeded] getSignedUrl failed; passing original data URL.', e);
    return trimmed;
  }
}
