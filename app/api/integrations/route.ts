import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth, authErrorResponse, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { getBusinessOsAccessForUid } from '@/lib/business-os/access-server';
import { getIntegrationDefinition, isIntegrationId } from '@/lib/integrations/registry';
import { encryptSecretsJson } from '@/lib/integrations/crypto';
import { buildMaskedPreview, validateIntegrationPayload } from '@/lib/integrations/validate';
import { testIntegrationConnection } from '@/lib/integrations/test-connection';
import type { IntegrationPublicState } from '@/lib/integrations/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function col(uid: string) {
  return getAdminDb().collection('users').doc(uid).collection('integrations');
}

/** GET — list integrations (no secrets) */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const access = await getBusinessOsAccessForUid(auth.uid);
    if (!access.allowed) {
      return NextResponse.json({ ok: true, integrations: [] as IntegrationPublicState[], planAllowsVault: false });
    }

    const snap = await col(auth.uid).get();
    const items: IntegrationPublicState[] = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id as IntegrationPublicState['id'],
        name: getIntegrationDefinition(d.id)?.name || d.id,
        category: getIntegrationDefinition(d.id)?.category || 'backend',
        status: x.status === 'error' ? 'error' : x.status === 'connected' ? 'connected' : 'not_connected',
        lastVerifiedAt: x.lastVerifiedAt?.toDate?.()?.toISOString?.() ?? null,
        lastError: typeof x.lastError === 'string' ? x.lastError : null,
        maskedFields: typeof x.maskedFields === 'object' && x.maskedFields ? x.maskedFields : {},
        featuresEnabled: Array.isArray(x.featuresEnabled) ? x.featuresEnabled : [],
        updatedAt: x.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });
    return NextResponse.json({ ok: true, integrations: items, planAllowsVault: true });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('integrations GET', e);
    return NextResponse.json({ error: 'Failed to load integrations' }, { status: 500 });
  }
}

/** POST — save secrets (encrypted) or test only */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const access = await getBusinessOsAccessForUid(auth.uid);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Business OS plan required.' }, { status: 403 });
    }

    const body = (await req.json()) as {
      action?: string;
      integrationId?: string;
      payload?: Record<string, string>;
    };
    const integrationId = body.integrationId?.trim();
    if (!integrationId || !isIntegrationId(integrationId)) {
      return NextResponse.json({ error: 'Invalid integrationId' }, { status: 400 });
    }
    const def = getIntegrationDefinition(integrationId);
    if (!def) return NextResponse.json({ error: 'Unknown integration' }, { status: 400 });

    const validated = validateIntegrationPayload(def, body.payload || {});
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    if (body.action === 'test') {
      const test = await testIntegrationConnection(integrationId, validated.data);
      return NextResponse.json({ ok: test.ok, message: test.message });
    }

    if (body.action !== 'save') {
      return NextResponse.json({ error: 'action must be save or test' }, { status: 400 });
    }

    let ciphertext: string;
    try {
      ciphertext = encryptSecretsJson(validated.data);
    } catch (err) {
      console.error('encrypt', err);
      return NextResponse.json(
        {
          error:
            'Server encryption not configured. Set INTEGRATIONS_ENCRYPTION_SECRET (24+ chars) in the environment.',
        },
        { status: 503 },
      );
    }

    const test = await testIntegrationConnection(integrationId, validated.data);
    const status = test.ok ? 'connected' : 'error';

    const maskedFields = buildMaskedPreview(def, validated.data);
    await col(auth.uid).doc(integrationId).set(
      {
        ciphertext,
        status,
        lastVerifiedAt: FieldValue.serverTimestamp(),
        lastError: test.ok ? null : test.message,
        maskedFields,
        featuresEnabled: def.activatesFeatures,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true,
      status,
      message: test.ok ? 'Saved and verified.' : `Saved but verification failed: ${test.message}`,
      maskedFields,
      featuresEnabled: def.activatesFeatures,
    });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('integrations POST', e);
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
  }
}

/** DELETE — revoke integration */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const access = await getBusinessOsAccessForUid(auth.uid);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Business OS plan required.' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('integrationId')?.trim();
    if (!id || !isIntegrationId(id)) {
      return NextResponse.json({ error: 'integrationId query required' }, { status: 400 });
    }
    await col(auth.uid).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
