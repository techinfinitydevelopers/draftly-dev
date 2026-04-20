/**
 * GET /api/support/check-subscription?email=...&grant=pro
 *
 * Owner-only: Check subscription status for a user by email.
 * If grant=basic|basic-plus|pro|premium|tester, update their subscription.
 * Use: Authorization: Bearer <Firebase ID token>
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isOwnerEmail } from '@/lib/owner-emails';
import { tryVerifyAuth } from '@/lib/verify-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  tester: 200,
  basic: 1500,
  'basic-plus': 2500,
  pro: 6000,
  premium: 25000,
  agency: 125000,
};

export async function GET(req: NextRequest) {
  try {
    const auth = await tryVerifyAuth(req);
    if (!auth?.uid || !auth.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isOwnerEmail(auth.email)) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const grant = searchParams.get('grant')?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'email query param required' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();

    const db = getAdminDb();

    // Find Firebase Auth user by email (handles multiple accounts)
    let authUsers: { uid: string; email?: string }[] = [];
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      authUsers = [{ uid: userRecord.uid, email: userRecord.email }];
    } catch (e: any) {
      if (e?.code === 'auth/user-not-found') {
        // Fallback: check Firestore for users with this email
        const usersSnap = await db.collection('users').where('email', '==', email).limit(5).get();
        if (!usersSnap.empty) {
          const results: Array<{ uid: string; subscription: unknown; generationTracking?: unknown; updated?: boolean }> = [];
          for (const docSnap of usersSnap.docs) {
            const uid = docSnap.id;
            const data = docSnap.data();
            const sub = (data?.subscription || {}) as Record<string, unknown>;
            const userRef = db.collection('users').doc(uid);
            let updated = false;
            if (grant && ['basic', 'basic-plus', 'pro', 'premium', 'agency', 'tester'].includes(grant)) {
              const limits = PLAN_LIMITS[grant] ?? PLAN_LIMITS.pro;
              const now = new Date().toISOString();
              const existingTracking = (data?.generationTracking || {}) as Record<string, unknown>;
              await userRef.set(
                {
                  email,
                  subscription: {
                    plan: grant,
                    status: 'active',
                    generationsUsed: sub.generationsUsed ?? 0,
                    generationsLimit: limits,
                    startDate: sub.startDate || now,
                    endDate: null,
                    updatedAt: now,
                  },
                  generationTracking: {
                    ...existingTracking,
                    creditsUsed: 0,
                    chatsUsed: 0,
                    lastResetDate: now,
                  },
                  updatedAt: now,
                },
                { merge: true }
              );
              updated = true;
            }
            const finalDoc = updated ? (await userRef.get()).data() : data;
            results.push({
              uid,
              subscription: finalDoc?.subscription,
              generationTracking: finalDoc?.generationTracking,
              updated,
            });
          }
          return NextResponse.json({
            found: 'firestore_only',
            message: 'User not in Firebase Auth but has Firestore doc(s). Subscription updated if grant was provided.',
            email,
            accounts: results,
            grant: grant || null,
          });
        }
        return NextResponse.json({
          found: false,
          message: 'No user found with this email in Firebase Auth or Firestore.',
        });
      }
      throw e;
    }

    const results: Array<{
      uid: string;
      email?: string;
      subscription: unknown;
      generationTracking?: unknown;
      updated?: boolean;
    }> = [];

    for (const au of authUsers) {
      const userRef = db.collection('users').doc(au.uid);
      const userDoc = await userRef.get();
      const data = userDoc.exists ? userDoc.data() : null;
      const sub = (data?.subscription || {}) as Record<string, unknown>;
      const currentPlan = String(sub.plan || 'free').toLowerCase();
      const currentStatus = String(sub.status || 'active').toLowerCase();

      let updated = false;
      if (grant && ['basic', 'basic-plus', 'pro', 'premium', 'agency', 'tester'].includes(grant)) {
        const limits = PLAN_LIMITS[grant] ?? PLAN_LIMITS.pro;
        const now = new Date().toISOString();
        const existingTracking = (data?.generationTracking || {}) as Record<string, unknown>;
        await userRef.set(
          {
            email: email,
            subscription: {
              plan: grant,
              status: 'active',
              generationsUsed: sub.generationsUsed ?? 0,
              generationsLimit: limits,
              startDate: sub.startDate || now,
              endDate: null,
              updatedAt: now,
            },
            generationTracking: {
              ...existingTracking,
              creditsUsed: 0,
              chatsUsed: 0,
              lastResetDate: now,
            },
            updatedAt: now,
          },
          { merge: true }
        );
        updated = true;
      }

      const finalDoc = updated ? (await userRef.get()).data() : data;
      results.push({
        uid: au.uid,
        email: au.email,
        subscription: finalDoc?.subscription,
        generationTracking: finalDoc?.generationTracking,
        updated,
      });
    }

    return NextResponse.json({
      found: true,
      email,
      accounts: results,
      grant: grant || null,
    });
  } catch (error: any) {
    console.error('[check-subscription] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Check failed' },
      { status: 500 }
    );
  }
}
