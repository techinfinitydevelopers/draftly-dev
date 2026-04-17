import { GoogleGenerativeAI } from '@google/generative-ai';
import { canUseGemini3Flash, incrementGemini3FlashCalls } from './gemini-model-tracker';

// Validate Gemini API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey.trim() === '') {
  console.error('⚠️ Missing or empty GEMINI_API_KEY environment variable');
  console.error('Please add it to your Vercel environment variables or .env.local file');
  console.error('Get your API key from: https://makersuite.google.com/app/apikey');
}

const defaultGenAI = (apiKey && apiKey.trim() !== '') 
  ? new GoogleGenerativeAI(apiKey.trim())
  : null;

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

/**
 * CINEMATIC IMMERSIVE WEBSITE GENERATOR V3
 * HEAVY 3D ANIMATIONS with Three.js, particles, and immersive effects
 * Fixed internal navigation
 */
export async function generateCinematicWebsiteV3(
  prompt: string,
  userContext: {
    theme?: string;
    colorScheme?: string;
    businessType?: string;
  },
  customApiKey?: string
) {
  // Check if we have a valid API key
  if (!customApiKey && !defaultGenAI) {
    const error = new Error('GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in your Vercel project settings or .env.local file. Get your API key from https://makersuite.google.com/app/apikey');
    (error as any).code = 'UNAUTHENTICATED';
    throw error;
  }
  
  // Validate custom API key if provided
  if (customApiKey && customApiKey.trim() === '') {
    const error = new Error('Custom API key is empty. Please provide a valid Gemini API key.');
    (error as any).code = 'UNAUTHENTICATED';
    throw error;
  }
  
  let lastError: any = null;
  
  // Try gemini-3-flash-preview first for speed, then pro if needed
  const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI!;
  
  // First try flash (faster) - no daily limit check needed for flash
  try {
    console.log(`🎬 Generating HEAVY 3D cinematic website with gemini-3-flash-preview (fast model)`);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const businessType = userContext.businessType || 'General';
    const enhancedPrompt = buildHeavy3DPrompt(prompt, businessType, userContext.theme, userContext.colorScheme);
    
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    let code = response.text();

    // Clean up
    code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    
    // CRITICAL: Fix all external navigation to be internal only (keep internal # links)
    code = code.replace(/href="https?:\/\/[^"]*"/g, 'href="#"');
    code = code.replace(/href='https?:\/\/[^']*'/g, "href='#'");
    code = code.replace(/href="www\.[^"]*"/g, 'href="#"');
    
    // CRITICAL: Remove or hide any Three.js canvas elements that create black boxes
    // This fixes the black box issue that moves around the screen
    code = code.replace(/<canvas([^>]*)>/gi, '<canvas$1 style="display:none !important; opacity:0 !important; visibility:hidden !important; position:fixed !important; pointer-events:none !important;">');
    
    // Hide any canvas elements by ID or class
    code = code.replace(/id="([^"]*canvas[^"]*)"/gi, 'id="$1" style="display:none !important; opacity:0 !important;"');
    code = code.replace(/class="([^"]*canvas[^"]*)"/gi, 'class="$1" style="display:none !important; opacity:0 !important;"');
    
    // Remove Three.js scene initialization if it creates visible black boxes
    if (code.includes('THREE') || code.includes('three.js') || code.includes('Three.js')) {
      // Hide any Three.js renderer canvas
      code = code.replace(
        /(renderer\.domElement|scene\.add|new THREE\.|THREE\.)/gi,
        (match) => {
          if (match.includes('domElement')) {
            return match + '.style.display = "none"; ' + match + '.style.opacity = "0"; ' + match + '.style.visibility = "hidden"; ' + match;
          }
          return '// ' + match + ' - disabled to prevent black boxes';
        }
      );
      
      // Disable Three.js rendering
      code = code.replace(/renderer\.render\([^)]+\);/gi, '// renderer.render disabled to prevent black boxes');
      code = code.replace(/animate\([^)]*\)/gi, '// animate function disabled to prevent black boxes');
      
      // Hide canvas after Three.js initialization
      code = code.replace(
        /(const|let|var)\s+renderer\s*=\s*new\s+THREE\.WebGLRenderer\([^)]*\);/gi,
        '$1 renderer = new THREE.WebGLRenderer(); renderer.domElement.style.display = "none"; renderer.domElement.style.opacity = "0"; renderer.domElement.style.visibility = "hidden";'
      );
    }
    
    // Remove Three.js CDN if present (optional - we already told it not to include)
    code = code.replace(/<script[^>]*three\.js[^>]*><\/script>/gi, '<!-- Three.js removed to prevent black boxes -->');
    
    return code;
  } catch (error: any) {
    console.warn(`Gemini-3-flash-preview failed, trying pro:`, error.message);
    // Continue to pro model
  }
  
  // Try gemini-3-pro-preview if flash failed (under 20 calls/day)
  const canUseGemini3 = await canUseGemini3Flash();
  if (canUseGemini3) {
    try {
      console.log(`🎬 Generating HEAVY 3D cinematic website with gemini-3-pro-preview (best model for animations & UI)`);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
      
      const businessType = userContext.businessType || 'General';
      const enhancedPrompt = buildHeavy3DPrompt(prompt, businessType, userContext.theme, userContext.colorScheme);
      
      const result = await model.generateContent(enhancedPrompt);
      const response = await result.response;
      let code = response.text();

      // Clean up
      code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // CRITICAL: Fix all external navigation to be internal only (keep internal # links)
      code = code.replace(/href="https?:\/\/[^"]*"/g, 'href="#"');
      code = code.replace(/href='https?:\/\/[^']*'/g, "href='#'");
      code = code.replace(/href="www\.[^"]*"/g, 'href="#"');
      
      // CRITICAL: Remove or hide any Three.js canvas elements that create black boxes
      // This fixes the black box issue that moves around the screen
      code = code.replace(/<canvas([^>]*)>/gi, '<canvas$1 style="display:none !important; opacity:0 !important; visibility:hidden !important; position:fixed !important; pointer-events:none !important;">');
      code = code.replace(/id="([^"]*canvas[^"]*)"/gi, 'id="$1" style="display:none !important; opacity:0 !important;"');
      code = code.replace(/class="([^"]*canvas[^"]*)"/gi, 'class="$1" style="display:none !important; opacity:0 !important;"');
      if (code.includes('THREE') || code.includes('three.js') || code.includes('Three.js')) {
        code = code.replace(/(renderer\.domElement|scene\.add|new THREE\.|THREE\.)/gi, (match) => {
          if (match.includes('domElement')) {
            return match + '.style.display = "none"; ' + match + '.style.opacity = "0"; ' + match + '.style.visibility = "hidden"; ' + match;
          }
          return '// ' + match + ' - disabled to prevent black boxes';
        });
        code = code.replace(/renderer\.render\([^)]+\);/gi, '// renderer.render disabled to prevent black boxes');
        code = code.replace(/animate\([^)]*\)/gi, '// animate function disabled to prevent black boxes');
        code = code.replace(/(const|let|var)\s+renderer\s*=\s*new\s+THREE\.WebGLRenderer\([^)]*\);/gi, '$1 renderer = new THREE.WebGLRenderer(); renderer.domElement.style.display = "none"; renderer.domElement.style.opacity = "0"; renderer.domElement.style.visibility = "hidden";');
      }
      code = code.replace(/<script[^>]*three\.js[^>]*><\/script>/gi, '<!-- Three.js removed to prevent black boxes -->');
      
      // Increment daily call count (non-blocking)
      incrementGemini3FlashCalls().catch(err => console.error('Failed to increment call count:', err));
      
      return code;
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
      console.log(`🎬 Generating HEAVY 3D cinematic website with ${modelName}`);
      const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI!;
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const businessType = userContext.businessType || 'General';
      const enhancedPrompt = buildHeavy3DPrompt(prompt, businessType, userContext.theme, userContext.colorScheme);
      
      const result = await model.generateContent(enhancedPrompt);
      const response = await result.response;
      let code = response.text();

      // Clean up
      code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // CRITICAL: Fix all external navigation to be internal only (keep internal # links)
      code = code.replace(/href="https?:\/\/[^"]*"/g, 'href="#"');
      code = code.replace(/href='https?:\/\/[^']*'/g, "href='#'");
      code = code.replace(/href="www\.[^"]*"/g, 'href="#"');
      // Ensure internal anchor links (#home, #features, etc.) are preserved and work
      
      // CRITICAL: Remove or hide any Three.js canvas elements that create black boxes
      // This fixes the black box issue that moves around the screen
      code = code.replace(/<canvas([^>]*)>/gi, '<canvas$1 style="display:none !important; opacity:0 !important; visibility:hidden !important; position:fixed !important; pointer-events:none !important;">');
      code = code.replace(/id="([^"]*canvas[^"]*)"/gi, 'id="$1" style="display:none !important; opacity:0 !important;"');
      code = code.replace(/class="([^"]*canvas[^"]*)"/gi, 'class="$1" style="display:none !important; opacity:0 !important;"');
      if (code.includes('THREE') || code.includes('three.js') || code.includes('Three.js')) {
        code = code.replace(/(renderer\.domElement|scene\.add|new THREE\.|THREE\.)/gi, (match) => {
          if (match.includes('domElement')) {
            return match + '.style.display = "none"; ' + match + '.style.opacity = "0"; ' + match + '.style.visibility = "hidden"; ' + match;
          }
          return '// ' + match + ' - disabled to prevent black boxes';
        });
        code = code.replace(/renderer\.render\([^)]+\);/gi, '// renderer.render disabled to prevent black boxes');
        code = code.replace(/animate\([^)]*\)/gi, '// animate function disabled to prevent black boxes');
        code = code.replace(/(const|let|var)\s+renderer\s*=\s*new\s+THREE\.WebGLRenderer\([^)]*\);/gi, '$1 renderer = new THREE.WebGLRenderer(); renderer.domElement.style.display = "none"; renderer.domElement.style.opacity = "0"; renderer.domElement.style.visibility = "hidden";');
      }
      code = code.replace(/<script[^>]*three\.js[^>]*><\/script>/gi, '<!-- Three.js removed to prevent black boxes -->');
      
      return code;
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
}

function buildHeavy3DPrompt(userPrompt: string, businessType: string, theme?: string, colorScheme?: string): string {
  // Import design system to get correct colors
  const { generateDesignSystem } = require('./design-system');
  
  // Get design system colors based on theme and color scheme
  const designSystem = generateDesignSystem(theme || 'professional', colorScheme || 'dark');
  
  // Use the exact colors from the design system
  const accentColor = designSystem.colors.accent;
  const primaryColor = designSystem.colors.primary;
  const secondaryColor = designSystem.colors.secondary;
  const backgroundColor = designSystem.colors.background;
  const textColor = designSystem.colors.text;
  
  // Convert hex to RGB for rgba values
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '168, 85, 247';
  };
  
  const accentRgb = hexToRgb(accentColor);
  const primaryRgb = hexToRgb(primaryColor);
  
  // Get theme-specific typography
  const fontFamily = designSystem.typography.fontFamily;
  const headingFont = designSystem.typography.headingFont || designSystem.typography.fontFamily;

  return `You are an ELITE 3D WEB DESIGNER creating IMMERSIVE, ANIMATED, CINEMATIC websites with HEAVY 3D effects like Spline, Three.js, and premium Framer sites.

USER REQUEST: ${userPrompt}
BUSINESS TYPE: ${businessType}
${theme ? `THEME: ${theme}` : ''}
${colorScheme ? `COLOR SCHEME: ${colorScheme}` : ''}

🎯 CRITICAL DESIGN RULES - FOLLOW EXACTLY:

**TYPOGRAPHY & TEXT STYLING (MANDATORY - WITH OVERFLOW PROTECTION):**
- Headlines: Use large, bold fonts with clamp() for responsiveness: clamp(32px, 5vw, 72px) on desktop, clamp(24px, 4vw, 48px) on mobile
  - Font weight: 700-900 (extra bold)
  - Line height: 1.1-1.2 (tight for impact)
  - Letter spacing: -0.02em to -0.05em (tight tracking)
  - Use gradient text effects: linear-gradient(135deg, ${accentColor}, ${accentColor}dd)
  - Add text-shadow for depth: 0 4px 20px rgba(${accentRgb}, 0.4)
  - CRITICAL: overflow: hidden, text-overflow: ellipsis, white-space: nowrap (for single-line) OR word-wrap: break-word (for multi-line)
  - CRITICAL: max-width: 100% on all text containers, padding: 0 16px minimum
- Subheadings: clamp(20px, 3vw, 32px), weight 500-600, line-height 1.4, max-width: 100%, overflow: hidden
- Body text: clamp(14px, 2vw, 18px), weight 400, line-height 1.7-1.8 (readable), max-width: 100%, word-wrap: break-word
- Paragraph spacing: margin-bottom: 24px minimum
- Text contrast: White (#ffffff) or very light gray (#e5e7eb) on dark backgrounds
- Font family: ${fontFamily} (USE THIS EXACT FONT)
- Heading font: ${headingFont} (USE THIS EXACT FONT)
- TEXT OVERFLOW PROTECTION (MANDATORY):
  * All text containers: box-sizing: border-box, max-width: 100%, padding: 0 16px minimum
  * Headlines: overflow: hidden, text-overflow: ellipsis (single line) OR word-wrap: break-word, overflow-wrap: break-word (multi-line)
  * Use CSS clamp() for all font sizes to ensure responsive scaling
  * Test on mobile: text should never overflow container, always wrap or truncate gracefully
  * Add min-width: 0 to flex/grid items containing text to allow shrinking

**SPACING & LAYOUT (MANDATORY):**
- Section padding: 120-160px vertical on desktop, 80-100px on mobile
- Container max-width: 1400px, centered with margin: 0 auto
- Element spacing: Minimum 32px between major elements, 24px between related items
- Card padding: 40-60px inside cards for breathing room
- Grid gaps: 32-48px between grid items
- Mobile spacing: Reduce all spacing by 40% on mobile (max-width: 768px)

**VISUAL HIERARCHY (MANDATORY):**
- Hero section: Largest text (72px+), most prominent, full viewport height or 80vh minimum
- Section headings: 48-56px, clearly separated with 48px margin-top
- Card titles: 24-28px, bold (600-700 weight)
- Use visual weight: Larger elements = more important
- Z-index layering: Background (0) < Content (1) < Navbar (100) < Modals (1000)

**IMAGES & MEDIA (MANDATORY - CRITICAL - MUST INCLUDE MANY RELEVANT IMAGES):**
- CRITICAL: Include AT LEAST 8-12 high-quality Unsplash images that are RELEVANT TO THE USER PROMPT
- CRITICAL: Images MUST match the business type, industry, and user's specific request
- CRITICAL: Use CORRECT Unsplash image URLs that actually load:
  * Format: https://images.unsplash.com/photo-[PHOTO_ID]?w=[WIDTH]&h=[HEIGHT]&fit=crop&q=80&auto=format
  * Use valid photo IDs from Unsplash (not random numbers)
  * Example valid IDs: 1460925895917, 1551434678, 1600880292203, 1522071820081, 1497366216548, 1484788984921, 1506905925342, 1516321318, 1522205408456, 1531409377084
  * Always include width and height parameters: w=1200&h=800 for hero, w=800&h=600 for cards
  * Add &auto=format for automatic format optimization
  * Add &dpr=2 for retina displays
  * CRITICAL: Test image URLs - they must be valid Unsplash photo IDs
- Analyze the user prompt: "${userPrompt}" and business type: "${businessType}"
- Search for images that match keywords from the prompt (e.g., if prompt mentions "restaurant", use food/restaurant images)
- Hero image: Must be relevant to the main topic (e.g., tech startup = modern office/tech, restaurant = food/dining, fitness = gym/workout)
- Feature images: Each feature card should have an image that visually represents that specific feature
- About image: Should match the business context (e.g., team photo for company, product photo for product business)
- Use Unsplash search terms: Extract keywords from user prompt and use relevant photo IDs
- Example: If prompt is "fitness app", use fitness/workout/gym images, NOT generic business images
- Example: If prompt is "coffee shop", use coffee/cafe/barista images, NOT tech images
- Example: If prompt is "SaaS platform", use tech/software/office images, NOT food images
- Use different photo IDs for variety - don't repeat the same image
- Always include width and height attributes: width="1200" height="800"
- Add loading="lazy" to all images below the fold
- Use proper error handling: onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"
- Include fallback divs with gradients/icons that show if image fails to load
- Image sizing: Use proper aspect ratios (16:9 for hero, 4:3 for cards, 1:1 for avatars)
- Add border-radius: 16-24px to images for modern look
- Image shadows: box-shadow: 0 20px 60px rgba(0,0,0,0.3)
- Alt text: Always include descriptive alt attributes based on content
- Add onload handler: onload="this.style.opacity='1'; this.classList.add('loaded');"
- Initial opacity: style="opacity:0; transition: opacity 0.3s ease-in-out;"
- Image placement:
  * Hero section: 1 large hero image (1200x800)
  * Each feature card: 1 image per card (800x600)
  * About section: 1 large image (800x600)
  * Gallery/Portfolio: 6-9 images if applicable
  * Team section: Profile images if applicable
- Example structure:
  <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop&q=80&auto=format&dpr=2" 
       alt="Real description based on business type" 
       width="1200" 
       height="800"
       loading="lazy"
       style="opacity:0; transition: opacity 0.3s ease-in-out;"
       onload="this.style.opacity='1';"
       onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
  <div style="display:none; width:100%; height:400px; background:linear-gradient(135deg, ${primaryColor}, ${accentColor}); border-radius:16px; display:flex; align-items:center; justify-content:center;">
    <i class="fas fa-image" style="font-size:48px; opacity:0.3;"></i>
  </div>

**COLORS & CONTRAST (MANDATORY - USE THESE EXACT COLORS FROM DESIGN SYSTEM):**
- Background: ${backgroundColor} (USE THIS EXACT COLOR)
- Primary: ${primaryColor} (USE THIS EXACT COLOR)
- Secondary: ${secondaryColor} (USE THIS EXACT COLOR)
- Accent: ${accentColor} (USE THIS EXACT COLOR)
- Text: ${textColor} (USE THIS EXACT COLOR)
- Accent RGB: ${accentRgb} (for rgba values)
- Primary RGB: ${primaryRgb} (for rgba values)
- Hover states: Lighten accent by 10-15% or add glow effect
- Button backgrounds: ${accentColor} with ${textColor} text
- Ensure WCAG AA contrast: Minimum 4.5:1 for body text, 3:1 for large text

**VISUAL STYLE:**
- Background: ${backgroundColor} with TEXTURED GRAINY OVERLAY (CRITICAL - NOT plain black)
  * Use animated grain texture: background-image with SVG noise filter
  * Grain opacity: 0.08-0.12 (more visible than before)
  * Add subtle gradient overlay: linear-gradient(135deg, rgba(${accentRgb}, 0.05), rgba(${primaryRgb}, 0.03))
  * Use CSS pattern or SVG noise for textured effect
  * Example: background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E")
  * Animate grain: animation: grain-move 8s steps(10) infinite
  * Multiple layers: base color + grain + subtle gradient for depth
- Glassmorphism: backdrop-filter: blur(20px), background: rgba(255,255,255,0.05)
- Large rounded corners: 24-32px for cards, 12-16px for buttons
- Glowing shadows: box-shadow: 0 0 40px rgba(${accentRgb}, 0.3) on interactive elements
- Border: 1px solid rgba(255,255,255,0.1) for subtle definition

**ULTRA-AGGRESSIVE ANIMATIONS & UI DESIGN (CRITICAL - GEMINI 3 POWERED):**
- CRITICAL: DO NOT USE THREE.JS - IT CREATES BLACK BOXES THAT MOVE AROUND THE SCREEN
- Instead, use PURE CSS ANIMATIONS and SVG for all 3D effects:
  * Use CSS transforms (perspective, rotateX, rotateY, rotateZ) for 3D card effects
  * Use SVG paths with CSS animations for morphing shapes
  * Use CSS gradients with animated positions for depth
  * Use backdrop-filter and blur for glassmorphism effects
  * Use CSS clip-path for advanced shape animations
  * Use CSS mask-image for reveal animations
  * NO Three.js canvas elements - they create black boxes
  * If Three.js is absolutely required, make the canvas invisible: display: none !important; opacity: 0 !important;
- 150+ floating particles with SUBTLE glow effects, varying sizes (3px-6px), and organic movement patterns with trail effects
  * CRITICAL: DECREASE PARTICLE OPACITY for subtlety (opacity: 0.2-0.4, NOT 0.8-1.0)
  * Subtle colors: Use lightened accent color (mix with white 20-30%) with reduced opacity
  * Reduced opacity: rgba(accent_rgb, 0.2-0.4) - subtle, not intense
  * Subtle glow: box-shadow: 0 0 10px accent_color, 0 0 20px rgba(accent_rgb, 0.3), 0 0 30px rgba(accent_rgb, 0.15)
  * Particle size: 3-6px (moderate size for subtle effect)
  * Brightness: Particles should be subtle, complementing the textured background
  * Mouse interaction: Particles react subtly to cursor movement (5-10px displacement)
- GSAP ScrollTrigger on EVERY section with aggressive easing (power4.out, elastic.out, bounce.out, back.out)
- CRITICAL: ANIMATIONS THROUGHOUT ENTIRE PAGE, NOT JUST BACKGROUND
  * Every text element should have animations: fade-in, slide-in, scale, or reveal effects
  * Every image should have animations: parallax, fade-in, zoom, or slide effects
  * Every card should have animations: stagger reveal, hover effects, 3D transforms
  * Every button should have animations: pulse, glow, scale, or magnetic effects
  * Every section should have unique entrance animations
  * Use ScrollTrigger to animate elements as they enter viewport
  * Stagger animations: Elements appear one after another with delays (0.1s, 0.2s, 0.3s)
  * Continuous animations: Floating, pulsing, rotating effects on various elements
  * Text animations: Letter-by-letter reveal, word-by-word fade, gradient shifts
  * Image animations: Parallax scroll, zoom on hover, fade-in on load
  * Card animations: Lift on hover, stagger reveal, 3D tilt
  * Background animations: Subtle movement, gradient shifts, texture animation
- Multi-layer parallax: moderate mouse tracking (elements move 10-20px with cursor), scroll parallax, and depth-based transforms
  * Parallax effects should be subtle but noticeable
  * 3D shapes: Move 5-10px with mouse cursor for subtle interaction
  * Particles: React to mouse with 5-10px displacement for subtle movement
  * Background elements: Shift 10-20px with cursor for noticeable parallax effect
  * Use smooth easing for natural movement
- Advanced card animations: 3D tilt on hover (rotateX: -12deg, rotateY: 12deg, translateZ: 50px) with perspective and shadow expansion
- Staggered reveal animations: elements fade in with scale (0.8 to 1.0), rotation (-10deg to 0deg), and blur effects (blur(10px) to blur(0px)) with 0.05s increments
- Continuous floating animations: aggressive sine-wave motion (translateY: -25px to +25px, 3s ease-in-out infinite) with rotation
- ADVANCED TEXT ANIMATIONS (CRITICAL - APPLY TO ALL TEXT):
  * Letter-by-letter reveal: ALL headlines and important text should fade in letter-by-letter with stagger (0.03s per letter)
  * Gradient text animations: ALL headings should have animated gradient positions (0% to 100%), color shifts, and shimmer effects with 2s duration
  * Text morphing: ALL text should transform with scale and rotation on scroll (use Intersection Observer)
  * Typing effect: Hero headlines should appear character by character with cursor effect
  * Text wave: ALL subheadings should animate in wave pattern (translateY: -10px to +10px with delay per letter)
  * Glitch effect: Text glitches with random position shifts on hover (apply to all headings)
  * Text glow pulse: ALL text should have pulsing shadows with accent color (0 0 20px to 0 0 40px, 2s infinite)
  * Split text reveal: ALL section headings should split into two parts that slide in from opposite sides
  * Fade-in on scroll: ALL paragraphs and descriptions should fade in when scrolled into view
  * Scale animation: ALL text should scale from 0.9 to 1.0 on page load with stagger
  * CRITICAL: Apply animations to EVERY text element - headlines, subheadings, paragraphs, button text, nav links
- Pulse glow effects: buttons and CTAs with aggressive breathing glow (0.7x to 1.3x scale, 1.5s ease-in-out infinite)
- Morphing shapes: SVG paths that morph on scroll or hover with smooth transitions
- Liquid/magnetic button effects: buttons that aggressively attract cursor (move 10-15px toward cursor) and deform with scale
- Text reveal animations: letters fade in individually with stagger effect (0.05s delay between letters)
- IMAGE ANIMATIONS (CRITICAL - APPLY TO ALL IMAGES):
  * Slide in from sides: ALL images should slide in from left/right with blur-to-focus effect (blur(20px) to blur(0px))
  * Scale on scroll: ALL images should scale from 0.8 to 1.0 when scrolled into view (use Intersection Observer)
  * Parallax effect: ALL images should move at different speeds on scroll (transform: translateY with scroll position)
  * Hover zoom: ALL images should zoom to 1.15x on hover with smooth transition
  * Fade in: ALL images should fade in from opacity 0 to 1 on page load with stagger (0.1s delay between images)
  * Rotate on hover: ALL images should rotate slightly (-5deg to +5deg) on hover
  * Glow effect: ALL images should have subtle glow that intensifies on hover (box-shadow with accent color)
  * Mask reveal: ALL images should reveal with a mask animation (clip-path or mask-image animation)
  * CRITICAL: Apply animations to EVERY image - hero images, feature images, gallery images, about images
- Scroll-triggered animations: elements animate based on scroll position (Intersection Observer) with aggressive transforms
- Micro-interactions: hover states with aggressive scale (1.1x), rotation (5deg), color transitions, and shadow changes
- Loading animations: skeleton screens, progress bars, and animated placeholders with pulse effects
- Smooth page transitions: fade between sections with aggressive easing curves (cubic-bezier(0.68, -0.55, 0.265, 1.55))
- Interactive backgrounds: animated gradients, noise textures, and geometric patterns that respond to mouse
- Particle trails: cursor leaves intense particle trail (10-15 particles) on hover over interactive elements
- Magnetic navigation: menu items aggressively move toward cursor on hover (15-20px movement)
- Advanced hover states: cards lift aggressively (translateY: -30px) with shadow expansion, images zoom (scale: 1.15) with overlay effects
- Text overflow protection: ALL text must have overflow: hidden, text-overflow: ellipsis, word-wrap: break-word, max-width constraints
- Font size responsive: Use clamp() for responsive font sizes (e.g., clamp(24px, 4vw, 48px)) to prevent overflow
- Container constraints: All text containers must have max-width, padding, and proper box-sizing
- Smooth continuous animations: all animations should be 60fps, smooth, aggressive, and visually stunning
- ADVANCED CSS ANIMATIONS (CRITICAL - ADD THESE MODERN EFFECTS):
  * Morphing blob backgrounds: Use CSS clip-path with animated SVG paths for organic blob shapes
  * Liquid scroll effects: Elements flow and morph as user scrolls (use CSS transforms with scroll position)
  * Magnetic buttons: Buttons that attract cursor with smooth movement (use JavaScript mouse tracking)
  * Staggered grid reveals: Grid items appear one by one with scale and fade animations
  * Text split animations: Split text into words/letters that animate individually on scroll
  * Gradient text animations: Animated gradient positions on text (linear-gradient with animated background-position)
  * Image reveal masks: Images reveal with animated clip-path or mask-image
  * Card flip animations: 3D card flips on hover using CSS perspective and rotateY
  * Smooth scroll snap: Use CSS scroll-snap for smooth section transitions
  * Loading shimmer effects: Skeleton loaders with animated gradient shimmer
  * Hover ripple effects: Click/touch ripple animations using CSS pseudo-elements
  * Parallax layers: Multiple layers moving at different speeds for depth
  * Glitch text effects: Random character position shifts on hover (CSS transforms)
  * Neon glow pulse: Pulsing glow effects on buttons and CTAs
  * Floating elements: Continuous floating animations with sine waves
  * Scale on scroll: Elements scale up as they enter viewport
  * Blur to focus: Elements start blurred and come into focus on scroll
  * Slide in from edges: Elements slide in from left/right/top/bottom with stagger
  * Rotate on scroll: Elements rotate slightly as they enter viewport
  * Color shift animations: Background colors shift smoothly on scroll or hover

**BUTTONS & CTAs (MANDATORY):**
- Primary button: ${accentColor} background, ${textColor} text, padding: 16px 32px
- Border-radius: 12px (rounded but not pill-shaped)
- Font size: 16px, weight 600, letter-spacing: 0.5px
- Hover: Scale 1.05, add glow: box-shadow: 0 0 30px rgba(${accentRgb}, 0.6)
- Transition: all 0.3s ease
- Secondary button: Transparent with border: 2px solid ${accentColor}, ${accentColor} text
- Button spacing: 16px gap between buttons

**NAVIGATION (CRITICAL - ACTUAL MULTI-PAGE STRUCTURE, NOT SECTIONS):**
- CRITICAL: Generate ACTUAL SEPARATE HTML PAGES, NOT just sections on a single page
- Create a single HTML file with JavaScript-based page routing that shows/hides different page content
- Use JavaScript to switch between pages when navbar links are clicked
- Structure: Each "page" should be a separate div with display: none by default, and JavaScript shows the active page
- Pages to create based on user prompt (NOT always the same 5 pages):
  * Home page (default visible)
  * Additional pages based on user prompt (e.g., if user mentions "products", create Products page; if "services", create Services page)
  * DO NOT always create the same pages - analyze the user prompt and create relevant pages
- Fixed navbar with glassmorphism (backdrop-filter: blur(20px))
- Navbar height: 80px, padding: 0 40px
- Navbar links should trigger JavaScript page switching, NOT smooth scroll
- NEVER use external URLs (http://, https://, www.)
- JavaScript MUST handle page switching (MANDATORY - include this exact code in <script> tag):
  // Page switching function - CRITICAL: This creates actual separate pages, NOT sections
  function showPage(pageId) {
    // Hide all pages with fade out animation
    document.querySelectorAll('.page').forEach(page => {
      page.style.opacity = '0';
      page.style.transform = 'translateX(-20px)';
      setTimeout(() => {
        page.style.display = 'none';
      }, 200);
    });
    // Show selected page with fade in animation
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.style.display = 'block';
      setTimeout(() => {
        targetPage.style.opacity = '1';
        targetPage.style.transform = 'translateX(0)';
      }, 50);
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Update active nav link
    document.querySelectorAll('nav a').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === pageId) {
        link.classList.add('active');
      }
    });
  }
  // Add click handlers to nav links - CRITICAL: Use data-page attribute, NOT href="#"
  document.querySelectorAll('nav a[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const pageId = this.getAttribute('data-page');
      if (pageId) {
        showPage(pageId);
      }
      return false;
    });
  });
  // Show home page by default on load
  window.addEventListener('DOMContentLoaded', function() {
    showPage('home');
  });
- Each page div MUST have: class="page" and unique id (e.g., id="home", id="products", id="services")
- Each page MUST have CSS: transition: opacity 0.3s ease, transform 0.3s ease; opacity: 0; transform: translateX(-20px);
- Only one page should be visible at a time (display: block for active, display: none for others)
- Navbar links MUST use data-page="home" instead of href="#home"
- Active link styling: ${accentColor} color or underline
- Navigation MUST switch between actual separate pages, NOT scroll to sections

**CONTENT GENERATION (CRITICAL - MUST INCLUDE REAL CONTENT - NO PLACEHOLDERS):**
- CRITICAL: Generate COMPLETE, REAL content based on user prompt and business type
- DO NOT use placeholder text like "[Powerful Headline]", "[Compelling subheadline]", "[Write a compelling story]", "[Additional details]"
- Write actual headlines, descriptions, and content relevant to the business type
- Include real feature descriptions, benefits, and value propositions
- Write compelling copy that matches the business context
- Use industry-specific terminology and language
- Create authentic, professional content - not generic placeholders
- For each section, write complete, meaningful content:
  * Hero: Real headline (e.g., "Transform Your Business with AI-Powered Solutions" not "[Powerful Headline]")
  * Hero: Real subheadline (e.g., "Streamline operations and boost productivity with our cutting-edge platform" not "[Compelling subheadline]")
  * Features: Real feature names and descriptions (e.g., "Advanced Analytics" with description "Track performance metrics in real-time" not "[Feature Name]")
  * About: Real company story (e.g., "Founded in 2020, we've helped over 10,000 businesses..." not "[Write a compelling story]")
  * All sections must have complete, real content - never use brackets or placeholders

**STRUCTURE - COMPLETE MULTI-PAGE WEBSITE WITH REAL CONTENT:**
Generate a complete HTML file with MULTIPLE PAGES (not sections) based on user prompt: "${userPrompt}"

CRITICAL: Analyze the user prompt and create RELEVANT PAGES, NOT always the same 5 pages. For example:
- If prompt mentions "products" or "shop", create a Products page
- If prompt mentions "services", create a Services page  
- If prompt mentions "portfolio" or "gallery", create a Portfolio page
- If prompt mentions "blog", create a Blog page
- Create pages that make sense for the business type: "${businessType}"

Each page should be a separate div with class="page" and unique id. Only one page visible at a time.

1. TEXTURED GRAINY BACKGROUND (CRITICAL - NOT plain black)
   - Base background: ${backgroundColor} with animated grain texture overlay
   - Grain opacity: 0.08-0.12 (visible but subtle)
   - Use SVG noise filter or CSS pattern for grain effect
   - Add subtle gradient overlay for depth
   - Animate grain with CSS animation for dynamic texture
   - Multiple layers: base color + grain + gradient for rich texture
2. ANIMATED GRADIENT BACKGROUND (NO THREE.JS - CRITICAL):
   - CRITICAL: DO NOT use Three.js - it creates black boxes that move around the screen
   - Use ONLY animated CSS gradients that shift colors smoothly
   - Create multiple gradient layers that move and blend: linear-gradient and radial-gradient
   - Use accent colors with low opacity (0.1-0.2) for subtle background effects
   - Animate gradient positions with CSS keyframes (background-position: 0% 0% to 100% 100%)
   - Add animated mesh gradient patterns using CSS (no Three.js)
   - Use backdrop-filter: blur() for depth effects instead of 3D shapes
   - Use CSS transforms (perspective, rotate3d) for 3D-like effects without Three.js
   - Use SVG animations for complex shapes
   - ABSOLUTELY NO Three.js canvas elements - they will be removed automatically
3. 150+ floating particles with SUBTLE glow (position: absolute, z-index: 1) - PURE CSS, NO THREE.JS
   - CRITICAL: Use CSS div elements with border-radius: 50% for particles, NOT Three.js
   - CRITICAL: DECREASE PARTICLE OPACITY for subtlety (opacity: 0.15-0.3, NOT 0.8-1.0)
   - Particle size: 2-4px (smaller, more subtle)
   - Use subtle accent color with reduced opacity: rgba(accent_rgb, 0.15-0.3)
   - Subtle glow: box-shadow: 0 0 8px accent_color, 0 0 15px rgba(accent_rgb, 0.2)
   - Brightness: Use lighter shades of accent color (mix with white 30-40%) with reduced opacity
   - Particle trail: Add subtle trailing effect with opacity fade using CSS animations
   - Ensure particles are subtle background elements, not dominant
   - CRITICAL: Particles should be small CSS divs with border-radius, NOT Three.js shapes or black blocks
   - Animate particles with CSS keyframes (translate, scale, opacity)
3. Custom cursor (ring + dot) with smooth following
4. Fixed navbar (internal links only, z-index: 100) with actual brand name/logo
5. Hero section (full viewport height, centered content, large headline)
   - MUST include: Real headline based on business type and user prompt
   - MUST include: Real subheadline explaining value proposition
   - MUST include: Hero image from Unsplash (use proper photo ID)
   - MUST include: Call-to-action buttons with real text
   - MUST include: Trust indicators or stats if relevant
6. Features section (3-6 feature cards in grid, icons, titles, descriptions)
   - MUST include: Real feature names and descriptions
   - MUST include: Feature images from Unsplash (one per card)
   - MUST include: Icons that match the features
   - MUST include: Benefits and value propositions
7. About section (2 columns: text left, image right OR image left, text right)
   - MUST include: Real company/business story (e.g., "Founded in 2020, we've been helping businesses..." NOT "[Write a compelling story]")
   - MUST include: Mission, values, or unique selling points (e.g., "Our mission is to empower businesses..." NOT "[Additional details]")
   - MUST include: About image from Unsplash (use proper photo ID like photo-1600880292203-757bb62b4baf)
   - MUST include: Compelling narrative about the business (complete paragraphs, not placeholders)
8. Additional sections (add based on business type):
   - Services/Products section if applicable
   - Testimonials section with real quotes (if relevant)
   - Pricing section if SaaS/business
   - Portfolio/Gallery if creative business
   - Team section if relevant
9. Contact section (form or contact info, centered)
   - MUST include: Contact form or contact information
   - MUST include: Social media links
   - MUST include: Location or address if relevant
10. Footer (minimal, links, copyright)
    - MUST include: Navigation links
    - MUST include: Social media icons
    - MUST include: Copyright notice

**JAVASCRIPT MUST INCLUDE:**
- Textured grainy background animation (CSS or SVG-based)
  * Animate grain texture with CSS keyframes
  * Use requestAnimationFrame for smooth grain movement
  * Multiple grain layers for depth
- ANIMATED CSS GRADIENT BACKGROUND (NO THREE.JS - CRITICAL):
  * CRITICAL: DO NOT use Three.js - it creates black boxes that move around the screen
  * Use ONLY pure CSS animated gradients:
    - Create multiple gradient layers: background: linear-gradient() and radial-gradient()
    - Animate gradient positions with CSS keyframes: @keyframes gradientShift { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
    - Use blend modes: mix-blend-mode: overlay, multiply, screen for depth
    - Add animated SVG patterns for texture (no JavaScript needed)
    - Use backdrop-filter: blur() for glassmorphism effects
    - Use CSS transforms (perspective, rotate3d) for 3D-like depth
    - Multiple layers create depth without Three.js
  * ABSOLUTELY NO Three.js - any Three.js canvas will be automatically hidden
- Particle system (150+ particles with SUBTLE glow, random positions, floating animation) - PURE CSS, NO THREE.JS
  * CRITICAL: Use CSS div elements with border-radius: 50%, NOT Three.js Points or geometry
  * CRITICAL: DECREASE PARTICLE OPACITY for subtlety (opacity: 0.2-0.4, NOT 0.8-1.0)
  * Particle size: 3-6px (moderate size)
  * Subtle colors: Use lightened accent color (mix with white 20-30%) with reduced opacity
  * Reduced opacity: rgba(accent_rgb, 0.2-0.4) - subtle, not intense
  * Subtle glow effects: 
    - box-shadow: 0 0 10px accent_color, 0 0 20px rgba(accent_rgb, 0.3), 0 0 30px rgba(accent_rgb, 0.15)
    - filter: blur(1px) for soft glow
  * Brightness: Ensure particles are subtle, complementing textured background
  * Particle trail: Add subtle trailing particles with opacity fade using CSS animations
  * Ensure particles are subtle background elements, not dominant
  * Animate with CSS keyframes: @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
- Custom cursor animation (ring follows mouse, dot at cursor position) - **KEEP THIS, IT'S ESSENTIAL - HIGHLY VISIBLE ON DARK BACKGROUNDS**
  * Ring follows slowly (0.15 lerp factor)
  * Dot follows faster (0.25 lerp factor)
  * Ring size: 32px (larger for visibility), border: 3px solid accent color
  * Dot size: 10px with intense glow
  * CRITICAL: Enhanced visibility on dark backgrounds - use intense glow: box-shadow: 0 0 40px rgba(accent_rgb, 1), 0 0 80px rgba(accent_rgb, 0.7)
  * Ring background: rgba(accent_rgb, 0.15) with backdrop-filter: blur(4px) for visibility
  * Grows to 60px on hover over links/buttons with even more intense glow
  * Accent color glow effect with multiple shadow layers for maximum visibility
  * Hidden on mobile devices
- GSAP ScrollTrigger for all sections (fade in from bottom) - smooth easing
- Mouse parallax (elements move based on mouse position) - VISIBLE and engaging - PURE CSS/JS, NO THREE.JS
  * CRITICAL: Use JavaScript mouse events with CSS transforms, NOT Three.js
  * CRITICAL: Make parallax effects MORE VISIBLE on dark backgrounds
  * Increase movement range: 20-40px (not just 5-10px) for clear visibility
  * Apply to cards and images: Elements should move noticeably with mouse (10-20px translation)
  * Apply to particles: CSS particles should react to mouse position with visible movement
  * Use easing for smooth but visible movement
  * Ensure parallax effects are clearly noticeable, not too subtle
  * Use requestAnimationFrame for smooth 60fps parallax
- Smooth scroll handler (MANDATORY - see navigation section above)
- Image loading handlers: Add onload events to all images to fade them in smoothly
- Active navigation highlighting: Use Intersection Observer to highlight current section
- Hover effects (cards lift, buttons glow) - smooth transitions
- Intersection Observer for scroll animations - trigger at 70% viewport
- Image error handling: Show fallback when images fail to load
- All animations should be 60fps, smooth, and never jarring

**RESPONSIVE DESIGN (MANDATORY):**
- Mobile-first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Stack columns on mobile (flex-direction: column)
- Reduce font sizes: 60% on mobile, 80% on tablet
- Reduce padding: 50% on mobile
- Hide or simplify animations on mobile for performance
- Touch-friendly buttons: min-height: 44px, min-width: 44px

**CODE QUALITY:**
- Use semantic HTML5 elements (header, nav, section, article, footer)
- Inline CSS in <style> tag (no external files)
- Inline JavaScript in <script> tag (no external files)
- Include all CDN links: GSAP (for animations), Google Fonts
- DO NOT include Three.js CDN - it creates black boxes
- Use CSS animations and SVG instead of Three.js
- Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Proper indentation and formatting

**COLOR REPLACEMENT (CRITICAL - REPLACE ALL PLACEHOLDERS):**
Replace ACCENT_COLOR with ${accentColor}
Replace PRIMARY_COLOR with ${primaryColor}
Replace SECONDARY_COLOR with ${secondaryColor}
Replace BACKGROUND_COLOR with ${backgroundColor}
Replace TEXT_COLOR with ${textColor}
Replace ACCENT_RGB with ${accentRgb}
Replace PRIMARY_RGB with ${primaryRgb}

**THEME-SPECIFIC REQUIREMENTS:**
Theme: ${theme || 'professional'}
- Visual Style: ${designSystem.visualStyle.gradients ? 'Use gradients' : 'Solid colors only'}
- Shadows: ${designSystem.visualStyle.shadows ? 'Use shadows for depth' : 'Flat design'}
- Glassmorphism: ${designSystem.visualStyle.glassmorphism ? 'Use backdrop blur effects' : 'No glassmorphism'}
- Neon Effects: ${designSystem.visualStyle.neon ? 'Use glowing neon effects' : 'No neon effects'}
- Border Radius: Small ${designSystem.borderRadius.small}, Medium ${designSystem.borderRadius.medium}, Large ${designSystem.borderRadius.large}

**IMAGE LOADING (CRITICAL):**
- Use reliable image sources: https://images.unsplash.com/photo-* with proper parameters
- Add onload handlers to show images when loaded
- Use proper error handling: onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg...';"
- Include loading="lazy" for below-fold images
- Add proper width and height attributes to prevent layout shift
- Use srcset for responsive images when possible


**CRITICAL CONTENT REQUIREMENTS:**
- DO NOT use placeholder text like "[Powerful Headline]", "[Compelling subheadline]", "[Write a compelling story]"
- Generate REAL, ACTUAL content based on the user prompt and business type
- Write complete headlines, descriptions, feature names, and all text content
- Use the business type context to create relevant, industry-specific content
- Include real value propositions, benefits, and descriptions
- Make all content authentic and professional - no generic placeholders
- Example: If business type is "E-commerce", write about products, shopping, online store features
- Example: If business type is "SaaS", write about software features, productivity, business solutions
- Example: If business type is "Restaurant", write about food, dining experience, menu highlights

**CRITICAL IMAGE RELEVANCE REQUIREMENTS:**
- CRITICAL: ALL images MUST be relevant to the user prompt: "${userPrompt}" and business type: "${businessType}"
- Extract keywords from the user prompt (e.g., "fitness app" = fitness/workout images, "coffee shop" = coffee/cafe images)
- Use Unsplash search to find relevant photo IDs based on prompt keywords
- Hero image: Must visually represent the main topic/industry from the prompt
- Feature images: Each feature card image must match that specific feature (e.g., "analytics" feature = charts/graphs image)
- About image: Must match business context (team photo for company, product photo for product business)
- DO NOT use generic/random images - every image must have a purpose and relevance
- If prompt mentions specific industry/product/service, use images from that industry
- Example: Prompt "fitness tracking app" → use fitness/gym/workout images, NOT business/tech images
- Example: Prompt "coffee roastery" → use coffee/beans/roasting images, NOT food/restaurant images
- Example: Prompt "SaaS project management" → use tech/software/office images, NOT generic business images

OUTPUT: Complete HTML starting with <!DOCTYPE html>. NO markdown. NO backticks. Include ALL styles and scripts inline. Generate REAL content, not placeholders.`;
}

export default generateCinematicWebsiteV3;
