import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth, authErrorResponse } from '@/lib/verify-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/integrations/env-vars
 * Merge new env vars. Send only { KEY: value } for keys you want to set.
 * Empty string removes the key.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const updates = await req.json();
    if (typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const db = getAdminDb();
    const ref = db.collection('users').doc(auth.uid);
    const snap = await ref.get();
    const existing = (snap.data()?.envVars || {}) as Record<string, string>;
    const merged = { ...existing };
    for (const [k, v] of Object.entries(updates)) {
      const key = String(k).trim().toUpperCase().replace(/\s/g, '_');
      if (!key) continue;
      if (v === '' || v === null || v === undefined) delete merged[key];
      else merged[key] = String(v);
    }
    await ref.set({ envVars: merged, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
