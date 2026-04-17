import { NextRequest, NextResponse } from 'next/server';
import { startVeoVideoGenerationDirect } from '@/lib/gemini-studio';
import { submitVeo31FastFirstLastFrameToVideo } from '@/lib/fal-builder';
import {
  startApiEasyVideoGeneration,
  pollApiEasyOperation,
  downloadApiEasyVideo,
  resolveApiEasyVideoModel,
} from '@/lib/api-easy-studio';
import { enforceStudioLimits, incrementStudioUsage } from '@/lib/studio-auth';
import {
  findVideoModelForPlan,
  getVideoCreditCost,
  canUseStudioHighResolution,
  parseStudioResolutionTier,
  isVeoApiEasyStudioModel,
} from '@/lib/model-router';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for video generation

const isTransientMissingVideoUrl = (message?: string): boolean =>
  typeof message === 'string' &&
  (message.includes('no playable URL') || message.includes('finished without video URL'));

function mapStudioResolutionToApiEasyHint(
  resolution: string | undefined,
): '720p' | '1080p' | '2k' | '4k' | undefined {
  const u = String(resolution || '1K').toUpperCase();
  if (u === '4K') return '4k';
  if (u === '2K') return '2k';
  return '1080p';
}

function withAspectConstraintPrompt(basePrompt: string, aspectRatio: '16:9' | '9:16'): string {
  const prompt = (basePrompt || 'Cinematic motion video').trim();
  const guardrail =
    aspectRatio === '9:16'
      ? 'STRICT OUTPUT RULE: Generate PORTRAIT video only in 9:16 ratio (taller than wide). Never return landscape 16:9.'
      : 'STRICT OUTPUT RULE: Generate LANDSCAPE video only in 16:9 ratio (wider than tall). Never return portrait 9:16.';
  return `${prompt}\n\n${guardrail}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt = '',
      imageUrl = null,
      imageUrls = null,
      model = 'veo-3.1-fast',
      duration = 5,
      aspectRatio = '16:9',
      resolution = '1K',
    } = body;

    // Combine imageUrls array and legacy imageUrl into a single array
    const allImageUrls: string[] = [];
    if (imageUrls && Array.isArray(imageUrls)) {
      allImageUrls.push(...imageUrls.filter(Boolean));
    } else if (imageUrl) {
      allImageUrls.push(imageUrl);
    }
    // Primary image for providers that only support one
    const primaryImageUrl = allImageUrls[0] || null;

    if (!prompt && allImageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Either a prompt or an image URL is required' },
        { status: 400 },
      );
    }

    // ── Local provider (no auth/billing — free local GPU) ───────────
    if (body.provider === 'local') {
      const localUrl = process.env.LOCAL_AI_URL || 'http://localhost:8000';
      try {
        let localImagePath: string | null = null;
        if (primaryImageUrl) {
          const imgRes = await fetch(primaryImageUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            const formData = new FormData();
            formData.append('file', blob, 'input.png');
            const uploadRes = await fetch(`${localUrl}/api/upload-image`, {
              method: 'POST',
              body: formData,
            });
            if (uploadRes.ok) {
              const uploadResult = await uploadRes.json();
              localImagePath = uploadResult.path;
            }
          }
        }

        const numFrames = 16;
        const frameRate = 8.0;

        const localRes = await fetch(`${localUrl}/api/generate-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt || '',
            width: 512,
            height: 512,
            num_frames: numFrames,
            frame_rate: frameRate,
            image_path: localImagePath,
          }),
        });

        if (!localRes.ok) {
          const err = await localRes.json().catch(() => ({ detail: 'Local server error' }));
          throw new Error(err.detail || 'Local video generation failed');
        }

        const result = await localRes.json();
        return NextResponse.json({
          outputUrl: result.video_url,
          provider: 'local',
          model: 'local-animatediff',
        });
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
    const requestedAspect = (aspectRatio === '9:16' ? '9:16' : '16:9') as '16:9' | '9:16';
    const constrainedPrompt = withAspectConstraintPrompt(prompt || 'Cinematic motion video', requestedAspect);

    const auth = await enforceStudioLimits(body, { isVideo: true, creditCost: 1 });
    if (!auth.allowed) return auth.errorResponse!;

    const plan = auth.plan || 'free';
    const resTier = parseStudioResolutionTier(resolution);
    const wantsHighResVideo = resTier === '2K' || resTier === '4K';
    if (wantsHighResVideo && !canUseStudioHighResolution(plan)) {
      return NextResponse.json(
        {
          error:
            '2K and 4K video output requires Premium ($200/mo) or Agency ($1,000/mo). Upgrade to unlock.',
        },
        { status: 403 },
      );
    }

    const resolvedModel = findVideoModelForPlan(model, plan);
    if (!resolvedModel) {
      return NextResponse.json(
        {
          error: `Video model "${model}" is not available on your plan. Upgrade for more Veo and video options.`,
        },
        { status: 403 },
      );
    }

    // Conservative first pass (max 10s) so WAN/Kling caps match.
    const durationSecInitial = Math.min(Number(duration) || 5, 10);
    const creditCostInitial = getVideoCreditCost(resolvedModel.id, durationSecInitial, resolution);
    const authCredits = await enforceStudioLimits(body, { isVideo: true, creditCost: creditCostInitial });
    if (!authCredits.allowed) return authCredits.errorResponse!;

    const maxDur = 10;
    const durationSec = Math.min(Number(duration) || 5, maxDur);
    const finalCreditCost = getVideoCreditCost(resolvedModel.id, durationSec, resolution);

    if (finalCreditCost > creditCostInitial) {
      const auth2 = await enforceStudioLimits(body, { isVideo: true, creditCost: finalCreditCost });
      if (!auth2.allowed) return auth2.errorResponse!;
    }

    // Prompt hints when routing through API-Easy (non-Gemini Veo).
    let finalPrompt = constrainedPrompt;
    const requestedId = resolvedModel.id.toLowerCase();

    if (requestedId.includes('kling')) {
      finalPrompt += ', cinematic motion, ultra-smooth slow motion, hyper-realistic physics';
    } else if (requestedId.includes('runway') || requestedId.includes('gen3')) {
      finalPrompt += ', artistic composition, dynamic camera movement, high definition, detailed textures';
    } else if (requestedId.includes('sora') || requestedId.includes('haiper')) {
      finalPrompt += ', highly photorealistic, lifelike motion, dramatic lighting, epic scale';
    } else if (requestedId.includes('wan-video') || requestedId.includes('hunyuan') || requestedId.includes('luma')) {
      finalPrompt += ', vibrant and crisp, smooth frame rate, cinematic lighting, professional cinematography';
    }

    const resHint = mapStudioResolutionToApiEasyHint(resolution);

    // ── fal.ai — Veo 3.1 Fast first+last @ 2K/4K (requires two images) ──
    if (wantsHighResVideo && isVeoApiEasyStudioModel(resolvedModel.id) && allImageUrls.length >= 2) {
      const { requestId } = await submitVeo31FastFirstLastFrameToVideo({
        prompt: constrainedPrompt,
        firstFrameUrl: allImageUrls[0]!,
        lastFrameUrl: allImageUrls[1]!,
        aspectRatio: requestedAspect,
        resolutionTier: resTier as '2K' | '4K',
        durationSec,
      });
      if (auth.userId) await incrementStudioUsage(auth.userId, 'video', finalCreditCost);
      return NextResponse.json({
        jobId: requestId,
        provider: 'fal',
        model: 'veo-3.1-fast-fal-fl',
        creditsUsed: finalCreditCost,
      });
    }

    if (wantsHighResVideo && isVeoApiEasyStudioModel(resolvedModel.id) && allImageUrls.length < 2) {
      return NextResponse.json(
        {
          error:
            '2K/4K video with Veo 3.1 Fast needs two connected images (first + last frame).',
        },
        { status: 400 },
      );
    }

    // ── Direct Gemini Veo provider ───────────────────────────────────
    if (resolvedModel.provider === 'gemini') {
      const geminiModel = resolvedModel.id === 'veo-3.1' ? 'veo-3.0-generate-001' : 'veo-3.0-fast-generate-001';
      const veoDuration = 8; // Veo-style models generate fixed 8s clips in this flow

      const result = await startVeoVideoGenerationDirect({
        prompt: constrainedPrompt,
        model: geminiModel,
        aspectRatio: requestedAspect,
        durationSeconds: veoDuration,
        imageUrl: primaryImageUrl,
      });

      if (auth.userId) await incrementStudioUsage(auth.userId, 'video', finalCreditCost);

      return NextResponse.json({
        jobId: result.operationName,
        provider: 'gemini',
        model: resolvedModel.id,
        creditsUsed: finalCreditCost,
      });
    }

    // ── API-Easy — default for api-easy-veo, WAN, Kling, etc. ─────────
    if (
      resolvedModel.provider === 'api-easy' ||
      resolvedModel.provider === 'fal' ||
      resolvedModel.provider === 'replicate'
    ) {
      const apiEasyModel = resolveApiEasyVideoModel(
        requestedAspect,
        resolvedModel.apiEasyModel || 'veo-3.1-fast',
        'veo-3.1-fast',
        'veo-3.1-landscape-fast',
      );
      const operation = await startApiEasyVideoGeneration({
        prompt: finalPrompt,
        model: apiEasyModel,
        aspectRatio: requestedAspect,
        durationSeconds: durationSec,
        imageUrl: primaryImageUrl,
        resolution: resHint,
      });

      const maxAttempts = 60;
      let attempts = 0;
      while (attempts < maxAttempts) {
        const poll = await pollApiEasyOperation(operation.operationName);
        if (poll.done) {
          if (poll.error) {
            // Some providers can briefly report "done" before attaching final media URL.
            // Keep polling instead of failing immediately on this transient state.
            if (isTransientMissingVideoUrl(poll.error)) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              attempts++;
              continue;
            }
            throw new Error(poll.error);
          }
          if (!poll.videoUri) throw new Error('API-Easy finished without video URL');
          const { buffer: videoBuffer, mimeType } = await downloadApiEasyVideo(poll.videoUri);
          if (auth.userId) await incrementStudioUsage(auth.userId, 'video', finalCreditCost);
          return NextResponse.json({
            outputUrl: poll.videoUri,
            videoBase64: `data:${mimeType};base64,${videoBuffer.toString('base64')}`,
            provider: 'api-easy',
            model: resolvedModel.id,
            creditsUsed: finalCreditCost,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }
      throw new Error('API-Easy video generation timed out');
    }

    return NextResponse.json({ error: 'Unsupported video model configuration.' }, { status: 500 });
  } catch (error: unknown) {
    console.error('[studio/generate-video] Error:', error);
    return NextResponse.json({ error: 'Video generation failed. Please try again.' }, { status: 500 });
  }
}
