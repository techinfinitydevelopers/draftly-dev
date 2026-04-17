import { NextRequest, NextResponse } from 'next/server';
import { wrapVideoPrompt, BUILDER_FIXED_VIDEO_MODEL_ID, BUILDER_VIDEO_MODELS } from '@/lib/builder-display-models';
import {
    startApiEasyVideoGeneration,
    pollApiEasyOperation,
    downloadApiEasyVideo,
    resolveApiEasyVideoModel,
    resolveApiEasyVideoModelFL,
} from '@/lib/api-easy-studio';
import {
    enforceStudioLimits,
    enforceBuilderMediaLimits,
    incrementBuilderUsage,
} from '@/lib/studio-auth';
import {
    getVideoCreditCost,
    canUseStudioHighResolution,
    canUseBuilderVeoMotion,
} from '@/lib/model-router';
import { getMaxPromptCharsForPlan } from '@/lib/builder-prompt-limits';
import { rehostDataImageUrlForVeoIfNeeded } from '@/lib/rehost-data-image-for-veo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const isTransientMissingVideoUrl = (message?: string): boolean =>
    typeof message === 'string' &&
    (message.includes('no playable URL') || message.includes('no URL returned'));

const ALLOWED_BUILDER_VIDEO_IDS = new Set(BUILDER_VIDEO_MODELS.map((m) => m.id));

/** 3D Builder: Veo 3.1 Fast (API-Easy) — single-image or first→last frame. */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            imageUrl,
            prompt,
            aspectRatio,
            userId,
            firstFrameUrl,
            lastFrameUrl,
            resolution,
            displayVideoModelId: rawDisplayVideoModelId,
        } = body as Record<string, unknown>;

        const imageUrlStr = typeof imageUrl === 'string' ? imageUrl : '';
        const firstFrameUrlStr = typeof firstFrameUrl === 'string' ? firstFrameUrl : '';
        const lastFrameUrlStr = typeof lastFrameUrl === 'string' ? lastFrameUrl : '';

        const isFL = Boolean(firstFrameUrlStr || lastFrameUrlStr);
        const rawVid =
            typeof rawDisplayVideoModelId === 'string' ? rawDisplayVideoModelId.trim() : '';
        const displayVideoModelIdResolved =
            rawVid && ALLOWED_BUILDER_VIDEO_IDS.has(rawVid) ? rawVid : BUILDER_FIXED_VIDEO_MODEL_ID;

        const resStr = typeof resolution === 'string' ? resolution.toLowerCase() : '';
        /** Product UI only exposes 720p + 2K; map legacy 1080p/4K to closest tier. */
        const requestedResolution: '720p' | '2k' =
            resStr === '2k' || resStr === '4k' ? '2k' : '720p';

        const premiumOnlyResolution = requestedResolution === '2k';

        if (!imageUrlStr && !isFL) {
            return NextResponse.json({
                error: 'Image URL is required (or provide firstFrameUrl/lastFrameUrl for FL mode)',
            }, { status: 400 });
        }
        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const aspectStrEarly = typeof aspectRatio === 'string' ? aspectRatio : '';
        const requestedAspectForApiEasy: '16:9' | '9:16' =
            aspectStrEarly === '9:16' ? '9:16' : '16:9';

        const isFast = displayVideoModelIdResolved.includes('fast');

        let creditModelId: string;
        if (isFL) {
            creditModelId =
                requestedAspectForApiEasy === '9:16' 
                    ? (isFast ? 'veo-3.1-fast-fl' : 'veo-3.1-fl') 
                    : (isFast ? 'veo-3.1-landscape-fast-fl' : 'veo-3.1-landscape-fl');
        } else {
            creditModelId = resolveApiEasyVideoModel(
                requestedAspectForApiEasy,
                isFast ? 'veo-3.1-fast' : 'veo-3.1',
                isFast ? 'veo-3.1-fast' : 'veo-3.1',
                isFast ? 'veo-3.1-landscape-fast' : 'veo-3.1-landscape'
            );
        }

        const studioResTier = requestedResolution === '2k' ? '2K' : '1K';

        const billedVideoSeconds = 8;
        const creditCost = getVideoCreditCost(creditModelId, billedVideoSeconds, studioResTier);
        const auth = await enforceStudioLimits({ userId }, { isVideo: true, creditCost });
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
                {
                    error: '3D Builder video generation requires a paid plan. Please upgrade to Basic ($25/mo) or higher.',
                },
                { status: 403 },
            );
        }

        const plan = auth.plan || 'free';

        if (premiumOnlyResolution && !canUseStudioHighResolution(plan)) {
            return NextResponse.json(
                { error: '2K video requires Premium ($200/mo) or Agency ($1,000/mo).' },
                { status: 403 },
            );
        }

        const premiumMotion = canUseStudioHighResolution(plan);
        const veoMotion = canUseBuilderVeoMotion(plan);
        if (isFL && !veoMotion) {
            return NextResponse.json(
                {
                    error:
                        'First→last frame video requires Basic ($25/mo) or higher.',
                },
                { status: 403 },
            );
        }
        if (displayVideoModelIdResolved === 'veo-31-fast' && !veoMotion) {
            return NextResponse.json(
                {
                    error:
                        'Veo 3.1 Fast requires Basic ($25/mo) or higher.',
                },
                { status: 403 },
            );
        }
        const mediaCheck = await enforceBuilderMediaLimits(userId, 'video');
        if (!mediaCheck.allowed) return mediaCheck.errorResponse!;

        const promptStr = typeof prompt === 'string' ? prompt : '';
        const maxPromptChars = getMaxPromptCharsForPlan(auth.plan || 'basic', false);
        if (promptStr.length > maxPromptChars) {
            return NextResponse.json(
                { error: `Prompt is too long (maximum ${maxPromptChars} characters for your plan).` },
                { status: 400 },
            );
        }

        const aspectStr = typeof aspectRatio === 'string' ? aspectRatio : '';
        const requestedAspectForPrompt: '16:9' | '9:16' | '1:1' =
            aspectStr === '1:1' ? '1:1' : aspectStr === '9:16' ? '9:16' : '16:9';

        const defaultPrompt = isFL
            ? `Smoothly transition from the first frame to the last frame with cinematic 3D camera movement, parallax depth, and subtle effects. Duration: 8 seconds. Aspect ratio: ${requestedAspectForPrompt}. Keep motion smooth for a scroll-driven website background.`
            : requestedAspectForPrompt === '9:16'
              ? 'Slowly animate this PORTRAIT image with cinematic 3D camera movement, smooth parallax depth, and subtle particle effects. Keep the motion slow and smooth for a scroll-driven website background. IMPORTANT: Output must be PORTRAIT 9:16 format, taller than wide. Never output landscape.'
              : requestedAspectForPrompt === '1:1'
                ? 'Slowly animate this SQUARE image with cinematic 3D camera movement, smooth parallax depth, and subtle particle effects. Keep the motion slow and smooth for a scroll-driven website background. IMPORTANT: Output must be SQUARE 1:1 format. Never output portrait or landscape.'
                : 'Slowly animate this LANDSCAPE WIDESCREEN image with cinematic 3D camera movement, smooth parallax depth, and subtle particle effects. Keep the motion slow and smooth for a scroll-driven website background. IMPORTANT: Output must be LANDSCAPE 16:9 widescreen format, wider than tall. Never output portrait.';

        const baseMotion = promptStr || defaultPrompt;
        const finalMotionPrompt = wrapVideoPrompt(baseMotion, displayVideoModelIdResolved);

        console.log(`🎬 3D Builder video | lane: api-easy-veo | FL: ${isFL} | billing: ${creditModelId}`);

        if (!veoMotion) {
            return NextResponse.json(
                {
                    error: '3D Builder video requires Basic ($25/mo) or higher.',
                },
                { status: 403 },
            );
        }

        const apiModel = isFL
            ? resolveApiEasyVideoModelFL(requestedAspectForApiEasy, isFast)
            : resolveApiEasyVideoModel(
                  requestedAspectForApiEasy,
                  isFast ? 'veo-3.1-fast' : 'veo-3.1',
                  isFast ? 'veo-3.1-fast' : 'veo-3.1',
                  isFast ? 'veo-3.1-landscape-fast' : 'veo-3.1-landscape'
              );

        let veoImageUrl = imageUrlStr;
        let veoFirst = firstFrameUrlStr;
        let veoLast = lastFrameUrlStr;
        try {
            veoImageUrl = await rehostDataImageUrlForVeoIfNeeded(veoImageUrl, userId);
            veoFirst = await rehostDataImageUrlForVeoIfNeeded(veoFirst, userId);
            veoLast = await rehostDataImageUrlForVeoIfNeeded(veoLast, userId);
        } catch (rehostErr: unknown) {
            console.error('[generate-video] Keyframe rehost failed:', rehostErr);
            return NextResponse.json(
                {
                    error:
                        (rehostErr as Error)?.message ||
                        'Could not prepare images for video. Data URL keyframes require Firebase Admin + Storage. Use HTTPS images or fix server configuration.',
                },
                { status: 503 },
            );
        }

        const dataKeyframeCount = [imageUrlStr, firstFrameUrlStr, lastFrameUrlStr].filter((u) =>
            typeof u === 'string' && u.trim().startsWith('data:image/'),
        ).length;
        if (dataKeyframeCount > 0) {
            console.log(`   Rehosted ${dataKeyframeCount} data: URL keyframe(s) for Veo`);
        }

        let operation: Awaited<ReturnType<typeof startApiEasyVideoGeneration>>;
        try {
            operation = await startApiEasyVideoGeneration({
                prompt: finalMotionPrompt,
                imageUrl: isFL ? undefined : veoImageUrl,
                firstFrameUrl: isFL ? veoFirst : undefined,
                lastFrameUrl: isFL ? veoLast : undefined,
                aspectRatio: requestedAspectForApiEasy,
                durationSeconds: billedVideoSeconds,
                resolution: requestedResolution,
                model: apiModel,
            });
        } catch (startErr: unknown) {
            console.error('[generate-video] startApiEasyVideoGeneration failed:', startErr);
            throw startErr;
        }

        console.log(`   Model: ${apiModel} | Aspect: ${requestedAspectForApiEasy}`);
        console.log('   Operation:', operation.operationName);

        const maxAttempts = 60;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const pollResult = await pollApiEasyOperation(operation.operationName);

            if (pollResult.done) {
                if (pollResult.error) {
                    if (isTransientMissingVideoUrl(pollResult.error)) {
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                        attempts++;
                        continue;
                    }
                    throw new Error(pollResult.error);
                }

                if (!pollResult.videoUri) {
                    throw new Error('Video completed but no URL returned');
                }

                console.log('✅ Video generated:', pollResult.videoUri);

                const { buffer: videoBuffer, mimeType } = await downloadApiEasyVideo(pollResult.videoUri);
                const videoBase64 = videoBuffer.toString('base64');
                await incrementBuilderUsage(userId, { creditCost, builderVideos: 1 });

                return NextResponse.json({
                    success: true,
                    videoUrl: pollResult.videoUri,
                    videoBase64: `data:${mimeType};base64,${videoBase64}`,
                    creditsUsed: creditCost,
                    videoProvider: isFL ? 'veo-api-easy-fl' : 'veo-api-easy',
                });
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
            attempts++;
        }

        throw new Error('Video generation timed out after 10 minutes');
    } catch (error: unknown) {
        console.error('3D Builder video generation error:', error);
        return NextResponse.json(
            { error: (error as Error)?.message || 'Failed to generate video' },
            { status: 500 },
        );
    }
}
