/**
 * POST /api/hosting/connect-domain
 *
 * Verifies DNS and saves a custom domain mapping to Firestore.
 * Flow:
 *  1. Auth check
 *  2. Validate domain format
 *  3. DNS lookup — CNAME must point to customers.prodevelopers.in
 *  4. On success → write Firestore: domains/{domain} + projects/{projectId}.customDomain
 */

import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CNAME_TARGET = 'customers.prodevelopers.in';

function isValidDomain(domain: string): boolean {
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain.toLowerCase());
}

async function checkCname(domain: string): Promise<{ ok: boolean; found: string | null }> {
  try {
    const addresses = await dns.resolveCname(domain);
    const found = addresses[0]?.replace(/\.$/, '').toLowerCase() ?? null;
    const ok = found === CNAME_TARGET.toLowerCase();
    return { ok, found };
  } catch {
    return { ok: false, found: null };
  }
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
    const existingDomain = await db.collection('domains').doc(domain).get();
    if (existingDomain.exists) {
      const existing = existingDomain.data() as { uid?: string; projectId?: string };
      if (existing.uid !== uid) {
        return NextResponse.json(
          { error: 'This domain is already connected to another project.' },
          { status: 409 },
        );
      }
    }

    // --- DNS verification ---
    const { ok, found } = await checkCname(domain);
    if (!ok) {
      return NextResponse.json(
        {
          error: 'DNS verification failed',
          detail: found
            ? `CNAME points to "${found}" instead of "${CNAME_TARGET}"`
            : `No CNAME record found for "${domain}". Add a CNAME record pointing to "${CNAME_TARGET}" and try again.`,
          cnameTarget: CNAME_TARGET,
        },
        { status: 422 },
      );
    }

    // --- Write to Firestore ---
    const batch = db.batch();

    batch.set(db.collection('domains').doc(domain), {
      uid,
      projectId,
      verifiedAt: new Date(),
    });

    batch.set(
      db.collection('projects').doc(projectId),
      { customDomain: domain },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({ ok: true, domain, url: `https://${domain}` });
  } catch (e) {
    console.error('[hosting/connect-domain]', e);
    const msg = e instanceof Error ? e.message : 'Failed to connect domain';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
