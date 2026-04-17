import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth, authErrorResponse } from '@/lib/verify-auth';
import type { IntegrationKitId } from '@/lib/integration-kits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/integrations/kits
 * Body: { enabledKits: string[] }
 * Stores enabled kit IDs for scaffolding into generated projects.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const body = await req.json().catch(() => ({}));
    const enabledKitsRaw = Array.isArray(body?.enabledKits) ? body.enabledKits : [];
    const enabledKits = enabledKitsRaw
      .map((x: unknown) => String(x).trim().toLowerCase())
      .filter(Boolean) as IntegrationKitId[];

    const db = getAdminDb();
    await db.collection('users').doc(auth.uid).set(
      {
        enabledKits,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, enabledKits });
  } catch (err) {
    return authErrorResponse(err);
  }
}

