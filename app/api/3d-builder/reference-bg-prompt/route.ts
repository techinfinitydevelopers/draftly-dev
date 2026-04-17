import { NextRequest, NextResponse } from 'next/server';
import { generateApiEasyReferenceBrief } from '@/lib/api-easy-studio';
import { enforceStudioLimits } from '@/lib/studio-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Vision-derived background prompt from reference image(s) for step 1 → describe → generate-bg.
 * Does not charge builder image credits (brief only); still requires a paid builder plan.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, images } = body as { userId?: string; images?: string[] };

    const auth = await enforceStudioLimits({ userId }, { creditCost: 0 });
    if (!auth.allowed) return auth.errorResponse!;

    const plan = auth.plan || 'free';
    if (
      plan !== 'basic' &&
      plan !== 'basic-plus' &&
      plan !== 'pro' &&
      plan !== 'premium' &&
      plan !== 'tester' &&
      plan !== 'testing'
    ) {
      return NextResponse.json(
        { error: '3D Builder requires a paid plan. Upgrade to Basic ($25/mo) or higher.' },
        { status: 403 },
      );
    }

    const urls = Array.isArray(images)
      ? images.map((u) => String(u || '')).filter((u) => u.startsWith('data:image/')).slice(0, 4)
      : [];

    if (!urls.length) {
      return NextResponse.json({ error: 'Add at least one reference image.' }, { status: 400 });
    }

    const brief = await generateApiEasyReferenceBrief(urls);
    const trimmed = brief.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Could not read those images. Try another file or format.' }, { status: 422 });
    }

    const prompt = [
      'Create a cinematic full-bleed hero background that matches the reference look below: preserve product identity, materials, lighting mood, palette, and composition intent.',
      'Premium, immersive, web-ready; no text, logos, or watermarks in-frame.',
      '\nReference analysis:\n',
      trimmed,
    ].join(' ');

    return NextResponse.json({ prompt: prompt.slice(0, 8000) });
  } catch (error: unknown) {
    console.error('reference-bg-prompt error:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to build prompt from references' },
      { status: 500 },
    );
  }
}
