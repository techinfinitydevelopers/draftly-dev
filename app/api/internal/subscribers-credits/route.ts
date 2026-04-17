import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { PLAN_LIMITS } from '@/lib/subscription-plans';
import { BUILDER_MEDIA_LIMITS } from '@/lib/studio-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PlanKey = keyof typeof PLAN_LIMITS;

function creditsTotalForUser(plan: string, customStudioCredits: unknown): number {
  const limits = PLAN_LIMITS[plan as PlanKey] || PLAN_LIMITS.free;
  const custom =
    typeof customStudioCredits === 'number' && Number.isFinite(customStudioCredits) && customStudioCredits > 0
      ? Math.floor(customStudioCredits)
      : null;
  return custom ?? limits.credits;
}

function mediaLimitsForPlan(plan: string): { images: number; videos: number } | null {
  return BUILDER_MEDIA_LIMITS[plan] ?? (plan !== 'free' ? BUILDER_MEDIA_LIMITS.premium : null);
}

/**
 * GET /api/internal/subscribers-credits?secret=ADMIN_SECRET_KEY&limit=500
 * Header alternative: x-admin-secret: ADMIN_SECRET_KEY
 *
 * Returns active subscribers (Firestore users where subscription.status === 'active')
 * with credits used/remaining and 3D Builder image/video counts vs monthly caps.
 * Requires ADMIN_SECRET_KEY in env (see .env.example).
 */
export async function GET(req: NextRequest) {
  const configured = process.env.ADMIN_SECRET_KEY;
  if (!configured) {
    return NextResponse.json({ error: 'ADMIN_SECRET_KEY is not configured' }, { status: 503 });
  }

  const headerSecret = req.headers.get('x-admin-secret');
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');
  const provided = headerSecret || querySecret;
  if (!provided || provided !== configured) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = url.searchParams.get('limit');
  const maxDocs = Math.min(2000, Math.max(1, parseInt(limitParam || '500', 10) || 500));

  try {
    const db = getAdminDb();
    const snap = await db.collection('users').where('subscription.status', '==', 'active').limit(maxDocs).get();

    const rows = snap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      const email = String(d.email || '');
      const sub = (d.subscription || {}) as Record<string, unknown>;
      const plan = String(sub.plan || 'free').toLowerCase();
      const gt = (d.generationTracking || {}) as Record<string, unknown>;
      const creditsUsed = Number(gt.creditsUsed) || 0;
      const total = creditsTotalForUser(plan, sub.customStudioCredits);
      const remaining = Math.max(0, total - creditsUsed);
      const imgUsed = Number(gt.builderImageGenerations) || 0;
      const vidUsed = Number(gt.builderVideoGenerations) || 0;
      const media = mediaLimitsForPlan(plan);

      return {
        uid: doc.id,
        email: email || null,
        plan,
        creditsTotal: total,
        creditsUsed,
        creditsRemaining: remaining,
        builderImagesUsed: imgUsed,
        builderVideosUsed: vidUsed,
        builderImagesLimit: media?.images ?? null,
        builderVideosLimit: media?.videos ?? null,
        sites3DGenerated: Number(gt.sites3DGenerated) || 0,
        chatsUsed: Number(gt.chatsUsed) || 0,
      };
    });

    rows.sort((a, b) => b.creditsUsed - a.creditsUsed);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      note:
        'Image/video caps apply only to /api/3d-builder/generate-bg and generate-video (plus credits). Site code generation uses credits only.',
      topByCreditsUsed: rows.slice(0, 100),
      subscribers: rows,
    });
  } catch (e) {
    console.error('[internal/subscribers-credits]', e);
    const message = e instanceof Error ? e.message : 'Query failed';
    return NextResponse.json(
      {
        error: message,
        hint: 'If Firestore needs an index, create the single-field index for subscription.status',
      },
      { status: 500 },
    );
  }
}
