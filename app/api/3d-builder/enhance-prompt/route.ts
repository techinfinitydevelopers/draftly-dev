import { NextRequest, NextResponse } from 'next/server';
import { generateApiEasyText } from '@/lib/api-easy-studio';
import { enforceStudioLimits, incrementStudioUsage } from '@/lib/studio-auth';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isOwnerEmail } from '@/lib/owner-emails';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import {
  getEnhancePromptCreditCost,
  getMaxPromptCharsForPlan,
  getPromptLengthTier,
} from '@/lib/builder-prompt-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, type = 'image', userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data() || {};
    let userEmail = (userData.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch {
        /* ignore */
      }
    }
    const isOwner = isOwnerEmail(userEmail);
    let subscription = (userData.subscription || { plan: 'free', status: 'active' }) as { plan: string };
    if (isTestingCreditsEmail(userEmail)) {
      subscription = { plan: 'testing' };
    }
    const plan = String(subscription.plan || 'free');
    const maxChars = getMaxPromptCharsForPlan(plan, isOwner);
    if (prompt.length > maxChars) {
      return NextResponse.json(
        { error: `Prompt is too long (maximum ${maxChars} characters for your plan).` },
        { status: 400 },
      );
    }

    const tier = getPromptLengthTier(plan, isOwner);
    const creditCost = getEnhancePromptCreditCost(prompt.length, tier);

    const auth = await enforceStudioLimits({ userId }, { creditCost });
    if (!auth.allowed) return auth.errorResponse!;
    if (
      auth.plan !== 'basic' &&
      auth.plan !== 'basic-plus' &&
      auth.plan !== 'pro' &&
      auth.plan !== 'premium' &&
      auth.plan !== 'tester' &&
      auth.plan !== 'testing'
    ) {
      return NextResponse.json(
        { error: 'Prompt enhancement is available on paid plans in 3D Builder.' },
        { status: 403 },
      );
    }

    const mode = type === 'video' ? 'video' : 'image';
    const instruction =
      mode === 'video'
        ? `You are a senior creative director. Rewrite this short animation prompt into a production-ready cinematic motion prompt for image-to-video generation.

Return ONLY the improved prompt text, no markdown, no explanations.

Include: camera movement direction, motion pacing (slow dolly, smooth pan), depth/parallax behavior, lighting mood, atmospheric effects (particles, fog, lens flare), and strict quality cues.
Keep the original intent and product identity unchanged.
Add: 8-second duration target, smooth loop potential, scroll-driven website background suitability.

Original prompt:
${prompt}`
        : `You are a senior creative director specializing in premium scroll-driven 3D marketing sites (Draftly: fixed background frame sequence + tall page). Rewrite this prompt into a production-ready creative brief for an AI single-file HTML builder.

Return ONLY the improved prompt text, no markdown, no explanations.

Your output must include:
1. Brand name (inferred or explicit)
2. Hero headline (5-8 words, punchy, premium — NOT a paragraph)
3. Color palette (specific hex codes for bg, primary, accent, text)
4. Typography (2 Google Fonts: display + body — avoid generic Inter/Roboto unless the user asked)
5. AT LEAST 5 named sections below the hero (e.g. capabilities, proof, story, offer, contact) — each with 2-3 sentences of concrete marketing copy tied to the business
6. Visual elements to generate: feature grid with icon concepts, stats row, one testimonial or quote, CTA band — so the page is not an empty hero
7. Design direction (glassmorphism, editorial, minimal, etc.) and CSS "3D" depth (hover tilt on cards, shadows) — NOT WebGL
8. Animation notes (scroll-reveal, stagger, hero fade tied to frame scrub)

Keep the original intent, product identity, and business details unchanged.
Elevate generic descriptions into specific, conversion-focused copy.
Never output placeholder text or lorem ipsum.

Original prompt:
${prompt}`;

    const enhanced = await generateApiEasyText({
      prompt: instruction,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 1200,
    });

    await incrementStudioUsage(userId, 'image', creditCost);

    return NextResponse.json({ enhancedPrompt: enhanced.trim(), creditsUsed: creditCost });
  } catch (error: any) {
    console.error('3D Builder prompt enhancement error:', error);
    const safeMessage = 'Our AI backend had an issue while improving your prompt. Please try again in a moment.';
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
