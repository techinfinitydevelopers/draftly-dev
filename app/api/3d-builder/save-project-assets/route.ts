import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import {
  FIREBASE_STORAGE_BUCKET_MISSING_HELP,
  resolveFirebaseStorageBucketName,
} from '@/lib/firebase-storage-bucket';
import { planCloudProjectLimit } from '@/lib/subscription-plans';
import { isOwnerEmail } from '@/lib/owner-emails';
import { uploadToWasabi, wasabiProjectPath, isWasabiConfigured } from '@/lib/wasabi-server';

/** Large multipart uploads (site + frames zip + video). Self-hosted: no hard cap. Vercel: see plan body limits. */
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const PROJECTS_COLLECTION = '3dProjects';
const STORAGE_PREFIX = 'users';
/** Firestore field limit ~1MiB; keep hero URL under this after any processing. */
const FIRESTORE_SAFE_URL_BYTES = 500_000;

function projectPath(userId: string, projectId: string, file: string): string {
  return `${STORAGE_PREFIX}/${userId}/3d-projects/${projectId}/${file}`;
}

function buildFirebaseStorageMediaUrl(bucketName: string, storagePath: string, downloadToken: string): string {
  const enc = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${enc}?alt=media&token=${downloadToken}`;
}

/**
 * Data URLs and multi‑MB strings cannot live in Firestore. Upload to Storage and return a short HTTPS URL + path.
 */
async function persistHeroImageIfNeeded(
  bucket: ReturnType<ReturnType<typeof getAdminStorage>['bucket']>,
  bucketName: string,
  userId: string,
  projectId: string,
  bg: string,
): Promise<{ url: string; path: string }> {
  const trimmed = bg.trim();
  const isData = trimmed.startsWith('data:image/');

  let buf: Buffer;
  let ext: string;
  let contentType: string;

  if (isData) {
    const compact = trimmed.replace(/\s/g, '');
    const m = /^data:image\/([\w+.-]+);base64,(.+)$/i.exec(compact);
    if (!m) throw new Error('Invalid hero image data URL');
    buf = Buffer.from(m[2], 'base64');
    const mime = m[1].toLowerCase();
    ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 90_000);
    const res = await fetch(trimmed, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`Could not fetch hero image (${res.status})`);
    buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    contentType = ct.startsWith('image/') ? ct.split(';')[0]! : 'image/jpeg';
  } else {
    throw new Error('Hero image must be a data URL or https URL to upload');
  }

  if (buf.length > 20 * 1024 * 1024) {
    throw new Error('Hero image is too large (max ~20MB).');
  }

  const token = randomUUID();
  const path = projectPath(userId, projectId, `bg-hero.${ext}`);
  const file = bucket.file(path);
  try {
    await file.save(buf, {
      resumable: buf.length > 5 * 1024 * 1024,
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
        cacheControl: 'public, max-age=31536000',
      },
    });
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    const msg = err?.message || String(e);
    if (err?.code === 404 || msg.toLowerCase().includes('bucket') || msg.includes('does not exist')) {
      throw new Error(FIREBASE_STORAGE_BUCKET_MISSING_HELP);
    }
    throw e;
  }

  const url = buildFirebaseStorageMediaUrl(bucketName || bucket.name, path, token);
  return { url, path };
}

async function tryBucketSave(
  bucket: ReturnType<ReturnType<typeof getAdminStorage>['bucket']>,
  path: string,
  buf: Buffer,
  contentType: string,
  label: string,
  warnings: string[],
): Promise<boolean> {
  try {
    await bucket.file(path).save(buf, {
      metadata: { contentType },
    });
    return true;
  } catch (e) {
    console.warn(`[save-project-assets] ${label} Storage save failed:`, e);
    warnings.push(`${label} was not saved to cloud Storage.`);
    return false;
  }
}

/**
 * Saves 3D project blobs to Firebase Storage + Firestore using the Admin SDK.
 * Avoids browser → firebasestorage.googleapis.com CORS/preflight failures.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    let adminAuth: ReturnType<typeof getAdminAuth>;
    try {
      adminAuth = getAdminAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Firebase Admin not configured';
      console.error('[save-project-assets] Admin init failed:', e);
      return NextResponse.json(
        {
          error:
            `${msg}. Set FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL (and FIREBASE_PROJECT_ID) or FIREBASE_ADMIN_SDK_JSON_PATH for server-side project saves.`,
        },
        { status: 503 },
      );
    }
    let uid: string;
    let tokenEmail: string = '';
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
      tokenEmail = decoded.email || '';
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const form = await req.formData();
    const projectId = form.get('projectId');
    const metaRaw = form.get('meta');
    if (typeof projectId !== 'string' || !projectId.trim() || typeof metaRaw !== 'string') {
      return NextResponse.json({ error: 'projectId and meta are required' }, { status: 400 });
    }

    let metaIn: {
      name: string;
      sitePrompt: string;
      bgPrompt: string;
      bgImageUrl: string | null;
      renderMode: 'frame-scroll' | 'video-hero';
      buildTarget: string;
      generatedImageUrls?: string[];
      messages?: unknown[];
    };
    try {
      metaIn = JSON.parse(metaRaw);
    } catch {
      return NextResponse.json({ error: 'Invalid meta JSON' }, { status: 400 });
    }

    const db = getAdminDb();
    const col = db.collection('users').doc(uid).collection(PROJECTS_COLLECTION);
    const docRef = col.doc(projectId);
    let existingCreatedAt = Date.now();
    try {
      const existing = await docRef.get();
      if (existing.exists) {
        const d = existing.data() as { createdAt?: number };
        if (typeof d?.createdAt === 'number') existingCreatedAt = d.createdAt;
      }
    } catch {
      /* ignore */
    }

    const now = Date.now();
    const bucketName = resolveFirebaseStorageBucketName();
    const storage = getAdminStorage();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const cloudStorageWarnings: string[] = [];

    // If client sent bgImage as a separate form field (to avoid 413), reconstruct the data URL
    if (metaIn.bgImageUrl === '__bgImage_form_field__') {
      const bgImageFile = form.get('bgImage');
      if (bgImageFile instanceof File && bgImageFile.size > 0) {
        const buf = Buffer.from(await bgImageFile.arrayBuffer());
        metaIn.bgImageUrl = `data:${bgImageFile.type || 'image/jpeg'};base64,${buf.toString('base64')}`;
      } else {
        metaIn.bgImageUrl = null;
      }
    }

    let heroUrl: string | null = metaIn.bgImageUrl;
    let heroStoragePath: string | undefined;
    let bgImageCloudSkipped = false;

    if (heroUrl && heroUrl.trim()) {
      const h = heroUrl.trim();
      const byteLen = Buffer.byteLength(h, 'utf8');
      const needsStorageUpload = h.startsWith('data:image/') || byteLen > FIRESTORE_SAFE_URL_BYTES;
      if (needsStorageUpload) {
        try {
          const out = await persistHeroImageIfNeeded(bucket, bucketName || bucket.name, uid, projectId.trim(), h);
          heroUrl = out.url;
          heroStoragePath = out.path;
        } catch (e) {
          console.warn('[save-project-assets] Hero image Storage upload skipped:', e);
          cloudStorageWarnings.push(
            'Hero image was not saved to cloud Storage (bucket missing, disabled, or misconfigured). Firestore metadata was saved without the large image.',
          );
          heroUrl = null;
          heroStoragePath = undefined;
          bgImageCloudSkipped = true;
        }
      }
    }

    const meta: Record<string, unknown> = {
      id: projectId,
      name: metaIn.name,
      sitePrompt: metaIn.sitePrompt,
      bgPrompt: metaIn.bgPrompt,
      bgImageUrl: heroUrl,
      renderMode: metaIn.renderMode,
      buildTarget: metaIn.buildTarget,
      createdAt: existingCreatedAt,
      updatedAt: now,
      messages: metaIn.messages,
    };

    if (heroStoragePath) {
      meta.bgImagePath = heroStoragePath;
    }
    if (bgImageCloudSkipped) {
      meta.bgImageCloudSkipped = true;
      meta.bgImagePath = FieldValue.delete();
    }

    if (Array.isArray(metaIn.generatedImageUrls)) {
      meta.generatedImageUrls = metaIn.generatedImageUrls.filter((u) => typeof u === 'string' && u.startsWith('http'));
    }

    const siteFile = form.get('site');
    // Read buffer ONCE — reused for both Firebase Storage and Wasabi to avoid
    // consuming the stream twice (second arrayBuffer() call returns empty).
    let siteBuf: Buffer | null = null;
    if (siteFile instanceof File && siteFile.size > 0) {
      siteBuf = Buffer.from(await siteFile.arrayBuffer());
      const path = projectPath(uid, projectId, 'site.html');
      if (await tryBucketSave(bucket, path, siteBuf, 'text/html; charset=utf-8', 'Site HTML', cloudStorageWarnings)) {
        meta.siteCodePath = path;
      }
    }

    let framesBuf: Buffer | null = null;
    const framesFile = form.get('frames');
    if (framesFile instanceof File && framesFile.size > 0) {
      const path = projectPath(uid, projectId, 'frames.zip');
      framesBuf = Buffer.from(await framesFile.arrayBuffer());
      if (await tryBucketSave(bucket, path, framesBuf, 'application/zip', 'Frames archive', cloudStorageWarnings)) {
        meta.framesPath = path;
      }
    }

    const videoFile = form.get('video');
    let videoBuf: Buffer | null = null;
    let videoCt = 'video/mp4';
    if (videoFile instanceof File && videoFile.size > 0) {
      videoBuf = Buffer.from(await videoFile.arrayBuffer());
      videoCt = videoFile.type || 'video/mp4';
      const path = projectPath(uid, projectId, 'video.mp4');
      if (await tryBucketSave(bucket, path, videoBuf, videoCt, 'Video', cloudStorageWarnings)) {
        meta.videoPath = path;
      }
    }

    const chainPaths: string[] = [];
    for (let i = 0; i < 20; i++) {
      const f = form.get(`videoChain_${i}`);
      if (!(f instanceof File) || f.size === 0) break;
      const file = `video-chain-${i}.mp4`;
      const path = projectPath(uid, projectId, file);
      const buf = Buffer.from(await f.arrayBuffer());
      if (
        await tryBucketSave(bucket, path, buf, f.type || 'video/mp4', `Video chain segment ${i}`, cloudStorageWarnings)
      ) {
        chainPaths.push(path);
      }
    }
    if (chainPaths.length > 0) meta.videoChainPaths = chainPaths;

    const uploadedPaths: { id: string; name: string; path: string }[] = [];
    for (const [key, value] of Array.from(form.entries())) {
      if (!key.startsWith('upload_') || key.startsWith('uploadName_')) continue;
      if (!(value instanceof File) || value.size === 0) continue;
      const id = key.slice('upload_'.length);
      if (!id) continue;
      const nameField = form.get(`uploadName_${id}`);
      const displayName = typeof nameField === 'string' ? nameField : `upload-${id}`;
      const ext = value.type === 'image/png' ? 'png' : 'jpg';
      const rel = `uploads/${id}.${ext}`;
      const path = projectPath(uid, projectId, rel);
      const buf = Buffer.from(await value.arrayBuffer());
      if (
        await tryBucketSave(
          bucket,
          path,
          buf,
          value.type || `image/${ext}`,
          `Uploaded image (${displayName})`,
          cloudStorageWarnings,
        )
      ) {
        uploadedPaths.push({ id, name: displayName, path });
      }
    }
    if (uploadedPaths.length > 0) meta.uploadedImagesPaths = uploadedPaths;

    // --- Wasabi upload ---
    // Reuses already-read buffers (siteBuf, videoBuf) — no double arrayBuffer() reads.
    // wasabiPath is ONLY set if site.html upload actually succeeds.
    if (isWasabiConfigured()) {
      let wasabiSiteUploaded = false;

      if (siteBuf && siteBuf.length > 0) {
        try {
          await uploadToWasabi(wasabiProjectPath(uid, projectId, 'site.html'), siteBuf, 'text/html; charset=utf-8');
          wasabiSiteUploaded = true;
        } catch (e) {
          console.error('[wasabi] site.html upload failed:', e);
          cloudStorageWarnings.push(`Wasabi upload failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (wasabiSiteUploaded) {
        const extraUploads: Promise<void>[] = [];

        if (videoBuf && videoBuf.length > 0) {
          extraUploads.push(
            uploadToWasabi(wasabiProjectPath(uid, projectId, 'video.mp4'), videoBuf, videoCt)
              .catch((e) => { console.warn('[wasabi] video.mp4 upload failed:', e); }),
          );
        }

        for (let i = 0; i < 20; i++) {
          const f = form.get(`videoChain_${i}`);
          if (!(f instanceof File) || f.size === 0) break;
          const buf = Buffer.from(await f.arrayBuffer());
          extraUploads.push(
            uploadToWasabi(wasabiProjectPath(uid, projectId, `video-chain-${i}.mp4`), buf, f.type || 'video/mp4')
              .catch((e) => { console.warn(`[wasabi] video-chain-${i}.mp4 upload failed:`, e); }),
          );
        }

        await Promise.all(extraUploads);

        // Note: frames are uploaded separately via /api/3d-builder/upload-frames
        // (not sent to this endpoint, to stay within Vercel's 4.5MB payload limit).

        meta.wasabiPath = `users/${uid}/projects/${projectId}/`;
        // Also set siteCodePath so loadProjectFromFirebase can load via load-asset Wasabi fallback
        if (!meta.siteCodePath) {
          meta.siteCodePath = projectPath(uid, projectId, 'site.html');
        }
      }
    }
    // --- End Wasabi upload ---

    await docRef.set(meta, { merge: true });

    // Enforce per-plan cloud project limits. Premium/Agency: 30, Pro: 7, Basic Plus: 4, Basic: 2, Free: 0.
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      // Use token email first (always reliable); fall back to Firestore email field.
      // This prevents accidental project deletion when Firestore user doc has no email field.
      const firestoreEmail = typeof userData?.email === 'string' ? userData.email : '';
      const email = tokenEmail || firestoreEmail;
      const plan = String((userData?.subscription as { plan?: string } | undefined)?.plan || 'free');
      const limit = planCloudProjectLimit(plan);
      if (!isOwnerEmail(email)) {
        const all = await col.get();
        // Sort: content-rich projects first (have siteCodePath), then by updatedAt descending.
        // This ensures empty/ghost projects are pruned before real ones.
        const sorted = [...all.docs].sort((a, b) => {
          const aData = a.data() as { updatedAt?: number; siteCodePath?: string; sitePrompt?: string };
          const bData = b.data() as { updatedAt?: number; siteCodePath?: string; sitePrompt?: string };
          const aHasContent = !!(aData.siteCodePath || aData.sitePrompt);
          const bHasContent = !!(bData.siteCodePath || bData.sitePrompt);
          if (aHasContent !== bHasContent) return aHasContent ? -1 : 1;
          const aTime = aData.updatedAt ?? 0;
          const bTime = bData.updatedAt ?? 0;
          return bTime - aTime;
        });
        // Keep only `limit` most recent docs; delete the rest
        const toDelete = sorted.slice(limit);
        const deletes: Promise<unknown>[] = [];
        for (const d of toDelete) {
          const prefix = `${STORAGE_PREFIX}/${uid}/3d-projects/${d.id}/`;
          deletes.push(
            (async () => {
              try {
                await bucket.deleteFiles({ prefix });
              } catch (e) {
                console.warn('[save-project-assets] Storage prune failed for', prefix, e);
              }
              try {
                await d.ref.delete();
              } catch (e) {
                console.warn('[save-project-assets] Firestore prune failed for', d.id, e);
              }
            })(),
          );
        }
        await Promise.all(deletes);
      }
    } catch (e) {
      console.warn('[save-project-assets] Tier prune skipped:', e);
    }

    return NextResponse.json({
      id: meta.id,
      name: meta.name,
      sitePrompt: meta.sitePrompt,
      bgPrompt: meta.bgPrompt,
      bgImageUrl: meta.bgImageUrl,
      bgImagePath: bgImageCloudSkipped ? null : heroStoragePath ?? undefined,
      bgImageCloudSkipped: bgImageCloudSkipped || undefined,
      renderMode: meta.renderMode,
      buildTarget: meta.buildTarget,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      siteCodePath: meta.siteCodePath,
      framesPath: meta.framesPath,
      videoPath: meta.videoPath,
      videoChainPaths: meta.videoChainPaths,
      uploadedImagesPaths: meta.uploadedImagesPaths,
      generatedImageUrls: meta.generatedImageUrls,
      messages: meta.messages,
      ...(cloudStorageWarnings.length > 0 ? { cloudStorageWarnings } : {}),
    });
  } catch (e: unknown) {
    let msg = e instanceof Error ? e.message : 'Save failed';
    const low = msg.toLowerCase();
    if (low.includes('does not exist') && (low.includes('bucket') || low.includes('404'))) {
      msg = FIREBASE_STORAGE_BUCKET_MISSING_HELP;
    }
    console.error('[save-project-assets]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
