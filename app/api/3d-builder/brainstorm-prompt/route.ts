import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function getApiEasyApiKey(): string {
  const key = process.env.API_EASY_API_KEY || process.env.APIYI_API_KEY;
  if (!key) throw new Error('API_EASY_API_KEY is not set');
  return key;
}

function getApiEasyBaseUrl(): string {
  return process.env.API_EASY_BASE_URL || process.env.APIYI_BASE_URL || 'https://api.apiyi.com/v1';
}

const SYSTEM_PROMPT = `You are a senior creative director at a premium digital agency.

Your job is to help users brainstorm and refine prompts for an AI website builder that creates scroll-driven 3D websites with video backgrounds.

When a user describes what they want (or uploads an image), you must:

1. ANALYZE their intent — are they building a website, generating a video animation, creating an image, or a full-stack app?
2. EXTRACT key details — brand name, industry, target audience, desired mood, color preferences
3. GENERATE a structured, professional prompt that includes:
   - Brand name (inferred or provided)
   - Hero headline (5-8 word maximum, punchy, premium)
   - Tagline / sub-headline
   - Color palette suggestion (specific hex codes)
   - Typography recommendation (Google Fonts)
   - 4-6 section descriptions (Hero, Features, About, CTA, etc.)
   - Animation/motion style notes
   - Overall design direction

When analyzing uploaded images:
- Identify the product/brand/industry
- Extract color palette, typography style, mood
- Note composition, lighting, materials
- Suggest how to translate this into a web design

RULES:
- Be concise but specific
- Always suggest premium, modern aesthetics
- Never use generic filler — every word should be actionable
- Format output as a clean brief, ready to paste into the builder
- If the user asks a question, answer helpfully then offer to generate a prompt
- Keep responses under 500 words unless the user asks for more detail`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, images, text } = body as {
      messages?: ChatMessage[];
      images?: string[];
      text?: string;
    };

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages.slice(-10)) {
        apiMessages.push({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        });
      }
    }

    if (text || (images && images.length > 0)) {
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      if (images && images.length > 0) {
        content.push({
          type: 'text',
          text: text
            ? `The user uploaded reference image(s) and said: "${text}"\n\nAnalyze the images and generate a complete website prompt based on both the images and the text description.`
            : 'The user uploaded reference image(s). Analyze them and generate a complete website prompt based on the visual style, colors, mood, and content you see.',
        });
        for (const img of images.slice(0, 4)) {
          content.push({ type: 'image_url', image_url: { url: img } });
        }
      } else if (text) {
        content.push({ type: 'text', text });
      }

      apiMessages.push({ role: 'user', content });
    }

    const apiKey = getApiEasyApiKey();
    const baseUrl = getApiEasyBaseUrl();

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const content = (data as any)?.choices?.[0]?.message?.content;

    let responseText = '';
    if (typeof content === 'string') {
      responseText = content;
    } else if (Array.isArray(content)) {
      const textPart = content.find((p: any) => p?.type === 'text' && typeof p?.text === 'string');
      responseText = textPart?.text || 'Could not generate a response.';
    }

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Brainstorm chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to brainstorm' },
      { status: 500 },
    );
  }
}
