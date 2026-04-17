import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, DODO_PRODUCT_IDS } from '@/lib/dodo';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/dodo/create-checkout
 *
 * Body: { plan: 'basic' | 'basic-plus' | 'pro' | 'premium', email: string, name?: string, userId?: string }
 * Agency / $1,000 tier is no longer sold; legacy subscribers keep plan in Firestore.
 * Returns: { checkout_url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, email, name, userId } = body;

    if (!plan || !email) {
      return NextResponse.json({ error: 'plan and email are required' }, { status: 400 });
    }

    // Pre-create/ensure user doc so webhook can find and update it when payment completes
    if (typeof userId === 'string' && userId) {
      await ensureUserDocument(userId);
      const db = getAdminDb();
      await db.collection('users').doc(userId).set(
        { email: email.toLowerCase().trim(), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    const productId = DODO_PRODUCT_IDS[plan as keyof typeof DODO_PRODUCT_IDS];
    if (!productId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Build the return URL (back to the site after checkout)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const returnUrl = `${origin}/pricing?checkout=success`;

    const session = await createCheckoutSession({
      productId,
      customerEmail: email.toLowerCase(),
      customerName: name || undefined,
      returnUrl,
      metadata: {
        plan,
        userEmail: email.toLowerCase(),
        ...(typeof userId === 'string' && userId ? { userId } : {}),
      },
    });

    return NextResponse.json({
      checkout_url: session.checkout_url,
      session_id: session.session_id,
    });
  } catch (error: unknown) {
    console.error('[dodo/create-checkout] Error:', error);
    return NextResponse.json({ error: 'Checkout unavailable. Please try again.' }, { status: 500 });
  }
}
