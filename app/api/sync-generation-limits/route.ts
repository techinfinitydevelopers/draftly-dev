import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { resetMonthlyCountsIfNeeded } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/sync-generation-limits?userId=...
 *
 * Runs billing-cycle reset logic and persists if needed.
 * Called when user loads Full App Builder so Firestore gets updated limits
 * and the "limit reached" gate doesn't show stale data from a previous month.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    const userRef = getAdminDb().collection('users').doc(userId);
    const subscription = userData?.subscription || { plan: 'free', status: 'inactive' };
    const generationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      uiPreviewsGenerated: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    const originalLastReset = (generationTracking.lastResetDate as string) || '';
    const reset = resetMonthlyCountsIfNeeded(generationTracking, subscription);

    if (reset.lastResetDate !== originalLastReset) {
      await userRef.set(
        {
          generationTracking: reset,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      fullAppsGenerated: reset.fullAppsGenerated,
      lastResetDate: reset.lastResetDate,
    });
  } catch (error: unknown) {
    console.error('[sync-generation-limits] Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
