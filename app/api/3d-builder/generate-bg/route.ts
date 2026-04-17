import { NextRequest, NextResponse } from 'next/server';
import { wrapImagePrompt, BUILDER_IMAGE_MODELS, BUILDER_FIXED_IMAGE_MODEL_ID } from '@/lib/builder-display-models';
import { generateApiEasyImage, generateApiEasyReferenceBrief } from '@/lib/api-easy-studio';
import { enforceStudioLimits, enforceBuilderMediaLimits, incrementBuilderUsage } from '@/lib/studio-auth';
import { getMaxPromptCharsForPlan } from '@/lib/builder-prompt-limits';
import {
    getImageCreditCost,
    canUseStudioHighResolution,
    IMAGE_MODELS,
} from '@/lib/model-router';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

type UserAsset = {
    id?: string;
    name?: string;
    dataUrl?: string;
};

function mapTierToImageSizeHint(tier: '1K' | '2K'): string {
    if (tier === '2K') return '2K output, high detail';
    return '1K output, sharp and web-ready';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            prompt,
            aspectRatio,
            buildTarget,
            userId,
            userAssets,
            displayImageModelId: rawModelId,
            imageResolution: rawImageRes,
        } = body as Record<string, unknown>;

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
        }
        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const displayImageId =
            typeof rawModelId === 'string' && BUILDER_IMAGE_MODELS.some((m) => m.id === rawModelId)
                ? rawModelId
                : BUILDER_FIXED_IMAGE_MODEL_ID;

        let resTier: '1K' | '2K' =
            typeof rawImageRes === 'string' && ['1K', '2K', '4K'].includes(String(rawImageRes).toUpperCase())
                ? (String(rawImageRes).toUpperCase() === '4K' ? '2K' : (String(rawImageRes).toUpperCase() as '1K' | '2K'))
                : '1K';

        const creditCost = getImageCreditCost(displayImageId, resTier);
        const auth = await enforceStudioLimits({ userId }, { creditCost });
        if (!auth.allowed) return auth.errorResponse!;
        if (auth.plan !== 'basic' && auth.plan !== 'basic-plus' && auth.plan !== 'pro' && auth.plan !== 'premium' && auth.plan !== 'tester' && auth.plan !== 'testing') {
            return NextResponse.json(
                { error: '3D Builder image generation requires a paid plan. Upgrade to Basic ($25/mo) or higher.' },
                { status: 403 },
            );
        }

        const plan = auth.plan || 'free';
        if (resTier === '2K' && !canUseStudioHighResolution(plan)) {
            return NextResponse.json(
                { error: '2K images require Premium ($200/mo) or Agency ($1,000/mo).' },
                { status: 403 },
            );
        }
        const mediaCheck = await enforceBuilderMediaLimits(userId, 'image');
        if (!mediaCheck.allowed) return mediaCheck.errorResponse!;

        const maxPromptChars = getMaxPromptCharsForPlan(auth.plan || 'basic', false);
        if (prompt.length > maxPromptChars) {
            return NextResponse.json(
                { error: `Prompt is too long (maximum ${maxPromptChars} characters for your plan).` },
                { status: 400 },
            );
        }

        const imageDef = IMAGE_MODELS.find((m) => m.id === displayImageId);
        if (!imageDef) {
            return NextResponse.json({ error: 'Unsupported image model for 3D Builder.' }, { status: 400 });
        }

        const selectedAspect: '16:9' | '9:16' | '1:1' =
            aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9';
        const orientationText =
            selectedAspect === '9:16'
                ? 'PORTRAIT 9:16 orientation for mobile-first hero'
                : selectedAspect === '1:1'
                  ? 'SQUARE 1:1 orientation for hero'
                  : 'LANDSCAPE 16:9 orientation for desktop-first hero';

        const referenceImages = Array.isArray(userAssets)
            ? (userAssets as UserAsset[])
                  .map((a) => String(a?.dataUrl || ''))
                  .filter((u) => u.startsWith('data:image/'))
                  .slice(0, 4)
            : [];

        let referenceBrief = '';
        if (referenceImages.length > 0) {
            try {
                referenceBrief = await generateApiEasyReferenceBrief(referenceImages);
            } catch (err) {
                console.warn('3D Builder reference analysis failed, continuing without brief:', err);
            }
        }

        const styledUser = wrapImagePrompt(prompt, displayImageId);
        const sizeHint = mapTierToImageSizeHint(resTier);
        const basePrompt = `Create a stunning, cinematic, high-quality 3D background image in ${orientationText}. ${sizeHint}. The image should feel immersive and premium for an interactive website. Target: ${buildTarget || 'desktop'}.

${styledUser}
${referenceBrief ? `\nReference product/style brief (must preserve product identity and materials):\n${referenceBrief}` : ''}
${referenceImages.length ? '\nMatch the uploaded reference product visual identity (shape/material/logo/colors) while improving scene quality and composition.' : ''}`;

        if (imageDef.provider !== 'api-easy' || !imageDef.apiEasyModel) {
            return NextResponse.json({ error: 'Unsupported image model for 3D Builder.' }, { status: 400 });
        }

        console.log('🎨 3D Builder: Generating background image (API-Easy)…', { displayImageId, resTier });

        const modelsToTry = [imageDef.apiEasyModel, 'nano-banana-pro', 'nano-banana'].filter(
            (m, i, a) => a.indexOf(m) === i,
        );

        let result = null;
        let lastError: unknown = null;

        const isRetryableError = (msg: string) => {
            const m = msg.toLowerCase();
            return (
                m.includes('quota') ||
                m.includes('exhausted') ||
                m.includes('429') ||
                m.includes('无可用渠道') ||
                m.includes('no available channel') ||
                m.includes('计费')
            );
        };

        for (const model of modelsToTry) {
            try {
                console.log(`🎨 3D Builder: Trying image model ${model}…`);
                result = await generateApiEasyImage({
                    prompt: basePrompt.slice(0, 8000),
                    aspectRatio: selectedAspect === '1:1' ? '1:1' : selectedAspect,
                    model,
                    imageSize: sizeHint,
                    inputImageUrls: referenceImages.length ? referenceImages : undefined,
                });
                if (result?.images?.length) break;
            } catch (err: unknown) {
                lastError = err;
                const msg = String((err as Error)?.message || '');
                if (isRetryableError(msg)) {
                    console.warn(`⚠ ${model} unavailable (${msg.slice(0, 80)}…), trying next model…`);
                    continue;
                }
                if (referenceImages.length > 0) {
                    try {
                        console.warn('3D Builder image failed with references, retrying text-only…');
                        result = await generateApiEasyImage({
                            prompt: basePrompt.slice(0, 8000),
                            aspectRatio: selectedAspect === '1:1' ? '1:1' : selectedAspect,
                            model,
                            imageSize: sizeHint,
                        });
                        if (result?.images?.length) break;
                    } catch (retryErr) {
                        lastError = retryErr;
                    }
                }
            }
        }

        if (!result?.images?.length) {
            throw lastError instanceof Error ? lastError : new Error('No image was generated');
        }

        await incrementBuilderUsage(userId, { creditCost, builderImages: 1 });
        console.log('✅ Background image generated (API-Easy)');

        return NextResponse.json({
            success: true,
            imageUrl: result.images[0],
            text: result.text,
            creditsUsed: creditCost,
        });
    } catch (error: unknown) {
        console.error('3D Builder image generation error:', error);
        return NextResponse.json(
            { error: (error as Error)?.message || 'Failed to generate background image' },
            { status: 500 },
        );
    }
}
