import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // base64 uploads can take time

// ── Helper: upload base64 data URL to Firebase Storage ──────────────

async function uploadBase64ToStorage(
  base64DataUrl: string,
  storagePath: string,
): Promise<string> {
  const match = base64DataUrl.match(/^data:([\w/+.-]+);base64,([\s\S]+)$/);
  if (!match) return base64DataUrl;

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return signedUrl;
}

// ── Helper: process nodes — upload any base64 images to Storage ─────

async function processNodesForSave(
  nodes: Array<Record<string, unknown>>,
  userId: string,
  wfId: string,
): Promise<Array<Record<string, unknown>>> {
  return Promise.all(
    nodes.map(async (node) => {
      const data = { ...(node.data as Record<string, unknown>) };
      const basePath = `studio/${userId}/${wfId}/${node.id as string}`;

      // outputImages — array (imageGen, imageVariation)
      if (Array.isArray(data.outputImages)) {
        data.outputImages = await Promise.all(
          (data.outputImages as string[]).map(async (url: string, i: number) => {
            if (typeof url === 'string' && url.startsWith('data:')) {
              try {
                return await uploadBase64ToStorage(url, `${basePath}/img-${i}.png`);
              } catch (e) {
                console.warn('[save-workflow] Failed to upload image:', e);
                return url; // keep base64 as fallback
              }
            }
            return url;
          }),
        );
      }

      // outputImage — single string (upscale, removeBG)
      if (typeof data.outputImage === 'string' && data.outputImage.startsWith('data:')) {
        try {
          data.outputImage = await uploadBase64ToStorage(data.outputImage, `${basePath}/output.png`);
        } catch (e) {
          console.warn('[save-workflow] Failed to upload outputImage:', e);
        }
      }

      // imageUrl — single string (imageUpload node with base64)
      if (typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:')) {
        try {
          data.imageUrl = await uploadBase64ToStorage(data.imageUrl, `${basePath}/upload.png`);
        } catch (e) {
          console.warn('[save-workflow] Failed to upload imageUrl:', e);
        }
      }

      return { ...node, data };
    }),
  );
}

// ── Save or update a workflow ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, workflowId, name, nodes, edges } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = new Date().toISOString();

    // Strip runtime state from nodes
    const cleanNodes = (nodes || []).map((n: Record<string, unknown>) => ({
      ...n,
      data: { ...(n.data as Record<string, unknown>), isRunning: false, error: null },
    }));

    // Determine workflow ID (generate one early if new, so we can use it in storage paths)
    const colRef = db.collection('users').doc(userId).collection('workflows');
    const resolvedWfId = workflowId || colRef.doc().id;

    // Upload any base64 images to Firebase Storage before saving
    const processedNodes = await processNodesForSave(cleanNodes, userId, resolvedWfId);

    const payload = {
      name: name || 'Untitled Workflow',
      nodes: JSON.parse(JSON.stringify(processedNodes)),
      edges: JSON.parse(JSON.stringify(edges || [])),
      updatedAt: now,
    };

    if (workflowId) {
      // Update existing workflow
      const docRef = colRef.doc(workflowId);
      await docRef.set(payload, { merge: true });
      return NextResponse.json({ workflowId, saved: true });
    } else {
      // Create new workflow
      const docRef = colRef.doc(resolvedWfId);
      await docRef.set({ ...payload, createdAt: now });
      return NextResponse.json({ workflowId: resolvedWfId, saved: true });
    }
  } catch (error: unknown) {
    console.error('[studio/save-workflow] Error:', error);
    return NextResponse.json({ error: 'Save failed. Please try again.' }, { status: 500 });
  }
}

// ── Load workflows ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const workflowId = searchParams.get('workflowId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    if (workflowId) {
      // Load a single workflow
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('workflows')
        .doc(workflowId)
        .get();

      if (!doc.exists) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      return NextResponse.json({ workflow: { id: doc.id, ...doc.data() } });
    } else {
      // List all workflows
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('workflows')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      const workflows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ workflows });
    }
  } catch (error: unknown) {
    console.error('[studio/save-workflow] GET Error:', error);
    return NextResponse.json({ error: 'Failed to load workflow.' }, { status: 500 });
  }
}

// ── Delete a workflow ────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const workflowId = searchParams.get('workflowId');

    if (!userId || !workflowId) {
      return NextResponse.json({ error: 'userId and workflowId are required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('users').doc(userId).collection('workflows').doc(workflowId).delete();

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    console.error('[studio/save-workflow] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete workflow.' }, { status: 500 });
  }
}
