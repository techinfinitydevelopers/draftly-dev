import { NextRequest, NextResponse } from 'next/server';
import { falLtx23ExtendVideo } from '@/lib/fal-builder';
import { getFalApiKey } from '@/lib/fal';
import {
    enforceStudioLimits,
    enforceBuilderMediaLimits,
    incrementBuilderUsage,
} from '@/lib/studio-auth';
import { getVideoCreditCost, canUseBuilderVideoExtend } from '@/lib/model-router';
import { getMaxPromptCharsForPlan } from '@/lib/builder-prompt-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const CREDIT_MODEL = 'ltx-2-3-extend-fal';

/**
 * Extend an existing clip with fal `ltx-2.3/extend-video` (~$0.10/s). Pro+ only; uses FAL_KEY.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            userId,
            videoUrl,
            prompt,
            durationSec: rawDuration,
            mode: rawMode,
            contextSec: rawContext,
        } = body as Record<string, unknown>;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const videoUrlStr = typeof videoUrl === 'string' ? videoUrl.trim() : '';
        if (!videoUrlStr) {
            return NextResponse.json({ error: 'videoUrl is required (data:video/... or https URL).' }, { status: 400 });
        }

        let durationSec = 5;
        if (typeof rawDuration === 'number' && Number.isFinite(rawDuration)) {
            durationSec = Math.round(rawDuration);
        } else if (typeof rawDuration === 'string' && /^\d+$/.test(rawDuration.trim())) {
            durationSec = parseInt(rawDuration.trim(), 10);
        }
        durationSec = Math.min(20, Math.max(1, durationSec));

        const mode =
            rawMode === 'start' || rawMode === 'end' ? (rawMode as 'start' | 'end') : 'end';

        let contextSec: number | undefined;
        if (typeof rawContext === 'number' && Number.isFinite(rawContext)) {
            contextSec = Math.min(20, Math.max(1, Math.round(rawContext)));
        } else if (typeof rawContext === 'string' && /^\d+$/.test(String(rawContext).trim())) {
            contextSec = Math.min(20, Math.max(1, parseInt(String(rawContext).trim(), 10)));
        }

        const creditCost = getVideoCreditCost(CREDIT_MODEL, durationSec, '1K');
        const auth = await enforceStudioLimits({ userId }, { isVideo: true, creditCost });
        if (!auth.allowed) return auth.errorResponse!;

        const plan = auth.plan || 'free';
        if (!canUseBuilderVideoExtend(plan)) {
            return NextResponse.json(
                {
                    error:
                        'Video extend requires Pro ($60/mo) or higher. Basic plans use standard LTX motion only; Premium unlocks Veo and multi-clip.',
                },
                { status: 403 },
            );
        }

        const promptStr = typeof prompt === 'string' ? prompt : '';
        const maxPromptChars = getMaxPromptCharsForPlan(plan, false);
        if (promptStr.length > maxPromptChars) {
            return NextResponse.json(
                { error: `Prompt is too long (maximum ${maxPromptChars} characters for your plan).` },
                { status: 400 },
            );
        }

        const mediaCheck = await enforceBuilderMediaLimits(userId, 'video');
        if (!mediaCheck.allowed) return mediaCheck.errorResponse!;

        try {
            getFalApiKey();
        } catch {
            return NextResponse.json(
                {
                    error:
                        'Video extend requires FAL_KEY or fal_key (same as LTX Fast on fal). Set it in Vercel → Environment Variables.',
                },
                { status: 503 },
            );
        }

        const { videoUrl: outUrl } = await falLtx23ExtendVideo({
            videoUrlOrDataUrl: videoUrlStr,
            prompt: promptStr || undefined,
            durationSec,
            mode,
            contextSec,
        });

        const vidHttp = await fetch(outUrl);
        if (!vidHttp.ok) throw new Error(`Failed to download extended video (${vidHttp.status})`);
        const videoBuffer = Buffer.from(await vidHttp.arrayBuffer());
        const b64 = videoBuffer.toString('base64');

        await incrementBuilderUsage(userId, { creditCost, builderVideos: 1 });

        return NextResponse.json({
            success: true,
            videoBase64: `data:video/mp4;base64,${b64}`,
            videoUrl: outUrl,
            creditsUsed: creditCost,
            videoProvider: 'ltx-2-3-extend-fal',
            extendDurationSec: durationSec,
            extendMode: mode,
        });
    } catch (error: unknown) {
        console.error('[extend-video]', error);
        return NextResponse.json(
            { error: (error as Error)?.message || 'Video extend failed.' },
            { status: 500 },
        );
    }
}
