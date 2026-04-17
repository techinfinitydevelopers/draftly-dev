import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth, authErrorResponse, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { getBusinessOsAccessForUid } from '@/lib/business-os/access-server';
import { decryptSecretsJson } from '@/lib/integrations/crypto';
import { getIntegrationDefinition, isIntegrationId } from '@/lib/integrations/registry';
import { testIntegrationConnection } from '@/lib/integrations/test-connection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST { integrationId } — re-test stored credentials without re-posting keys.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const access = await getBusinessOsAccessForUid(auth.uid);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Business OS plan required.' }, { status: 403 });
    }

    const body = (await req.json()) as { integrationId?: string };
    const integrationId = body.integrationId?.trim();
    if (!integrationId || !isIntegrationId(integrationId)) {
      return NextResponse.json({ error: 'Invalid integrationId' }, { status: 400 });
    }

    const ref = getAdminDb().collection('users').doc(auth.uid).collection('integrations').doc(integrationId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Integration not connected.' }, { status: 404 });
    }
    const data = snap.data();
    const ciphertext = typeof data?.ciphertext === 'string' ? data.ciphertext : '';
    if (!ciphertext) {
      return NextResponse.json({ error: 'No stored credentials.' }, { status: 400 });
    }

    let secrets: Record<string, string>;
    try {
      secrets = decryptSecretsJson(ciphertext);
    } catch {
      return NextResponse.json({ error: 'Could not decrypt stored secrets (server key changed?).' }, { status: 500 });
    }

    const test = await testIntegrationConnection(integrationId, secrets);
    const status = test.ok ? 'connected' : 'error';
    await ref.set(
      {
        status,
        lastVerifiedAt: FieldValue.serverTimestamp(),
        lastError: test.ok ? null : test.message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: test.ok, message: test.message, status });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('integrations/test', e);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
