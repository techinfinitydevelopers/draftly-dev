import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { decryptSecretsJson } from '@/lib/integrations/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const db = getAdminDb();
    const intSnap = await db.collection('users').doc(auth.uid).collection('integrations').get();

    const intDocs = Object.fromEntries(intSnap.docs.map(d => [d.id, d.data()]));
    let revenue30dCents = 0;
    let connectedCount = 0;

    for (const doc of intSnap.docs) {
      if (doc.data()?.status === 'connected') connectedCount++;
    }

    if (intDocs.stripe?.status === 'connected' && intDocs.stripe?.ciphertext) {
      try {
        const secrets = decryptSecretsJson(intDocs.stripe.ciphertext);
        if (secrets.secretKey) {
          const res = await fetch('https://api.stripe.com/v1/charges?limit=100', {
            headers: { Authorization: `Bearer ${secrets.secretKey}` },
          });
          if (res.ok) {
            const data = await res.json();
            revenue30dCents = (data.data || [])
              .filter((c: { paid: boolean }) => c.paid)
              .reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);
          }
        }
      } catch { /* ignore stripe errors in overview */ }
    }

    return NextResponse.json({
      ok: true,
      metrics: {
        connectedIntegrations: connectedCount,
        revenue30dCents,
        stripeConnected: intDocs.stripe?.status === 'connected',
        ga4Connected: intDocs.google_analytics?.status === 'connected',
        metaPixelConnected: intDocs.meta_pixel?.status === 'connected',
        vercelConnected: intDocs.vercel?.status === 'connected',
        githubConnected: intDocs.github?.status === 'connected',
        firebaseConnected: intDocs.firebase?.status === 'connected',
        supabaseConnected: intDocs.supabase?.status === 'connected',
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({
        ok: true,
        metrics: { connectedIntegrations: 0, revenue30dCents: 0 },
      });
    }
    return NextResponse.json({ ok: false, error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
