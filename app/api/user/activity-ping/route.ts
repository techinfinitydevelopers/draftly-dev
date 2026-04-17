import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth, authErrorResponse, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One browser tab session = at most one increment to `activity.sessionCount`.
 * Updates `activity.lastSeenAt` every call (throttle on client).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    await ensureUserDocument(auth.uid);

    let body: { clientSessionId?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* empty body ok */
    }

    const raw = typeof body.clientSessionId === 'string' ? body.clientSessionId : '';
    const sid = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    if (!sid) {
      return NextResponse.json({ error: 'clientSessionId required' }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(auth.uid);
    const sessRef = userRef.collection('activitySessions').doc(sid);

    await db.runTransaction(async (tx) => {
      const sess = await tx.get(sessRef);
      if (sess.exists) {
        tx.update(userRef, {
          'activity.lastSeenAt': FieldValue.serverTimestamp(),
        });
        return;
      }
      tx.set(sessRef, { createdAt: FieldValue.serverTimestamp() });
      tx.update(userRef, {
        'activity.lastSeenAt': FieldValue.serverTimestamp(),
        'activity.sessionCount': FieldValue.increment(1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('[activity-ping]', e);
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 });
  }
}
