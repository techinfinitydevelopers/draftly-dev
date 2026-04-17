import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth, authErrorResponse } from '@/lib/verify-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/integrations/status
 * Returns integration status (GitHub, env var keys) for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const db = getAdminDb();
    const doc = await db.collection('users').doc(auth.uid).get();
    const d = doc.data() || {};
    const envVars = d.envVars || {};
    return NextResponse.json({
      githubConnected: !!d.githubAccessToken,
      githubUsername: d.githubUsername || '',
      envKeys: Object.keys(envVars),
      enabledKits: Array.isArray(d.enabledKits) ? d.enabledKits : [],
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
