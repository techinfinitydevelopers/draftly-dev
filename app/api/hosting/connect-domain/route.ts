/**
 * POST /api/hosting/connect-domain
 *
 * Saves a custom domain mapping to Firestore with status "pending".
 * DNS is NOT verified here — use GET /api/hosting/verify-domain for that.
 *
 * Flow:
 *  1. Auth check
 *  2. Validate domain format
 *  3. Check domain not already claimed by another user
 *  4. Write Firestore: domains/{domain} = { uid, projectId, status: 'pending', createdAt }
 *  5. Return DNS instructions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VPS_IP = '142.93.218.64';

function isValidDomain(domain: string): boolean {
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain.toLowerCase());
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

    // --- Body ---
    const body = await req.json().catch(() => ({})) as { domain?: string; projectId?: string };
    const domain = body.domain?.trim().toLowerCase().replace(/^www\./, '');
    const { projectId } = body;

    if (!domain || !isValidDomain(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // --- Verify project belongs to this user ---
    const projectDoc = await db
      .collection('users')
      .doc(uid)
      .collection('3dProjects')
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // --- Check domain not already claimed by another user ---
    const existingDoc = await db.collection('domains').doc(domain).get();
    if (existingDoc.exists) {
      const existing = existingDoc.data() as { uid?: string };
      if (existing.uid !== uid) {
        return NextResponse.json(
          { error: 'This domain is already connected to another project.' },
          { status: 409 },
        );
      }
    }

    // --- Save to Firestore as pending ---
    await db.collection('domains').doc(domain).set({
      uid,
      projectId,
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      domain,
      dnsInstructions: {
        type: 'A',
        name: '@',
        value: VPS_IP,
        ttl: 'Auto',
      },
    });
  } catch (e) {
    console.error('[hosting/connect-domain]', e);
    const msg = e instanceof Error ? e.message : 'Failed to connect domain';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
