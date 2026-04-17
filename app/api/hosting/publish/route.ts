/**
 * POST /api/hosting/publish
 *
 * Publishes a 3D project to a free Draftly subdomain.
 * - Checks project exists and belongs to the user
 * - Auto-assigns a subdomain (projectId-based, slug-safe)
 * - Writes to Firestore: projects/{projectId} + subdomains/{subdomain}
 * - Returns the assigned subdomain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROJECTS_COLLECTION = '3dProjects';

/** Convert a string to a URL-safe slug */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, ''); // trim trailing dash after slice
}

/** Check if a subdomain is already taken in Firestore */
async function isSubdomainTaken(db: FirebaseFirestore.Firestore, subdomain: string): Promise<boolean> {
  const doc = await db.collection('subdomains').doc(subdomain).get();
  return doc.exists;
}

/** Find an available subdomain, appending numbers if needed */
async function assignSubdomain(
  db: FirebaseFirestore.Firestore,
  uid: string,
  projectId: string,
  projectName: string,
): Promise<string> {
  // Check if this project already has a subdomain assigned
  const existingDoc = await db.collection('projects').doc(projectId).get();
  if (existingDoc.exists) {
    const data = existingDoc.data() as { subdomain?: string };
    if (data?.subdomain) return data.subdomain;
  }

  const base = toSlug(projectName || projectId);
  let candidate = base;
  let attempt = 0;

  while (await isSubdomainTaken(db, candidate)) {
    attempt++;
    candidate = `${base}-${attempt}`;
    if (attempt > 99) {
      // Fallback to projectId-based slug
      candidate = toSlug(projectId);
      break;
    }
  }

  return candidate;
}

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // --- Parse body ---
    const body = await req.json().catch(() => ({})) as { projectId?: string };
    const { projectId } = body;
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // --- Verify project belongs to this user ---
    const projectDoc = await db
      .collection('users')
      .doc(uid)
      .collection(PROJECTS_COLLECTION)
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data() as {
      name?: string;
      wasabiPath?: string;
      siteCodePath?: string;
    };

    if (!projectData.wasabiPath && !projectData.siteCodePath) {
      return NextResponse.json(
        { error: 'Project has no uploaded files yet. Save your project first.' },
        { status: 400 },
      );
    }

    // --- Assign subdomain ---
    const subdomain = await assignSubdomain(db, uid, projectId, projectData.name || projectId);

    const wasabiPath = projectData.wasabiPath || `users/${uid}/projects/${projectId}/`;

    // --- Write to Firestore ---
    const batch = db.batch();

    // Top-level projects collection (read by hosting server)
    batch.set(
      db.collection('projects').doc(projectId),
      {
        uid,
        projectId,
        name: projectData.name || 'Untitled',
        subdomain,
        wasabiPath,
        isPublished: true,
        customDomain: null,
        publishedAt: new Date(),
      },
    );

    // Top-level subdomains collection (read by hosting server)
    batch.set(
      db.collection('subdomains').doc(subdomain),
      {
        uid,
        projectId,
        createdAt: new Date(),
      },
    );

    await batch.commit();

    return NextResponse.json({
      ok: true,
      subdomain,
      url: `https://${subdomain}${process.env.NEXT_PUBLIC_SUBDOMAIN_SUFFIX || '.draftly.space'}`,
    });
  } catch (e) {
    console.error('[hosting/publish]', e);
    const msg = e instanceof Error ? e.message : 'Publish failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
