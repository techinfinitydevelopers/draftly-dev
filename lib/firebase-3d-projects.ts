/**
 * Persist 3D Builder projects to Firebase Storage + Firestore.
 * Firestore holds metadata + Storage paths (1MB doc limit avoided); blobs live in Storage.
 *
 * Required Security Rules:
 * - Firestore: allow read, write on /users/{userId}/3dProjects/{projectId} when request.auth.uid == userId.
 * - Storage: allow read, write on /users/{userId}/3d-projects/{projectId} when request.auth.uid == userId.
 */

import { ref, getDownloadURL } from 'firebase/storage'; // getDownloadURL still used for bgImagePath fallback
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  orderBy,
} from 'firebase/firestore';
import { storage, db, auth } from '@/lib/firebase';

const PROJECTS_COLLECTION = '3dProjects';
const STORAGE_PREFIX = 'users';
const MAX_PROJECTS = 20;

export interface Firebase3DProjectMeta {
  id: string;
  name: string;
  sitePrompt: string;
  bgPrompt: string;
  bgImageUrl: string | null;
  /** Storage path for hero still when URL is served from Firebase Storage (optional). */
  bgImagePath?: string | null;
  /** Set when hero could not be uploaded to Storage (e.g. bucket missing); client keeps local image via merge. */
  bgImageCloudSkipped?: boolean;
  cloudStorageWarnings?: string[];
  /** Kept for Firestore compatibility; 3D builder UI is effectively frame-scroll + site preview. */
  renderMode: 'frame-scroll' | 'video-hero';
  buildTarget: string;
  createdAt: number;
  updatedAt: number;
  siteCodePath?: string;
  framesPath?: string;
  videoPath?: string;
  videoChainPaths?: string[];
  uploadedImagesPaths?: { id: string; name: string; path: string }[];
  generatedImageUrls?: string[];
  /** Chat messages for project continuity */
  messages?: Array<{
    role: string;
    text: string;
    imageUrl?: string;
    videoSrc?: string;
    videoFallbackSrc?: string;
    ts: number;
    integrationHint?: { kind: 'connect' | 'suggest'; integrationIds: string[] };
  }>;
}

function projectStoragePath(userId: string, projectId: string, file: string): string {
  return `${STORAGE_PREFIX}/${userId}/3d-projects/${projectId}/${file}`;
}

/**
 * Save project assets via Next.js API + Firebase Admin (avoids browser CORS to firebasestorage.googleapis.com).
 */
async function saveProjectToFirebaseViaApi(
  userId: string,
  projectId: string,
  payload: {
    name: string;
    sitePrompt: string;
    bgPrompt: string;
    bgImageUrl: string | null;
    siteCode: string | null;
    webpFrames: string[];
    videoBase64: string | null;
    videoChain?: string[];
    generatedImageUrls?: string[];
    renderMode: 'frame-scroll' | 'video-hero';
    buildTarget: string;
    uploadedImages: { id: string; name: string; dataUrl: string }[];
    messages?: Array<{
      role: string;
      text: string;
      imageUrl?: string;
      videoSrc?: string;
      videoFallbackSrc?: string;
      ts: number;
      integrationHint?: { kind: 'connect' | 'suggest'; integrationIds: string[] };
    }>;
  },
): Promise<Firebase3DProjectMeta> {
  const u = auth.currentUser;
  if (!u || u.uid !== userId) {
    throw new Error('Not signed in or user mismatch');
  }
  const idToken = await u.getIdToken();

  const fd = new FormData();
  fd.append('projectId', projectId);
  fd.append(
    'meta',
    JSON.stringify({
      name: payload.name,
      sitePrompt: payload.sitePrompt,
      bgPrompt: payload.bgPrompt,
      bgImageUrl: payload.bgImageUrl,
      renderMode: payload.renderMode,
      buildTarget: payload.buildTarget,
      generatedImageUrls: payload.generatedImageUrls,
      messages: payload.messages,
    }),
  );

  if (payload.siteCode) {
    fd.append('site', new Blob([payload.siteCode], { type: 'text/html;charset=utf-8' }), 'site.html');
  }

  if (payload.webpFrames.length > 0) {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    payload.webpFrames.forEach((dataUrl, i) => {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      zip.file(`frame_${String(i + 1).padStart(6, '0')}.webp`, base64!, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    fd.append('frames', blob, 'frames.zip');
  }

  if (payload.videoBase64) {
    const match = payload.videoBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const binary = atob(match[2]!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      fd.append('video', new Blob([bytes], { type: match[1] || 'video/mp4' }), 'video.mp4');
    }
  }

  if (payload.videoChain && payload.videoChain.length > 0) {
    for (let vi = 0; vi < payload.videoChain.length; vi++) {
      const vid = payload.videoChain[vi]!;
      const match = vid.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) continue;
      const binary = atob(match[2]!);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      fd.append(
        `videoChain_${vi}`,
        new Blob([bytes], { type: match[1] || 'video/mp4' }),
        `chain-${vi}.mp4`,
      );
    }
  }

  for (const img of payload.uploadedImages) {
    const base64 = img.dataUrl.includes(',') ? img.dataUrl.split(',')[1] : img.dataUrl;
    if (!base64) continue;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    const ext = img.dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    fd.append(
      `upload_${img.id}`,
      new Blob([bytes], { type: ext === 'png' ? 'image/png' : 'image/jpeg' }),
      `${img.id}.${ext}`,
    );
    fd.append(`uploadName_${img.id}`, img.name);
  }

  const res = await fetch('/api/3d-builder/save-project-assets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: fd,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error || '';
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Save failed (${res.status})`);
  }

  return (await res.json()) as Firebase3DProjectMeta;
}

/**
 * Save a 3D project to Firebase: upload siteCode, frames zip, video, and uploads to Storage;
 * then write metadata + paths to Firestore.
 */
export async function saveProjectToFirebase(
  userId: string,
  projectId: string,
  payload: {
    name: string;
    sitePrompt: string;
    bgPrompt: string;
    bgImageUrl: string | null;
    siteCode: string | null;
    webpFrames: string[];
    videoBase64: string | null;
    videoChain?: string[];
    generatedImageUrls?: string[];
    renderMode: 'frame-scroll' | 'video-hero';
    buildTarget: string;
    uploadedImages: { id: string; name: string; dataUrl: string }[];
    messages?: Array<{
      role: string;
      text: string;
      imageUrl?: string;
      videoSrc?: string;
      videoFallbackSrc?: string;
      ts: number;
      integrationHint?: { kind: 'connect' | 'suggest'; integrationIds: string[] };
    }>;
  },
): Promise<Firebase3DProjectMeta> {
  if (typeof window !== 'undefined') {
    return saveProjectToFirebaseViaApi(userId, projectId, payload);
  }
  throw new Error('saveProjectToFirebase must run in the browser');
}

/**
 * Load a single project's assets from Firebase Storage using paths in the Firestore doc.
 */
export async function loadProjectFromFirebase(
  userId: string,
  projectId: string,
): Promise<{
  siteCode: string | null;
  webpFrames: string[];
  videoBase64: string | null;
  videoChain: string[];
  generatedImageUrls: string[];
  uploadedImages: { id: string; name: string; dataUrl: string }[];
  messages: Array<{
    role: string;
    text: string;
    imageUrl?: string;
    videoSrc?: string;
    videoFallbackSrc?: string;
    ts: number;
    integrationHint?: { kind: 'connect' | 'suggest'; integrationIds: string[] };
  }>;
  meta: Firebase3DProjectMeta;
} | null> {
  const col = collection(db, 'users', userId, PROJECTS_COLLECTION);
  const snap = await getDoc(doc(col, projectId));
  if (!snap.exists()) {
    console.warn('[firebase-3d-projects] Project not found:', projectId, 'user:', userId);
    return null;
  }
  const metaRaw = snap.data() as Firebase3DProjectMeta;
  let resolvedBgUrl = metaRaw.bgImageUrl ?? null;
  if (!resolvedBgUrl && metaRaw.bgImagePath) {
    try {
      resolvedBgUrl = await getDownloadURL(ref(storage, metaRaw.bgImagePath));
    } catch {
      /* keep null */
    }
  }
  const meta: Firebase3DProjectMeta = { ...metaRaw, bgImageUrl: resolvedBgUrl };

  // Get auth token for proxy API calls (avoids browser CORS to firebasestorage.googleapis.com)
  const idToken = await auth.currentUser!.getIdToken();
  const proxyFetch = (path: string) =>
    fetch(`/api/3d-builder/load-asset?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

  let siteCode: string | null = null;
  let webpFrames: string[] = [];
  let videoBase64: string | null = null;
  const uploadedImages: { id: string; name: string; dataUrl: string }[] = [];

  if (meta.siteCodePath) {
    const res = await proxyFetch(meta.siteCodePath);
    if (res.ok) siteCode = await res.text();
  }

  if (meta.framesPath) {
    const res = await proxyFetch(meta.framesPath);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(ab);
      const names = Object.keys(zip.files)
        .filter((n) => n.endsWith('.webp') && !zip.files[n]?.dir)
        .sort((a, b) => {
          const na = parseInt((a.match(/(\d+)/g) || ['0']).pop() || '0', 10);
          const nb = parseInt((b.match(/(\d+)/g) || ['0']).pop() || '0', 10);
          return na - nb;
        });
      for (const name of names) {
        const entry = zip.files[name];
        if (!entry || entry.dir) continue;
        const blob = await entry.async('base64');
        webpFrames.push(`data:image/webp;base64,${blob}`);
      }
    }
  }

  if (meta.videoPath) {
    const res = await proxyFetch(meta.videoPath);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      videoBase64 = `data:video/mp4;base64,${btoa(binary)}`;
    }
  }

  const videoChain: string[] = [];
  if (meta.videoChainPaths?.length) {
    for (const p of meta.videoChainPaths) {
      try {
        const res = await proxyFetch(p);
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        videoChain.push(`data:video/mp4;base64,${btoa(binary)}`);
      } catch {
        // skip corrupted chain entry
      }
    }
  }

  if (meta.uploadedImagesPaths?.length) {
    for (const { id: imgId, name, path } of meta.uploadedImagesPaths) {
      const res = await proxyFetch(path);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      uploadedImages.push({ id: imgId, name, dataUrl });
    }
  }

  const messages = Array.isArray(meta.messages) ? meta.messages : [];
  const generatedImageUrls = Array.isArray(meta.generatedImageUrls) ? meta.generatedImageUrls : [];

  return {
    siteCode,
    webpFrames,
    videoBase64,
    videoChain,
    uploadedImages,
    messages,
    generatedImageUrls,
    meta,
  };
}

/**
 * Fetch only the site HTML for a project (for profile preview).
 */
export async function getProjectSiteCodeForPreview(
  userId: string,
  projectId: string,
): Promise<string | null> {
  const col = collection(db, 'users', userId, PROJECTS_COLLECTION);
  const snap = await getDoc(doc(col, projectId));
  if (!snap.exists()) return null;
  const meta = snap.data() as Firebase3DProjectMeta;
  if (!meta.siteCodePath) return null;
  const idToken = await auth.currentUser!.getIdToken();
  const res = await fetch(`/api/3d-builder/load-asset?path=${encodeURIComponent(meta.siteCodePath)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return res.text();
}

/**
 * List 3D projects for a user from Firestore (metadata only, no blobs).
 */
export async function listProjectsFromFirebase(userId: string): Promise<Firebase3DProjectMeta[]> {
  const col = collection(db, 'users', userId, PROJECTS_COLLECTION);
  let snapshot;
  try {
    // Prefer stable ordering (newest first). Requires `updatedAt` on docs (we always set it).
    snapshot = await getDocs(query(col, orderBy('updatedAt', 'desc'), limit(MAX_PROJECTS)));
  } catch {
    // Fallback if index missing or legacy docs without updatedAt
    snapshot = await getDocs(query(col, limit(MAX_PROJECTS)));
  }
  const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Firebase3DProjectMeta));
  list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  console.log('[firebase-3d-projects] Listed', list.length, 'projects for user', userId);
  return list;
}
