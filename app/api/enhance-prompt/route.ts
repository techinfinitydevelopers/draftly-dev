import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { canUseGemini3Flash, incrementGemini3FlashCalls } from '@/lib/gemini-model-tracker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-001',
];

export async function POST(req: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 },
      );
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const { prompt, lockToImage, imageDescription } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Different system prompts depending on whether image is locked
    let enhancementPrompt: string;

    if (lockToImage && imageDescription) {
      // Image-locked mode: keep the subject/product, only change angles/backgrounds/lighting
      enhancementPrompt = `You are an expert creative director for product and commercial photography. The user has uploaded an image and wants variations that keep the EXACT same subject/product but change everything else around it.

UPLOADED IMAGE CONTEXT:
${imageDescription}

USER'S REQUEST:
${prompt}

INSTRUCTIONS:
1. The subject/product in the image MUST remain exactly the same — do not change, modify, or alter it
2. Enhance the prompt to create a compelling variation by changing:
   - Background/environment (studio, outdoor, urban, nature, abstract, etc.)
   - Lighting (golden hour, studio lights, neon, dramatic shadows, etc.)
   - Camera angle (close-up, bird's eye, low angle, macro, etc.)
   - Mood/atmosphere (minimal, luxurious, energetic, serene, etc.)
   - Props and staging around the subject
3. Be specific and vivid in your description
4. Keep it to 2-3 sentences, highly detailed

Return ONLY the enhanced prompt, no explanations.`;
    } else {
      // Normal enhance mode
      enhancementPrompt = `You are an expert prompt engineer for AI image generation. Enhance the following prompt to produce stunning, professional-quality images.

ORIGINAL PROMPT:
${prompt}

INSTRUCTIONS:
1. Keep the user's core intent and subject matter
2. Add specific, vivid details for better generation:
   - Lighting (e.g., "golden hour backlighting", "soft studio rim light")
   - Composition (e.g., "rule of thirds", "centered symmetrical")
   - Style (e.g., "editorial photography", "hyper-detailed 8K render")
   - Atmosphere and mood
   - Color palette hints
3. Make it more detailed and specific while keeping the original intent
4. Keep it concise but comprehensive (2-3 sentences)
5. Do NOT change the fundamental request — just enhance it

Return ONLY the enhanced prompt, no explanations or additional text.`;
    }

    let lastError: unknown = null;
    let usedGemini3 = false;

    // Flash first for speed/quality; Pro when daily budget allows; then stable models.
    const modelCandidates: string[] = ['gemini-3-flash-preview'];
    if (await canUseGemini3Flash()) modelCandidates.push('gemini-3-pro-preview');
    modelCandidates.push(...MODEL_FALLBACKS);

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(enhancementPrompt);
        const response = await result.response;
        const enhancedPrompt = response.text().trim();

        if (modelName === 'gemini-3-pro-preview') {
          usedGemini3 = true;
        }

        if (!enhancedPrompt) {
          throw new Error(`Model ${modelName} returned empty response`);
        }

        if (usedGemini3) await incrementGemini3FlashCalls();

        return NextResponse.json({
          enhancedPrompt,
          originalPrompt: prompt,
          modelUsed: modelName,
        });
      } catch (error: unknown) {
        lastError = error;
        // Keep trying fallbacks for model-not-found, 429/quota, transient, etc.
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to enhance prompt';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
