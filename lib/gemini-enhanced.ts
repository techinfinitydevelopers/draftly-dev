import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateDesignPrompt } from './design-prompts';
import { generateDesignSystem, designSystemToPrompt } from './design-system';
import { canUseGemini3Flash, incrementGemini3FlashCalls } from './gemini-model-tracker';

// Validate Gemini API key
if (!process.env.GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable');
  console.error('Please add it to your Vercel environment variables');
}

const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model fallback chain
const MODEL_FALLBACKS = [
  'gemini-3-flash-preview',     // Gemini 3 Flash Preview - Fast and capable
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro-latest',
  'gemini-pro'
];

/**
 * Enhanced UI generation with design prompt integration
 * Automatically detects category and applies appropriate design specifications
 */
export async function generateUICodeEnhanced(
  prompt: string,
  userContext: {
    agencyType?: string;
    projectGoal?: string;
    colorTheme?: string;
    businessType?: string;
    category?: string; // New: website category
    theme?: string;
    colorScheme?: string;
  },
  customApiKey?: string
) {
  let lastError: any = null;
  
  // Detect category from prompt or userContext
  const category = detectCategory(prompt, userContext);
  console.log(`Detected category: ${category}`);
  
  // Generate design system from theme and color scheme
  const themeId = userContext.theme || 'professional';
  const colorSchemeId = userContext.colorScheme || userContext.colorTheme || 'dark';
  const designSystem = generateDesignSystem(themeId, colorSchemeId);
  const designSystemPrompt = designSystemToPrompt(designSystem);
  
  // Get design specifications for the category
  const designPrompt = generateDesignPrompt(prompt, category);
  
  // Try gemini-3-pro-preview first if available (under 20 calls/day)
  const canUseGemini3 = await canUseGemini3Flash();
  if (canUseGemini3) {
    try {
      console.log(`Using gemini-3-pro-preview (best model for animations & UI design)${customApiKey ? ' (custom API key)' : ''}`);
      const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI;
      const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
      const result = await generateWithModelEnhanced(model, designPrompt, userContext);
      // Increment daily call count
      await incrementGemini3FlashCalls();
      return result;
    } catch (error: any) {
      console.error(`Gemini-3-pro-preview failed:`, error.message);
      lastError = error;
      
      // If it's not a quota error, throw immediately
      if (!error.message?.includes('quota') && !error.message?.includes('429')) {
        throw error;
      }
      // Otherwise, continue to fallback models
    }
  } else {
    console.log(`⚠️ Gemini-3-pro-preview daily limit reached (20 calls), using fallback models`);
  }
  
  // Fallback to other models
  for (const modelName of MODEL_FALLBACKS) {
    try {
      console.log(`Attempting to use model: ${modelName}${customApiKey ? ' (custom API key)' : ''}`);
      const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI;
      const model = genAI.getGenerativeModel({ model: modelName });
      return await generateWithModelEnhanced(model, designPrompt, userContext);
    } catch (error: any) {
      console.error(`Model ${modelName} failed:`, error.message);
      lastError = error;
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        console.log(`Quota exceeded for ${modelName}, trying next model...`);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Detect website category from prompt and context
 */
function detectCategory(
  prompt: string,
  userContext: { businessType?: string; category?: string }
): string {
  // If category is explicitly provided, use it
  if (userContext.category) {
    return userContext.category;
  }
  
  const lowerPrompt = prompt.toLowerCase();
  const businessType = (userContext.businessType || '').toLowerCase();
  
  // Check for category keywords
  if (lowerPrompt.includes('crypto') || lowerPrompt.includes('wallet') || lowerPrompt.includes('blockchain') || lowerPrompt.includes('fintech')) {
    return 'Crypto/Fintech';
  }
  
  if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('personal') || lowerPrompt.includes('creative') || lowerPrompt.includes('designer')) {
    return 'Creative/Portfolio';
  }
  
  if (lowerPrompt.includes('hr') || lowerPrompt.includes('human resources') || lowerPrompt.includes('employee') || businessType.includes('hr') || businessType.includes('b2b')) {
    return 'HR/B2B';
  }
  
  if (lowerPrompt.includes('developer') || lowerPrompt.includes('api') || lowerPrompt.includes('infrastructure') || lowerPrompt.includes('ai platform') || lowerPrompt.includes('sdk')) {
    return 'Developer/Infrastructure';
  }
  
  if (lowerPrompt.includes('component') || lowerPrompt.includes('library') || lowerPrompt.includes('design system') || lowerPrompt.includes('docs')) {
    return 'Component Library';
  }
  
  if (lowerPrompt.includes('waitlist') || lowerPrompt.includes('early access') || lowerPrompt.includes('productivity')) {
    return 'SaaS/Productivity';
  }
  
  // Default to SaaS/Tech
  return 'SaaS/Tech';
}

async function generateWithModelEnhanced(
  model: any,
  enhancedPrompt: string,
  userContext: {
    agencyType?: string;
    projectGoal?: string;
    colorTheme?: string;
    businessType?: string;
    theme?: string;
    colorScheme?: string;
  }
) {
  const businessTypeContext = userContext.businessType || userContext.agencyType || 'General';
  
  // Generate design system and inject it
  const themeId = userContext.theme || 'professional';
  const colorSchemeId = userContext.colorScheme || userContext.colorTheme || 'dark';
  const designSystem = generateDesignSystem(themeId, colorSchemeId);
  const designSystemPrompt = designSystemToPrompt(designSystem);

  // The enhanced prompt already includes all design specifications
  // We just need to add the HTML structure template and design system
  const finalPrompt = `${designSystemPrompt}

${enhancedPrompt}

📋 REQUIRED HTML STRUCTURE:
- Complete, production-ready HTML code
- All styles embedded in <style> tag
- All JavaScript embedded in <script> tag
- Responsive design (mobile-first)
- Smooth animations and transitions
- Proper semantic HTML5 structure

⚡ OUTPUT FORMAT: Complete HTML code ONLY. NO markdown. NO backticks. Start with <!DOCTYPE html>`;

  const result = await model.generateContent(finalPrompt);
  const response = await result.response;
  let code = response.text();

  // Clean up the response
  code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Ensure all links use # to prevent navigation
  code = code.replace(/href="http[^"]*"/g, 'href="#"');
  code = code.replace(/href='http[^']*'/g, "href='#'");
  
  // Add script to prevent all navigation
  const preventNavScript = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function(e) {
        if (this.getAttribute('href') && this.getAttribute('href').startsWith('http')) {
          e.preventDefault();
          return false;
        }
      });
    });
  });
</script>`;
  
  if (code.includes('</body>')) {
    code = code.replace('</body>', preventNavScript + '</body>');
  } else {
    code += preventNavScript;
  }

  return code;
}

