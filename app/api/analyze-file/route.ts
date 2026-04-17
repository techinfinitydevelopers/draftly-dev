import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { canUseGemini3Flash, incrementGemini3FlashCalls } from '@/lib/gemini-model-tracker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MODEL_FALLBACKS = [
  'gemini-3-flash-preview',     // Gemini 3 Flash Preview - Fast and capable
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-pro'
];

// Supported file types
const SUPPORTED_TYPES = {
  'text/plain': 'text',
  'text/markdown': 'markdown',
  'text/html': 'html',
  'application/json': 'json',
  'text/css': 'css',
  'application/javascript': 'javascript',
  'text/typescript': 'typescript',
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userPrompt = formData.get('prompt') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    let fileContent: string = '';
    let analysisPrompt: string = '';

    // Handle different file types
    if (fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/javascript') {
      // Text-based files
      fileContent = await file.text();
      
      analysisPrompt = `Analyze the following ${fileType} file and extract key information that would help generate a website/UI design.

FILE NAME: ${fileName}
FILE TYPE: ${fileType}
FILE CONTENT:
${fileContent.substring(0, 10000)}${fileContent.length > 10000 ? '\n... (truncated)' : ''}

${userPrompt ? `USER'S ORIGINAL PROMPT: ${userPrompt}` : ''}

INSTRUCTIONS:
1. Analyze the file content and identify:
   - Design requirements, color schemes, or style preferences mentioned
   - Layout structures or component descriptions
   - Brand guidelines or visual identity elements
   - Functionality requirements that affect UI
   - Any specific design patterns or frameworks mentioned
   - Typography preferences
   - Spacing, sizing, or layout preferences

2. Generate an enhanced prompt that incorporates insights from this file
3. If the file contains code, identify UI components, styles, or design patterns
4. If the file contains text/markdown, extract design-related information
5. Create a comprehensive prompt that combines the file insights with the user's original request

Return ONLY the enhanced prompt that incorporates insights from the file. Make it specific and actionable for website generation.`;
    } else if (fileType.startsWith('image/')) {
      // Image files - convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = fileType;
      
      // Use Gemini's vision capabilities
      analysisPrompt = `Analyze this image and extract design elements, color schemes, layout patterns, and visual style that would help generate a similar website/UI design.

${userPrompt ? `USER'S ORIGINAL PROMPT: ${userPrompt}` : ''}

INSTRUCTIONS:
1. Analyze the image and identify:
   - Color palette and color scheme
   - Layout structure and composition
   - Typography style (if visible)
   - Visual style (modern, classic, minimal, etc.)
   - Design patterns and UI elements
   - Spacing and proportions
   - Overall aesthetic and mood

2. Generate an enhanced prompt that describes the design elements found in the image
3. Combine the visual analysis with the user's original request
4. Make it specific enough to recreate a similar design

Return ONLY the enhanced prompt that incorporates insights from the image.`;
      
      // For images, we'll use the vision model
      let lastError: any = null;
      
      const canUseGemini3 = await canUseGemini3Flash();
      if (canUseGemini3) {
        try {
          console.log('Analyzing image with gemini-3-pro-preview');
          const model = defaultGenAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
          const result = await model.generateContent([
            {
              inlineData: {
                data: base64,
                mimeType: mimeType,
              },
            },
            analysisPrompt,
          ]);
          const response = await result.response;
          const enhancedPrompt = response.text().trim();
          
          await incrementGemini3FlashCalls();
          
          return NextResponse.json({ 
            enhancedPrompt,
            originalPrompt: userPrompt,
            fileType: 'image',
            fileName
          });
        } catch (error: any) {
          console.error('Gemini-3-pro-preview failed:', error.message);
          lastError = error;
          
          // If it's not a quota error, throw immediately
          if (!error.message?.includes('quota') && !error.message?.includes('429')) {
            throw error;
          }
        }
      }

      // Fallback for images
      for (const modelName of MODEL_FALLBACKS) {
        try {
          if (modelName.includes('1.5') || modelName.includes('2.0') || modelName.includes('2.5')) {
            // These models support vision
            const model = defaultGenAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
              {
                inlineData: {
                  data: base64,
                  mimeType: mimeType,
                },
              },
              analysisPrompt,
            ]);
            const response = await result.response;
            const enhancedPrompt = response.text().trim();
            
            return NextResponse.json({ 
              enhancedPrompt,
              originalPrompt: userPrompt,
              fileType: 'image',
              fileName
            });
          }
        } catch (error: any) {
          console.error(`Model ${modelName} failed:`, error.message);
          lastError = error;
          continue;
        }
      }

      throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Supported types: text, markdown, HTML, JSON, CSS, JavaScript, TypeScript, PDF, images (PNG, JPEG, WebP, GIF)` },
        { status: 400 }
      );
    }

    // For text-based files, use regular text generation
    let lastError: any = null;

    const canUseGemini3 = await canUseGemini3Flash();
    if (canUseGemini3) {
      try {
        console.log('Analyzing file with gemini-3-pro-preview');
        const model = defaultGenAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const enhancedPrompt = response.text().trim();
        
        await incrementGemini3FlashCalls();
        
        return NextResponse.json({ 
          enhancedPrompt,
          originalPrompt: userPrompt,
          fileType: fileType,
          fileName
        });
      } catch (error: any) {
        console.error('Gemini-3-pro-preview failed:', error.message);
        lastError = error;
        
        // If it's not a quota error, throw immediately
        if (!error.message?.includes('quota') && !error.message?.includes('429')) {
          throw error;
        }
      }
    }

    // Fallback for text files
    for (const modelName of MODEL_FALLBACKS) {
      try {
        console.log(`Analyzing file with ${modelName}`);
        const model = defaultGenAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const enhancedPrompt = response.text().trim();
        
        return NextResponse.json({ 
          enhancedPrompt,
          originalPrompt: userPrompt,
          fileType: fileType,
          fileName
        });
      } catch (error: any) {
        console.error(`Model ${modelName} failed:`, error.message);
        lastError = error;
        
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          continue;
        }
        throw error;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  } catch (error: any) {
    console.error('File analysis error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze file' },
      { status: 500 }
    );
  }
}

