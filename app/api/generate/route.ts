import { NextRequest, NextResponse } from 'next/server';
import { generateUICode } from '@/lib/gemini';
import { generateUICodeEnhanced } from '@/lib/gemini-enhanced';
import { generateCinematicWebsiteV3 } from '@/lib/gemini-cinematic-v3';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { canGenerateUIPreview, resetMonthlyCountsIfNeeded, canUseChat } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UserContext {
  businessType?: string;
  projectGoal?: string;
  colorTheme?: string;
  agencyType?: string;
  theme?: string;
  colorScheme?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, originalPrompt, theme, colorScheme, userId, customApiKey, isPartialUpdate, currentCode } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Ensure user doc exists (create with free defaults if first time)
    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    const userRef = getAdminDb().collection('users').doc(userId);
    const subscription = userData?.subscription || {
      plan: 'free',
      status: 'active',
      generationsUsed: 0,
      generationsLimit: 2,
    };

    // Handle partial updates (like Lovable/Cursor)
    if (isPartialUpdate && currentCode) {
      // Get or initialize generation tracking for chat limit check
      let generationTracking = userData?.generationTracking || {
        fullAppsGenerated: 0,
        uiPreviewsGenerated: 0,
        chatsUsed: 0,
        lastResetDate: new Date().toISOString(),
        projects: {},
      };

      // Reset monthly counts if needed (billing cycle)
      generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);

      // Check if user can use chat
      const canChat = canUseChat(subscription, generationTracking);
      if (!canChat.allowed) {
        return NextResponse.json(
          { 
            error: canChat.reason || 'Chat limit reached',
            requiresUpgrade: true,
            chatsRemaining: canChat.remaining || 0,
          },
          { status: 403 }
        );
      }
      
      console.log('🔄 Processing partial update request');
      
      const partialUpdatePrompt = `You are an expert web developer. Your task is to update ONLY the specific part mentioned in the user's request, keeping everything else EXACTLY the same (like Lovable or Cursor does).

CURRENT COMPLETE WEBSITE CODE:
${currentCode}

USER REQUEST: ${prompt}

🚨 CRITICAL INSTRUCTIONS FOR PARTIAL UPDATE:

1. **PARSE THE REQUEST**: Identify what specific element/section the user wants to change
   - Examples: "change the hero headline", "update button colors", "modify the about section", "change font size"
   - Extract the exact target: section ID, class name, or element type

2. **FIND THE TARGET**: Locate the specific part in the current code that needs updating
   - Search for the section/element mentioned
   - Identify the exact HTML structure for that part

3. **UPDATE ONLY THAT PART**: 
   - Modify ONLY the identified section/element
   - Keep all other HTML, CSS, JavaScript EXACTLY the same
   - Do NOT regenerate the entire website
   - Do NOT change unrelated sections

4. **MAINTAIN CONSISTENCY**:
   - Keep the same design system (colors, fonts, spacing)
   - Keep the same structure and layout
   - Keep all scripts and functionality intact
   - Keep all other sections untouched

5. **RETURN COMPLETE CODE**:
   - Return the FULL HTML code with only the requested part changed
   - Include all styles and scripts inline
   - Ensure the code is valid and functional

OUTPUT: Complete HTML code starting with <!DOCTYPE html>. The code should be identical to the current code except for the specific part mentioned in the user's request.`;

      const userContext: UserContext = {
        businessType: theme,
        colorTheme: colorScheme,
        theme: theme,
        colorScheme: colorScheme,
      };

      let code: string;
      try {
        code = await generateCinematicWebsiteV3(partialUpdatePrompt, userContext, customApiKey);
      } catch (error) {
        console.warn('Partial update failed, trying enhanced:', error);
        code = await generateUICodeEnhanced(partialUpdatePrompt, userContext, customApiKey);
      }

      // Increment chat count
      generationTracking.chatsUsed = (generationTracking.chatsUsed || 0) + 1;
      
      // Update user document asynchronously
      userRef.set({
        generationTracking,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(err => {
        console.error('Failed to update chat tracking:', err);
      });

      const chatsRemaining = canChat.remaining !== undefined && canChat.remaining !== -1 
        ? canChat.remaining - 1 
        : canChat.remaining;

      return NextResponse.json({ 
        code,
        isPartialUpdate: true,
        chatsRemaining,
      });
    }

    console.log('API received:', { prompt, originalPrompt, theme, colorScheme, userId, hasCustomKey: !!customApiKey });

    // Get or initialize generation tracking
    let generationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    // Reset monthly counts if needed (billing cycle)
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);

    // Check if user can generate UI preview
    const canGenerate = canGenerateUIPreview(subscription, generationTracking);
    if (!canGenerate.allowed) {
      return NextResponse.json(
        { 
          error: canGenerate.reason || 'Generation limit reached',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    console.log('Generating cinematic UI with prompt:', prompt);

    const userContext: UserContext = {
      businessType: theme,
      colorTheme: colorScheme,
      theme: theme,
      colorScheme: colorScheme,
    };

    // Use NEW V3 cinematic generation system with HEAVY 3D animations
    // Start generation immediately (don't wait for Firebase writes)
    let code: string;
    try {
      console.log('🎬 Using V3 HEAVY 3D cinematic generation system...');
      code = await generateCinematicWebsiteV3(prompt, userContext, customApiKey);
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.message?.includes('UNAUTHENTICATED') || error?.message?.includes('API key')) {
        console.error('❌ Gemini API authentication error:', error.message);
        return NextResponse.json(
          { 
            error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in your environment variables. Get your API key from https://makersuite.google.com/app/apikey',
            requiresConfig: true,
          },
          { status: 500 }
        );
      }
      console.warn('V3 cinematic generation failed, falling back to enhanced:', error);
      try {
        code = await generateUICodeEnhanced(prompt, userContext, customApiKey);
      } catch (error2: any) {
        // Check if it's an authentication error in fallback
        if (error2?.message?.includes('UNAUTHENTICATED') || error2?.message?.includes('API key')) {
          console.error('❌ Gemini API authentication error in fallback:', error2.message);
          return NextResponse.json(
            { 
              error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in your environment variables. Get your API key from https://makersuite.google.com/app/apikey',
              requiresConfig: true,
            },
            { status: 500 }
          );
        }
        console.warn('Enhanced generation failed, falling back to regular:', error2);
        try {
          code = await generateUICode(prompt, userContext, customApiKey);
        } catch (error3: any) {
          // Final check for authentication error
          if (error3?.message?.includes('UNAUTHENTICATED') || error3?.message?.includes('API key')) {
            console.error('❌ Gemini API authentication error in final fallback:', error3.message);
            return NextResponse.json(
              { 
                error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in your environment variables. Get your API key from https://makersuite.google.com/app/apikey',
                requiresConfig: true,
              },
              { status: 500 }
            );
          }
          throw error3;
        }
      }
    }

    console.log('Generated code length:', code.length);

    // Increment UI preview count and update Firebase (non-blocking - don't wait)
    generationTracking.uiPreviewsGenerated = (generationTracking.uiPreviewsGenerated || 0) + 1;
    
    // Update user document asynchronously (don't block response)
    userRef.set({
      generationTracking,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(err => {
      console.error('Failed to update generation tracking:', err);
      // Non-critical error - don't fail the request
    });

    // Generate a unique project ID
    const projectId = Date.now().toString();

    // Return code and project data
    return NextResponse.json({ 
      code, 
      projectId,
      projectData: {
        id: projectId,
        prompt: originalPrompt || prompt,
        fullPrompt: prompt,
        theme: theme || 'cinematic',
        colorScheme: colorScheme || 'dark',
        code,
        createdAt: new Date().toISOString(),
        type: 'ui-preview',
      },
      generationTracking: {
        uiPreviewsRemaining: subscription.plan === 'free' 
          ? Math.max(0, 2 - generationTracking.uiPreviewsGenerated)
          : subscription.plan === 'pro'
          ? Math.max(0, 10 - generationTracking.uiPreviewsGenerated)
          : Math.max(0, 50 - generationTracking.uiPreviewsGenerated),
        chatsRemaining: subscription.plan === 'pro'
          ? Math.max(0, 50 - (generationTracking.chatsUsed || 0))
          : subscription.plan === 'premium'
          ? -1 // Unlimited
          : 0,
      },
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate UI' },
      { status: 500 }
    );
  }
}
