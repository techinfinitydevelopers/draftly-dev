import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const image = formData.get('image') as File;
        const userPrompt = formData.get('prompt') as string;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (image.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
        }

        if (!image.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are accepted' }, { status: 400 });
        }

        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');

        // Use Gemini Vision to analyze the image
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: image.type,
            },
        };

        const analysisPrompt = `Analyze this image and describe it in detail for creating a website UI. Focus on:
1. Color scheme and palette
2. Layout and structure
3. Typography and fonts
4. Visual style and aesthetic
5. Key UI elements and components

Provide a detailed description that can be used to generate a similar website design.`;

        const result = await model.generateContent([analysisPrompt, imagePart]);
        const imageAnalysis = result.response.text();

        // Combine image analysis with user prompt
        const combinedPrompt = userPrompt
            ? `Based on this reference image: ${imageAnalysis}\n\nUser requirements: ${userPrompt}`
            : `Create a website based on this reference image: ${imageAnalysis}`;

        return NextResponse.json({
            success: true,
            enhancedPrompt: combinedPrompt,
            imageAnalysis: imageAnalysis
        });

    } catch (error: any) {
        console.error('Image analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze image' },
            { status: 500 }
        );
    }
}
