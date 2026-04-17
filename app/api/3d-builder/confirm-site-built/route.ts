import { NextRequest, NextResponse } from 'next/server';
import { incrementBuilderUsage } from '@/lib/studio-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Call this when the user has successfully reached step 5 (Website Ready)
 * after an initial build. Increments fullAppsGenerated so the monthly
 * "sites built" limit counts only completed sites, not failed/abandoned attempts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await incrementBuilderUsage(userId, { sites3D: 1 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[confirm-site-built] Error:', err);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
