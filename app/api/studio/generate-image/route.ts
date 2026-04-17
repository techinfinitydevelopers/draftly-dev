import { NextRequest, NextResponse } from 'next/server';
import { generateApiEasyImage } from '@/lib/api-easy-studio';
import {
  falKlingImageV3Generate,
  falSeedream45TextToImage,
  type KlingV3AspectRatio,
  type KlingV3Resolution,
} from '@/lib/fal-builder';
import { generateGeminiImageGoogleDirect } from '@/lib/gemini-studio';
import { enforceStudioLimits, incrementStudioUsage } from '@/lib/studio-auth';
import {
  findImageModelForPlan,
  clampResolution,
  getImageCreditCost,
  canUseStudioHighResolution,
} from '@/lib/model-router';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Build a style suffix for the prompt
function buildStyledPrompt(prompt: string, style: string): string {
  const styleMap: Record<string, string> = {
    photorealistic: 'ultra-realistic photograph, 8K resolution, detailed lighting',
    cinematic: 'cinematic shot, dramatic lighting, film grain, anamorphic lens',
    anime: 'anime style, Studio Ghibli inspired, vibrant colors',
    '3d-render': '3D render, octane render, physically based rendering, volumetric lighting',
    illustration: 'digital illustration, hand-drawn style, detailed linework',
    'oil-painting': 'oil painting, textured canvas, classical fine art style',
    watercolor: 'watercolor painting, soft edges, paint splashes, paper texture',
    'pixel-art': 'pixel art, 16-bit retro style, crisp edges',
    'concept-art': 'concept art, matte painting, environment design, epic scale',
  };

  const suffix = styleMap[style];
  return suffix ? `${prompt}, ${suffix}` : prompt;
}

// Map aspect ratio string to width/height
function aspectRatioToDimensions(ar: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '1:1': { width: 768, height: 768 },
    '16:9': { width: 960, height: 540 },
    '9:16': { width: 540, height: 960 },
    '4:3': { width: 896, height: 672 },
    '3:4': { width: 672, height: 896 },
  };
  return map[ar] || map['1:1'];
}

function mapAspectForKlingImage(ar: string): KlingV3AspectRatio {
  const map: Record<string, KlingV3AspectRatio> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
  };
  return map[ar] || '1:1';
}

function mapAspectForGeminiImage(ar: string): string {
  const map: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
  };
  return map[ar] || '1:1';
}

function mapResolutionTierKling(tier: string): KlingV3Resolution {
  return tier === '1K' ? '1K' : '2K';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      style = 'photorealistic',
      model = 'flux-schnell',
      provider: requestedProvider,
      aspectRatio = '1:1',
      numOutputs = 1,
      guidanceScale = 7.5,
      inputImage = null,
      inputImages = null,
      resolution: rawResolution = '1K',
    } = body;

    const resolutionUpper = String(rawResolution || '1K').toUpperCase();
    const resolutionTier =
      resolutionUpper === '4K' ? '4K' : resolutionUpper === '2K' ? '2K' : '1K';

    // Combine inputImages array and legacy inputImage into a single array
    const allInputImages: string[] = [];
    if (inputImages && Array.isArray(inputImages)) {
      allInputImages.push(...inputImages.filter(Boolean));
    } else if (inputImage) {
      allInputImages.push(inputImage);
    }

    if ((!prompt || typeof prompt !== 'string') && allInputImages.length === 0) {
      return NextResponse.json({ error: 'A prompt or input image is required' }, { status: 400 });
    }

    const styledPrompt = buildStyledPrompt(prompt || '', style);

    // ── Local provider (no auth/billing needed — free local GPU) ───
    if (requestedProvider === 'local') {
      const { width, height } = aspectRatioToDimensions(aspectRatio);
      const localUrl = process.env.LOCAL_AI_URL || 'http://localhost:8000';
      try {
        const localRes = await fetch(`${localUrl}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: styledPrompt,
            width,
            height,
            num_images: numOutputs,
            guidance_scale: guidanceScale,
            num_inference_steps: 30,
          }),
        });

        if (!localRes.ok) {
          const err = await localRes.json().catch(() => ({ detail: 'Local server error' }));
          throw new Error(err.detail || 'Local image generation failed');
        }

        const result = await localRes.json();
        return NextResponse.json({ images: result.images });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to connect to local AI server';
        if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
          return NextResponse.json(
            { error: 'Local AI server is not running. Start it with: cd local-server && python server.py' },
            { status: 503 },
          );
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    // ── Resolve model via router (enforces plan tier) ──────────────
    const auth = await enforceStudioLimits(body);
    if (!auth.allowed) return auth.errorResponse!;
    if (
      auth.plan !== 'basic' &&
      auth.plan !== 'basic-plus' &&
      auth.plan !== 'pro' &&
      auth.plan !== 'premium' &&
      auth.plan !== 'agency' &&
      auth.plan !== 'tester' &&
      auth.plan !== 'testing'
    ) {
      return NextResponse.json(
        { error: 'Image generation in Studio requires a paid plan. Upgrade to Basic ($25/mo) or higher.' },
        { status: 403 },
      );
    }

    const plan = auth.plan || 'free';
    if ((resolutionTier === '2K' || resolutionTier === '4K') && !canUseStudioHighResolution(plan)) {
      return NextResponse.json(
        {
          error:
            '2K and 4K images require Premium ($200/mo) or Agency ($1,000/mo). Upgrade to unlock.',
        },
        { status: 403 },
      );
    }

    const resolvedModel = findImageModelForPlan(model, plan);
    if (!resolvedModel) {
      return NextResponse.json(
        {
          error: `Image model "${model}" is not available on your plan. Premium ($200/mo) unlocks Nano Banana Pro and the full catalog; Basic–Pro use Seedream and Kling.`,
        },
        { status: 403 },
      );
    }

    // Clamp resolution to plan limit
    const rawDims = aspectRatioToDimensions(aspectRatio);
    const { width, height } = clampResolution(rawDims.width, rawDims.height, plan);

    const creditCost = getImageCreditCost(resolvedModel.id, resolutionTier);

    // Re-check with actual credit cost
    const creditCheck = await enforceStudioLimits(body, { creditCost });
    if (!creditCheck.allowed) return creditCheck.errorResponse!;

    // Style hints for non–Nano-Banana routes that still go through API-Easy (Nano Banana Pro backend).
    let finalPrompt = styledPrompt;
    const requestedId = resolvedModel.id.toLowerCase();

    if (requestedId.includes('flux')) {
      finalPrompt += ', highly detailed, ultra-crisp, realistic photography style, masterclass';
    } else if (requestedId.includes('dall-e')) {
      finalPrompt += ', vibrant colors, illustrative, high contrast, digital art style, perfect lighting';
    } else if (requestedId.includes('stable') || requestedId.includes('sdxl') || requestedId.includes('juggernaut') || requestedId.includes('realvis')) {
      finalPrompt += ', cinematic lighting, intricate details, photorealistic masterpiece, 8k resolution';
    } else if (requestedId.includes('playground')) {
      finalPrompt += ', bright, playful, soft lighting, 3d render style, colorful';
    } else if (requestedId.includes('midjourney') || requestedId.includes('fooocus') || requestedId.includes('dreamshaper')) {
      finalPrompt += ', hyper-realistic, dramatic lighting, highly textured, ethereal, cinematic composition';
    } else if (requestedId.includes('seedream')) {
      finalPrompt += ', cohesive lighting, sharp detail, premium commercial look';
    }

    // ── fal.ai — Kling Image V3 (FAL_KEY / fal_key / FAL_SELL_API_KEY) ────
    if (resolvedModel.id === 'kling-image-v3') {
      const falResult = await falKlingImageV3Generate({
        prompt: finalPrompt.slice(0, 2500),
        aspectRatio: mapAspectForKlingImage(aspectRatio),
        resolution: mapResolutionTierKling(resolutionTier),
      });
      if (auth.userId) await incrementStudioUsage(auth.userId, 'image', creditCost);
      return NextResponse.json({
        images: [falResult.imageUrl],
        model: resolvedModel.id,
        creditsUsed: creditCost,
      });
    }

    // ── fal.ai — ByteDance Seedream 4.5 text-to-image ─────────────────────
    if (resolvedModel.id === 'seedream-4.5') {
      const falResult = await falSeedream45TextToImage({
        prompt: finalPrompt.slice(0, 8000),
        aspectRatio: mapAspectForKlingImage(aspectRatio),
        resolutionTier: resolutionTier,
      });
      if (auth.userId) await incrementStudioUsage(auth.userId, 'image', creditCost);
      return NextResponse.json({
        images: [falResult.imageUrl],
        model: resolvedModel.id,
        creditsUsed: creditCost,
      });
    }

    // ── Google Gemini — Nano Banana Pro at 2K / 4K (native image API) ─
    if (
      resolvedModel.id === 'nano-banana-pro' &&
      (resolutionTier === '2K' || resolutionTier === '4K')
    ) {
      const geminiResult = await generateGeminiImageGoogleDirect({
        prompt: finalPrompt,
        aspectRatio: mapAspectForGeminiImage(aspectRatio),
        imageSize: resolutionTier,
        inputImageUrl: allInputImages[0] || undefined,
        inputImageUrls: allInputImages.length > 0 ? allInputImages : undefined,
      });
      if (geminiResult.images.length === 0) {
        return NextResponse.json(
          { error: 'Gemini returned no images. Try a different prompt or use 1K via API-Easy.' },
          { status: 500 },
        );
      }
      if (auth.userId) await incrementStudioUsage(auth.userId, 'image', creditCost);
      return NextResponse.json({
        images: geminiResult.images,
        model: resolvedModel.id,
        creditsUsed: creditCost,
      });
    }

    // ── API-Easy — Nano Banana Pro (1K) and all other listed models ─
    if (
      resolvedModel.provider === 'api-easy' ||
      resolvedModel.provider === 'fal' ||
      resolvedModel.provider === 'replicate'
    ) {
      const result = await generateApiEasyImage({
        prompt: finalPrompt,
        model: resolvedModel.apiEasyModel || 'nano-banana-pro',
        aspectRatio,
        inputImageUrl: allInputImages[0] || undefined,
        inputImageUrls: allInputImages.length > 0 ? allInputImages : undefined,
      });

      if (result.images.length === 0) {
        return NextResponse.json({ error: 'API-Easy returned no images. Try a different prompt.' }, { status: 500 });
      }

      if (auth.userId) await incrementStudioUsage(auth.userId, 'image', creditCost);
      return NextResponse.json({
        images: result.images,
        model: resolvedModel.id,
        creditsUsed: creditCost,
      });
    }

    return NextResponse.json({ error: 'Unsupported image model configuration.' }, { status: 500 });
  } catch (error: unknown) {
    console.error('[studio/generate-image] Error:', error);
    return NextResponse.json({ error: 'Image generation failed. Please try again.' }, { status: 500 });
  }
}
