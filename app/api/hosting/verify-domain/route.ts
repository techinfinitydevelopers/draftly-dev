/**
 * GET /api/hosting/verify-domain?domain=myportfolio.com&projectId=xxx
 *
 * Checks if domain's A record points to our VPS (167.71.239.126).
 * On success → updates Firestore:
 *   domains/{domain}: { status: 'verified', verifiedAt }
 *   projects/{projectId}: { customDomain: domain }
 */

import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VPS_IP = '167.71.239.126';

export async function GET(req: NextRequest) {
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

    const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase().replace(/^www\./, '');
    const projectId = req.nextUrl.searchParams.get('projectId')?.trim();

    if (!domain) {
      return NextResponse.json({ error: 'domain query param required' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId query param required' }, { status: 400 });
    }

    const db = getAdminDb();

    // --- Verify this domain belongs to this user ---
    const domainDoc = await db.collection('domains').doc(domain).get();
    if (!domainDoc.exists) {
      return NextResponse.json({ error: 'Domain not registered. Connect it first.' }, { status: 404 });
    }
    const domainData = domainDoc.data() as { uid?: string; projectId?: string; status?: string };
    if (domainData.uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // --- Already verified? ---
    if (domainData.status === 'verified') {
      return NextResponse.json({ verified: true, message: 'Domain already verified and live.' });
    }

    // --- DNS A record check ---
    let addresses: string[] = [];
    try {
      addresses = await dns.resolve4(domain);
    } catch {
      return NextResponse.json({
        verified: false,
        message: 'DNS propagation pending. No A record found yet — try again in a few minutes.',
      });
    }

    const verified = addresses.includes(VPS_IP);

    if (!verified) {
      return NextResponse.json({
        verified: false,
        message: `A record points to ${addresses[0] || 'unknown'} instead of ${VPS_IP}. Update your DNS and try again.`,
      });
    }

    // --- Update Firestore ---
    const batch = db.batch();

    batch.update(db.collection('domains').doc(domain), {
      status: 'verified',
      verifiedAt: new Date(),
    });

    batch.set(
      db.collection('projects').doc(domainData.projectId || projectId),
      { customDomain: domain },
      { merge: true },
    );

    // Also save customDomain in user's 3dProjects subcollection so UI can read it
    batch.set(
      db.collection('users').doc(uid).collection('3dProjects').doc(domainData.projectId || projectId),
      { customDomain: domain },
      { merge: true },
    );

    // Mark user hosting as active so VPS serves the custom domain
    batch.set(
      db.collection('users').doc(uid),
      { hostingStatus: 'active' },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({
      verified: true,
      message: `Your site is live at https://${domain}`,
    });
  } catch (e) {
    console.error('[hosting/verify-domain]', e);
    const msg = e instanceof Error ? e.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
