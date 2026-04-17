import { NextRequest, NextResponse } from 'next/server';
import {
  cancelDodoSubscriptionAtPeriodEnd,
  findDodoSubscriptionForUser,
  retrieveDodoSubscription,
} from '@/lib/dodo';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/dodo/cancel-subscription
 *
 * Body: { userId: string }
 * Cancels at period end (does NOT revoke access immediately).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const subscription = (userData.subscription || {}) as Record<string, unknown>;
    const plan = String(subscription.plan || 'free');
    let dodoSubscriptionId = String(subscription.dodoSubscriptionId || '');
    const email = String(userData.email || '');

    if (['free', 'tester'].includes(plan)) {
      return NextResponse.json({ error: 'No active paid subscription found' }, { status: 400 });
    }

    // Backward-compatibility: link legacy paid users to their Dodo subscription.
    if (!dodoSubscriptionId) {
      const matched = await findDodoSubscriptionForUser({
        userId,
        email,
      });

      if (matched?.subscription_id) {
        dodoSubscriptionId = matched.subscription_id;
        await userRef.set(
          {
            subscription: {
              dodoSubscriptionId: matched.subscription_id,
              dodoCustomerId: matched.customer?.customer_id || null,
              dodoProductId: matched.product_id || null,
              startDate: subscription.startDate || matched.previous_billing_date || matched.created_at || null,
              endDate: matched.next_billing_date || subscription.endDate || null,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
    }

    if (!dodoSubscriptionId) {
      return NextResponse.json(
        { error: 'Could not find linked Dodo subscription for this paid user.' },
        { status: 404 },
      );
    }

    const updated = await cancelDodoSubscriptionAtPeriodEnd(dodoSubscriptionId);

    // Retrieve latest details to get next billing date reliably.
    const latest = await retrieveDodoSubscription(dodoSubscriptionId);
    const now = new Date().toISOString();
    const effectiveEndDate = latest.next_billing_date || String(subscription.endDate || '');

    await userRef.set(
      {
        subscription: {
          cancelAtPeriodEnd: true,
          cancelRequestedAt: now,
          endDate: effectiveEndDate || null,
        },
        updatedAt: now,
      },
      { merge: true },
    );

    return NextResponse.json({
      success: true,
      subscriptionId: updated.subscription_id,
      cancelAtPeriodEnd: updated.cancel_at_next_billing_date,
      endDate: effectiveEndDate || null,
      message: 'Subscription cancellation scheduled at period end.',
    });
  } catch (error) {
    console.error('[dodo/cancel-subscription] Error:', error);
    return NextResponse.json(
      { error: 'Unable to cancel subscription right now. Please try again.' },
      { status: 500 },
    );
  }
}
