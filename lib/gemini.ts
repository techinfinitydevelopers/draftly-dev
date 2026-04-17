import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateDesignSystem, designSystemToPrompt } from './design-system';
import { canUseGemini3Flash, incrementGemini3FlashCalls } from './gemini-model-tracker';

// Validate Gemini API key
if (!process.env.GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable');
  console.error('Please add it to your Vercel environment variables');
}

const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model fallback chain - try these in order if quota exceeded
// Note: gemini-3-pro-preview is tried first (if under daily limit), so not in fallback list
// Prioritized for UI design generation quality
const MODEL_FALLBACKS = [
  'gemini-3-flash-preview',     // ⭐⭐⭐⭐⭐ Gemini 3 Flash Preview - Fast and capable
  'gemini-2.5-flash-lite',      // ⭐⭐⭐⭐ Super cheap, fast, good for bulk
  'gemini-2.5-pro',             // ⭐⭐⭐⭐⭐ Stable Gemini 2.5 Pro
  'gemini-2.0-flash',           // ⭐⭐⭐⭐ Stable Gemini 2.0 Flash
  'gemini-2.0-flash-001',       // ⭐⭐⭐⭐ Stable Gemini 2.0 Flash 001
  'gemini-flash-latest',        // ⭐⭐⭐ Latest Flash
  'gemini-pro-latest',          // ⭐⭐⭐ Latest Pro
  'gemini-2.0-flash-exp',       // ⭐⭐ Experimental 2.0
  'gemini-1.5-flash-latest',    // ⭐⭐ Stable 1.5 Flash
  'gemini-1.5-pro-latest',      // ⭐⭐ Stable 1.5 Pro
  'gemini-pro'                  // Final fallback
];

export async function generateUICode(
  prompt: string,
  userContext: {
    agencyType?: string;
    projectGoal?: string;
    colorTheme?: string;
    businessType?: string;
    theme?: string;
    colorScheme?: string;
  },
  customApiKey?: string
) {
  let lastError: any = null;
  const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI;

  // Primary UI path: Gemini 3 Flash Preview (fast, strong layout + motion instructions)
  try {
    console.log(`Using gemini-3-flash-preview (primary UI model)${customApiKey ? ' (custom API key)' : ''}`);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    return await generateWithModel(model, prompt, userContext);
  } catch (error: any) {
    console.error(`Gemini-3-flash-preview failed:`, error.message);
    lastError = error;
    if (!error.message?.includes('quota') && !error.message?.includes('429')) {
      throw error;
    }
  }

  // Heavier reasoning when shared daily budget allows
  const canUseGemini3 = await canUseGemini3Flash();
  if (canUseGemini3) {
    try {
      console.log(`Using gemini-3-pro-preview (fallback — complex UI)${customApiKey ? ' (custom API key)' : ''}`);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
      const result = await generateWithModel(model, prompt, userContext);
      await incrementGemini3FlashCalls();
      return result;
    } catch (error: any) {
      console.error(`Gemini-3-pro-preview failed:`, error.message);
      lastError = error;
      if (!error.message?.includes('quota') && !error.message?.includes('429')) {
        throw error;
      }
    }
  } else {
    console.log(`⚠️ Gemini-3-pro-preview daily limit reached (20 calls), using remaining fallbacks`);
  }

  // Remaining fallbacks (flash already attempted)
  for (const modelName of MODEL_FALLBACKS.filter((m) => m !== 'gemini-3-flash-preview')) {
    try {
      console.log(`Attempting to use model: ${modelName}${customApiKey ? ' (custom API key)' : ''}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      return await generateWithModel(model, prompt, userContext);
    } catch (error: any) {
      console.error(`Model ${modelName} failed:`, error.message);
      lastError = error;
      
      // If it's a quota error, try next model
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        console.log(`Quota exceeded for ${modelName}, trying next model...`);
        continue;
      }
      
      // If it's not a quota error, throw immediately
      throw error;
    }
  }
  
  // If all models failed, throw the last error
  throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

async function generateWithModel(
  model: any,
  prompt: string,
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
  
  // Generate design system from theme and color scheme
  const themeId = userContext.theme || 'professional';
  const colorSchemeId = userContext.colorScheme || userContext.colorTheme || 'dark';
  const designSystem = generateDesignSystem(themeId, colorSchemeId);
  const designSystemPrompt = designSystemToPrompt(designSystem);

  const enhancedPrompt = `You are an expert web designer creating a HIGHLY DYNAMIC, ANIMATED, and VISUALLY STUNNING website.

USER REQUEST: ${prompt}
BUSINESS TYPE: ${businessTypeContext}

${designSystemPrompt}

🎨 MANDATORY COLOR PALETTE - USE THESE EXACT COLORS:
${getColorPaletteForTheme(colorSchemeId)}

🎯 THEME-SPECIFIC DESIGN REQUIREMENTS:
${getThemeSpecificDesign(themeId, businessTypeContext)}

⚡ CRITICAL QUALITY REQUIREMENTS:

1. **CONTENT QUALITY** - NO PLACEHOLDERS:
   - Write REAL, compelling copy specific to ${businessTypeContext}
   - Use industry-specific terminology and value propositions
   - Create persuasive CTAs that drive action
   - NO generic text like "Lorem ipsum" or "[Insert text here]"
   - Every headline should be powerful and attention-grabbing
   - Every description should provide real value

2. **VISUAL HIERARCHY**:
   - Use size, color, and spacing to guide the eye
   - Headlines should be 3-4x larger than body text
   - Important CTAs should stand out with contrasting colors
   - Use whitespace strategically to create breathing room

3. **MODERN DESIGN PATTERNS**:
   - Glassmorphism: backdrop-blur-md with semi-transparent backgrounds
   - Neumorphism: subtle shadows for depth
   - Gradients: Use linear-gradient and radial-gradient liberally
   - Rounded corners: rounded-2xl for modern feel
   - Shadows: Use multiple shadow layers for depth

4. **RESPONSIVE DESIGN**:
   - Mobile-first approach with md: and lg: breakpoints
   - Stack columns on mobile, grid on desktop
   - Touch-friendly button sizes (min 44px height)
   - Readable font sizes (16px minimum on mobile)

5. **PERFORMANCE & IMAGE LOADING (CRITICAL)**:
   - Use reliable Unsplash URLs: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop&q=80&auto=format
   - ALWAYS include width and height attributes: width="1200" height="800"
   - Add loading="lazy" to all images below the fold
   - Use proper error handling: onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"
   - Include fallback divs with gradients/icons that show if image fails to load
   - Add onload handler: onload="this.style.opacity='1'; this.classList.add('loaded');"
   - Initial opacity: style="opacity:0; transition: opacity 0.3s ease-in-out;"
   - Example structure:
     <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop" 
          alt="Description" 
          width="1200" 
          height="800"
          loading="lazy"
          style="opacity:0; transition: opacity 0.3s ease-in-out;"
          onload="this.style.opacity='1';"
          onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
     <div style="display:none; width:100%; height:400px; background:linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR); border-radius:16px; display:flex; align-items:center; justify-content:center;">
       <i class="fas fa-image" style="font-size:48px; opacity:0.3;"></i>
     </div>

📋 REQUIRED HTML STRUCTURE WITH ANIMATIONS & IMAGES:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prompt}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800&family=Raleway:wght@400;500;600;700;800&family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; overflow-x: hidden; }
    html { scroll-behavior: smooth; }
    
    /* 🎬 ADVANCED ANIMATIONS */
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes fadeInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-100px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 5px PRIMARY_COLOR; } 50% { box-shadow: 0 0 20px PRIMARY_COLOR, 0 0 30px ACCENT_COLOR; } }
    
    .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
    .animate-fade-in-left { animation: fadeInLeft 0.8s ease-out forwards; }
    .animate-fade-in-right { animation: fadeInRight 0.8s ease-out forwards; }
    .animate-scale-in { animation: scaleIn 0.6s ease-out forwards; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
    .animate-rotate { animation: rotate 20s linear infinite; }
    .animate-bounce { animation: bounce 2s ease-in-out infinite; }
    .animate-slide-left { animation: slideInLeft 0.8s ease-out forwards; }
    .animate-slide-right { animation: slideInRight 0.8s ease-out forwards; }
    .animate-zoom { animation: zoomIn 0.6s ease-out forwards; }
    .animate-glow { animation: glow 2s ease-in-out infinite; }
    
    .fade-in { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
    .fade-in.show { opacity: 1; transform: translateY(0); }
    
    .hover-lift { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .hover-lift:hover { transform: translateY(-12px); box-shadow: 0 25px 50px rgba(0,0,0,0.2); }
    
    .hover-scale { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .hover-scale:hover { transform: scale(1.08); }
    
    .hover-rotate { transition: all 0.4s ease; }
    .hover-rotate:hover { transform: rotate(5deg) scale(1.05); }
    
    .gradient-text { background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    
    .shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); background-size: 200% 100%; animation: shimmer 2s infinite; }
    
    .parallax { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    
    /* Image loading animation */
    img { transition: opacity 0.3s ease-in-out; }
    img[loading="lazy"] { opacity: 0; }
    img[loading="lazy"].loaded { opacity: 1; }
  </style>
</head>
<body style="background: BACKGROUND_COLOR;">

  <!-- 🎯 ANIMATED HEADER -->
  <header class="fixed w-full top-0 backdrop-blur-md border-b z-50 animate-fade-in-up" style="background: rgba(255,255,255,0.9); border-color: PRIMARY_COLOR;">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold gradient-text">Logo</div>
      <nav class="hidden md:flex gap-8">
        <a href="#home" class="transition-colors" style="color: TEXT_COLOR; opacity: 0.8;">Home</a>
        <a href="#features" class="transition-colors" style="color: TEXT_COLOR; opacity: 0.8;">Features</a>
        <a href="#about" class="transition-colors" style="color: TEXT_COLOR; opacity: 0.8;">About</a>
        <a href="#contact" class="transition-colors" style="color: TEXT_COLOR; opacity: 0.8;">Contact</a>
      </nav>
      <button class="px-6 py-2 rounded-lg font-medium hover-scale" style="background: PRIMARY_COLOR; color: BACKGROUND_COLOR;">Get Started</button>
    </div>
  </header>

  <!-- 🚀 HERO SECTION WITH IMAGES & ANIMATIONS -->
  <section id="home" class="relative pt-32 pb-24 px-6 overflow-hidden" style="background: linear-gradient(135deg, BACKGROUND_COLOR 0%, SECONDARY_COLOR 100%);">
    <!-- Animated Background Elements -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-20 left-10 w-72 h-72 rounded-full animate-float" style="background: radial-gradient(circle, PRIMARY_COLOR, transparent);"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 rounded-full animate-pulse-slow" style="background: radial-gradient(circle, ACCENT_COLOR, transparent);"></div>
      <div class="absolute top-1/2 left-1/2 w-64 h-64 rounded-full animate-rotate opacity-20" style="background: conic-gradient(from 0deg, PRIMARY_COLOR, ACCENT_COLOR, PRIMARY_COLOR);"></div>
    </div>
    
    <div class="max-w-7xl mx-auto relative z-10">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <!-- Left: Text Content -->
        <div class="text-left space-y-6">
          <h1 class="text-5xl md:text-7xl font-bold leading-tight animate-fade-in-left" style="color: TEXT_COLOR;">
            [Powerful Headline for ${businessTypeContext}]
          </h1>
          <p class="text-xl md:text-2xl animate-fade-in-left" style="color: TEXT_COLOR; opacity: 0.85; animation-delay: 0.2s;">
            [Compelling subheadline that explains the value proposition]
          </p>
          <div class="flex gap-4 animate-fade-in-left" style="animation-delay: 0.4s;">
            <button class="px-8 py-4 rounded-lg text-lg font-semibold hover-lift animate-glow" style="background: ACCENT_COLOR; color: BACKGROUND_COLOR;">
              Get Started <i class="fas fa-arrow-right ml-2"></i>
            </button>
            <button class="px-8 py-4 rounded-lg text-lg font-semibold border-2 hover-lift hover-scale" style="border-color: ACCENT_COLOR; color: TEXT_COLOR; background: transparent;">
              Learn More
            </button>
          </div>
          <!-- Stats/Trust Indicators -->
          <div class="grid grid-cols-3 gap-6 pt-8 animate-fade-in-up" style="animation-delay: 0.6s;">
            <div class="text-center">
              <div class="text-3xl font-bold gradient-text">10K+</div>
              <div class="text-sm" style="color: TEXT_COLOR; opacity: 0.7;">Happy Users</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold gradient-text">99%</div>
              <div class="text-sm" style="color: TEXT_COLOR; opacity: 0.7;">Satisfaction</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold gradient-text">24/7</div>
              <div class="text-sm" style="color: TEXT_COLOR; opacity: 0.7;">Support</div>
            </div>
          </div>
        </div>
        
        <!-- Right: Hero Image/Visual -->
        <div class="animate-fade-in-right relative">
          <div class="absolute -inset-4 rounded-2xl animate-pulse-slow" style="background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR); opacity: 0.2; filter: blur(20px);"></div>
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop&q=80&auto=format&dpr=2" 
               alt="Hero Image" 
               loading="lazy"
               class="w-full h-auto rounded-2xl hover-scale relative z-10"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="w-full h-96 rounded-2xl flex items-center justify-center hover-scale relative z-10" style="display:none; background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR);">
            <i class="fas fa-rocket text-9xl opacity-20" style="color: BACKGROUND_COLOR;"></i>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ✨ FEATURES SECTION WITH IMAGES & ANIMATIONS -->
  <section id="features" class="py-24 px-6" style="background: BACKGROUND_COLOR;">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 fade-in">
        <h2 class="text-5xl font-bold mb-4 gradient-text">Amazing Features</h2>
        <p class="text-xl max-w-2xl mx-auto" style="color: TEXT_COLOR; opacity: 0.8;">Discover what makes us different</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Feature Card 1 -->
        <div class="group p-8 rounded-2xl hover-lift fade-in relative overflow-hidden" style="background: SECONDARY_COLOR; border: 2px solid PRIMARY_COLOR;">
          <div class="absolute top-0 right-0 w-32 h-32 rounded-full animate-pulse-slow" style="background: radial-gradient(circle, ACCENT_COLOR, transparent); opacity: 0.3;"></div>
          <div class="mb-6 overflow-hidden rounded-xl relative">
            <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=800&fit=crop&q=80&auto=format&dpr=2" 
                 alt="Feature 1" 
                 loading="lazy"
                 class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-full h-48 rounded-xl flex items-center justify-center" style="display:none; background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR);">
              <i class="fas fa-rocket text-6xl opacity-30 animate-bounce" style="color: TEXT_COLOR;"></i>
            </div>
          </div>
          <div class="relative z-10">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-float" style="background: PRIMARY_COLOR;">
              <i class="fas fa-rocket text-2xl" style="color: BACKGROUND_COLOR;"></i>
            </div>
            <h3 class="text-2xl font-bold mb-3" style="color: ACCENT_COLOR;">Fast Performance</h3>
            <p style="color: TEXT_COLOR; opacity: 0.8;">Lightning-fast speeds that keep your users engaged and satisfied.</p>
          </div>
        </div>
        
        <!-- Feature Card 2 -->
        <div class="group p-8 rounded-2xl hover-lift fade-in" style="background: SECONDARY_COLOR; border: 2px solid PRIMARY_COLOR; animation-delay: 0.1s;">
          <div class="mb-6 overflow-hidden rounded-xl">
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop" 
                 alt="Feature 2" 
                 class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-full h-48 rounded-xl flex items-center justify-center" style="display:none; background: linear-gradient(135deg, ACCENT_COLOR, SECONDARY_COLOR);">
              <i class="fas fa-users text-6xl opacity-30" style="color: TEXT_COLOR;"></i>
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-3" style="color: ACCENT_COLOR;">Team Collaboration</h3>
          <p style="color: TEXT_COLOR; opacity: 0.8;">Work together seamlessly with powerful collaboration tools.</p>
        </div>
        
        <!-- Feature Card 3 -->
        <div class="group p-8 rounded-2xl hover-lift fade-in" style="background: SECONDARY_COLOR; border: 2px solid PRIMARY_COLOR; animation-delay: 0.2s;">
          <div class="mb-6 overflow-hidden rounded-xl">
            <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop" 
                 alt="Feature 3" 
                 class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-full h-48 rounded-xl flex items-center justify-center" style="display:none; background: linear-gradient(135deg, SECONDARY_COLOR, PRIMARY_COLOR);">
              <i class="fas fa-shield-alt text-6xl opacity-30" style="color: TEXT_COLOR;"></i>
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-3" style="color: ACCENT_COLOR;">Secure & Reliable</h3>
          <p style="color: TEXT_COLOR; opacity: 0.8;">Enterprise-grade security to protect your valuable data.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 💼 ABOUT SECTION WITH IMAGE -->
  <section id="about" class="py-24 px-6" style="background: BACKGROUND_COLOR;">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="fade-in">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=600&fit=crop" 
               alt="About Us" 
               class="w-full h-auto rounded-2xl shadow-2xl hover-scale"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="w-full h-96 rounded-2xl flex items-center justify-center" style="display:none; background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR);">
            <i class="fas fa-building text-9xl opacity-20" style="color: BACKGROUND_COLOR;"></i>
          </div>
        </div>
        <div class="fade-in">
          <h2 class="text-5xl font-bold mb-6 gradient-text">About Us</h2>
          <p class="text-xl mb-6 leading-relaxed" style="color: TEXT_COLOR; opacity: 0.9;">[Write compelling story about the business, its mission, and values]</p>
          <p class="text-lg mb-8" style="color: TEXT_COLOR; opacity: 0.8;">[Additional details about what makes this business unique]</p>
          <button class="px-8 py-4 rounded-lg font-semibold hover-lift" style="background: PRIMARY_COLOR; color: BACKGROUND_COLOR;">
            Learn More <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- 🎯 CTA SECTION -->
  <section class="py-24 px-6 relative overflow-hidden" style="background: linear-gradient(135deg, PRIMARY_COLOR, ACCENT_COLOR);">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-0 left-0 w-full h-full" style="background: url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
    </div>
    <div class="max-w-4xl mx-auto text-center relative z-10 fade-in">
      <h2 class="text-5xl font-bold mb-6" style="color: BACKGROUND_COLOR;">Ready to Get Started?</h2>
      <p class="text-2xl mb-8" style="color: BACKGROUND_COLOR; opacity: 0.9;">Join thousands of satisfied customers today</p>
      <button class="px-12 py-5 rounded-lg text-xl font-bold hover-scale" style="background: BACKGROUND_COLOR; color: PRIMARY_COLOR;">
        Start Free Trial <i class="fas fa-rocket ml-2"></i>
      </button>
    </div>
  </section>

  <!-- 📧 CONTACT/FOOTER -->
  <footer id="contact" class="py-16 px-6" style="background: SECONDARY_COLOR;">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 class="text-2xl font-bold mb-4 gradient-text">Company</h3>
          <p style="color: TEXT_COLOR; opacity: 0.7;">Building the future, one pixel at a time.</p>
        </div>
        <div>
          <h4 class="font-semibold mb-4" style="color: TEXT_COLOR;">Product</h4>
          <ul class="space-y-2" style="color: TEXT_COLOR; opacity: 0.7;">
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">Features</a></li>
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">Pricing</a></li>
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">Security</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4" style="color: TEXT_COLOR;">Company</h4>
          <ul class="space-y-2" style="color: TEXT_COLOR; opacity: 0.7;">
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">About</a></li>
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">Blog</a></li>
            <li><a href="#" class="transition" style="color: TEXT_COLOR; opacity: 0.7;">Careers</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4" style="color: TEXT_COLOR;">Connect</h4>
          <div class="flex gap-4">
            <a href="#" class="w-10 h-10 rounded-full flex items-center justify-center hover-scale" style="background: PRIMARY_COLOR; color: BACKGROUND_COLOR;">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="#" class="w-10 h-10 rounded-full flex items-center justify-center hover-scale" style="background: PRIMARY_COLOR; color: BACKGROUND_COLOR;">
              <i class="fab fa-linkedin"></i>
            </a>
            <a href="#" class="w-10 h-10 rounded-full flex items-center justify-center hover-scale" style="background: PRIMARY_COLOR; color: BACKGROUND_COLOR;">
              <i class="fab fa-instagram"></i>
            </a>
          </div>
        </div>
      </div>
      <div class="pt-8 text-center" style="border-top: 1px solid; border-color: PRIMARY_COLOR; color: TEXT_COLOR; opacity: 0.6;">
        <p>&copy; 2024 Company Name. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <script>
    // Fade-in on scroll
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('show');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    
    // Image loading handler with proper error handling
    document.querySelectorAll('img').forEach(img => {
      // Set initial opacity
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in-out';
      
      // Handle successful load
      img.addEventListener('load', function() {
        this.style.opacity = '1';
        this.classList.add('loaded');
      });
      
      // Handle image errors - show fallback
      img.addEventListener('error', function() {
        this.style.display = 'none';
        const fallback = this.nextElementSibling;
        if (fallback && fallback.tagName === 'DIV') {
          fallback.style.display = 'flex';
        }
      });
      
      // If image is already loaded (cached)
      if (img.complete && img.naturalHeight !== 0) {
        img.style.opacity = '1';
        img.classList.add('loaded');
      }
    });
    
    // Smooth scroll navigation (CRITICAL - NOT ONE-PAGER)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          const target = document.querySelector(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update active nav link
            document.querySelectorAll('nav a').forEach(link => {
              link.classList.remove('active');
            });
            this.classList.add('active');
          }
        }
      });
    });
    
    // Active navigation highlighting based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
          current = section.getAttribute('id') || '';
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
          link.classList.add('active');
          link.style.color = 'ACCENT_COLOR';
        } else {
          link.style.color = '';
        }
      });
    });
    
    // Parallax effect on scroll
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      document.querySelectorAll('.parallax').forEach(el => {
        const speed = el.dataset.speed || 0.5;
        el.style.transform = 'translateY(' + (scrolled * speed) + 'px)';
      });
    });
  </script>
</body>
</html>

🚨 CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:

1. **USER CUSTOMIZATION - HIGHEST PRIORITY**: 
   - If the user specifies ANY colors (hex codes, color names, RGB values) in their prompt, USE THOSE COLORS EXACTLY
   - If the user specifies ANY fonts in their prompt, USE THOSE FONTS EXACTLY
   - If the user specifies ANY specific design elements, INCLUDE THEM EXACTLY
   - User specifications ALWAYS override the color palette and theme suggestions
   - Example: If user says "use #FF5733 and #3498DB", use those exact colors throughout

2. **COLORS - MANDATORY IF NO USER COLORS**: 
   - Replace ALL instances of PRIMARY_COLOR, SECONDARY_COLOR, ACCENT_COLOR, TEXT_COLOR, BACKGROUND_COLOR with the EXACT hex codes from the palette above
   - The color theme "${colorSchemeId}" MUST be clearly visible throughout the ENTIRE website
   - DO NOT use ANY generic colors like "white", "black", "gray-600", "#ffffff", "#000000", etc.
   - ONLY use the hex codes from the color palette provided above (unless user specified custom colors)
   - Every single section, button, text, background MUST use colors from the palette
   - The user selected "${colorSchemeId}" - they MUST see this color scheme in the final result

3. **IMAGES - USE MANY HIGH-QUALITY UNSPLASH IMAGES**: 
   - Use AT LEAST 10-15 Unsplash images throughout the page
   - CRITICAL: Use proper Unsplash photo IDs that actually exist
   - Format: https://images.unsplash.com/photo-[VALID_ID]?w=1200&h=800&fit=crop&q=80
   - Add &auto=format&dpr=2 for better quality
   - ALWAYS include onerror fallback with gradient div + large icon
   - Test these working photo IDs:
     * Business: photo-1460925895917-afdab827c52f
     * Team: photo-1522071820081-009f0129c71c
     * Tech: photo-1551434678-e076c223a692
     * Office: photo-1497366216548-37526070297c
     * Meeting: photo-1600880292203-757bb62b4baf
     * Workspace: photo-1497366811353-6870744d04b2
     * Laptop: photo-1484788984921-03950022c9ef
     * Design: photo-1561070791-2526d30994b5
     * Startup: photo-1559136555-9303baea8ebd
     * Analytics: photo-1551288049-bebda4e38f71
   - Add images to: hero, ALL feature cards, about, testimonials, gallery, team sections
   - Use lazy loading: loading="lazy" attribute

4. **ADVANCED ANIMATIONS & UI DESIGN - MANDATORY AND HIGHLY DYNAMIC**:
   - EVERY element must have animations - no static content!
   - Use animate-fade-in-up, animate-fade-in-left, animate-fade-in-right on ALL sections
   - Add hover-lift to ALL cards (translateY -15px minimum with 3D perspective)
   - Add hover-scale to ALL buttons and images (scale 1.1-1.2 with smooth easing)
   - Use animation-delay (0.05s, 0.1s, 0.15s, 0.2s, 0.25s) for staggered effects
   - Add .fade-in class to ALL elements that should animate on scroll
   - Advanced parallax effects: multi-layer parallax, mouse tracking, depth-based transforms
   - Include at least 8 different animation types per page:
     * Fade in from different directions with blur-to-focus
     * Scale animations with elastic/bounce easing
     * 3D rotate animations (rotateX, rotateY, rotateZ) for cards
     * Slide animations with momentum
     * Bounce/elastic animations for CTAs
     * Morphing shapes and SVG path animations
     * Liquid/magnetic button effects
     * Text reveal with letter-by-letter stagger
   - Add continuous animations:
     * Floating elements (animate-float with sine-wave motion)
     * Pulsing buttons (animate-pulse-slow with glow expansion)
     * Rotating icons with smooth easing
     * Shimmer effects on loading states and gradients
     * Particle trails on hover
   - Advanced micro-interactions:
     * Button ripple effects with wave propagation
     * Icon bounces on hover with elastic easing
     * Text gradient animations with color shifts
     * Border glow effects that pulse
     * Magnetic navigation (items move toward cursor)
     * Image zoom with overlay on hover
     * Card tilt with 3D perspective on hover
   - Scroll-triggered animations: Intersection Observer for reveal effects
   - Smooth page transitions: fade between sections with custom easing curves
   - Interactive backgrounds: animated gradients, noise textures, geometric patterns

5. **CONTENT - NO LOREM IPSUM**:
   - Write REAL, compelling copy for ${businessTypeContext}
   - Use specific industry terminology
   - Create actual value propositions
   - Write persuasive CTAs
   - Make every word count - no filler text
   - Headlines should grab attention immediately
   - Descriptions should explain benefits clearly
   - Use power words: "Transform", "Accelerate", "Unlock", "Discover", "Revolutionary"

6. **STRUCTURE - ADD MORE SECTIONS**:
   - Add at least 8-10 feature cards (not just 3)
   - Add testimonials section with 3-6 customer quotes and profile images
   - Add stats/numbers section with animated counters if relevant
   - Add pricing section if it's a SaaS/service business
   - Add gallery/portfolio section with 6-9 images if relevant
   - Add FAQ section with 5-8 questions
   - Add team section with member photos if relevant
   - Each section should have a clear purpose and value

7. **STYLING - PREMIUM QUALITY**:
   - Use gradient-text class for headings
   - Add glassmorphism effects (backdrop-blur)
   - Use rounded-2xl for modern look
   - Add shadows and depth (multiple shadow layers)
   - Make it look PREMIUM and LIVELY
   - Use subtle textures and patterns
   - Add border gradients for special elements
   - Use overflow-hidden for clean edges

8. **FONTS - VARIETY**:
   - Use Inter, Poppins, Montserrat, Playfair Display, Orbitron, Raleway, or Lato
   - If user specifies a font, use that font EXACTLY
   - Mix fonts for visual interest (heading font + body font)
   - Use font weights strategically (400, 500, 600, 700, 800)

9. **RESPONSIVE**: Must work perfectly on mobile, tablet, and desktop
   - Test all breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Stack elements vertically on mobile
   - Use grid-cols-1 md:grid-cols-2 lg:grid-cols-3 patterns
   - Adjust font sizes for mobile (text-3xl md:text-5xl)

10. **ACCESSIBILITY**:
    - Use semantic HTML (header, nav, main, section, footer)
    - Add alt text to all images
    - Ensure sufficient color contrast (4.5:1 minimum)
    - Use focus states for keyboard navigation
    - Add aria-labels where needed

${getDesignStyleForBusinessType(businessTypeContext)}

⚡ OUTPUT FORMAT: Complete HTML code ONLY. NO markdown. NO backticks. NO explanations. Start with <!DOCTYPE html>`;

  const result = await model.generateContent(enhancedPrompt);
  const response = await result.response;
  let code = response.text();

  // Clean up the response
  code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Ensure all external links use # to prevent navigation away
  code = code.replace(/href="http[^"]*"/g, 'href="#"');
  code = code.replace(/href='http[^']*'/g, "href='#'");

  return code;
}

function getThemeSpecificDesign(themeId: string, businessType: string): string {
  const themeKey = themeId.toLowerCase();
  
  const themeDesigns: { [key: string]: string } = {
    'professional': `
      - Clean, corporate aesthetic with sharp edges and structured layouts
      - Use grid-based layouts with clear sections
      - Minimal animations - subtle fades and slides only
      - Professional sans-serif fonts (Inter, Roboto)
      - Icons should be simple and line-based (fa-regular style)
      - White space is important - don't overcrowd
      - Use box shadows for depth, not gradients
      - Buttons should be rectangular with slight rounded corners
      - Navigation should be horizontal and fixed
    `,
    'cinematic': `
      - DRAMATIC, BOLD design with large hero sections
      - Use FULL-WIDTH images and video-style layouts
      - Dark backgrounds with high contrast text
      - Large, impactful typography (80px+ headlines)
      - Parallax scrolling effects
      - Fade-in animations with dramatic timing
      - Use film-strip style galleries
      - Add vignette effects (dark corners)
      - Buttons should be large and prominent
      - Use widescreen aspect ratios (16:9)
    `,
    'gaming': `
      - VIBRANT, ENERGETIC with neon colors and glowing effects
      - Use angular shapes and diagonal lines
      - Heavy use of gradients and color transitions
      - Animated backgrounds with particles or geometric shapes
      - Futuristic fonts (Orbitron, Exo 2)
      - Add glow effects to buttons and borders (box-shadow with color)
      - Use hexagonal or angular card shapes
      - Include progress bars and stat displays
      - Animated hover effects with scale and glow
      - RGB color shifting effects
    `,
    'minimal': `
      - ULTRA-CLEAN with maximum white space
      - Monochromatic or very limited color palette
      - Simple geometric shapes only
      - Minimal text - short, impactful phrases
      - No borders or very thin borders (1px)
      - Subtle animations - micro-interactions only
      - Large typography with lots of breathing room
      - Use of negative space as design element
      - Flat design - no shadows or depth
      - Simple line icons only
    `,
    'luxury': `
      - PREMIUM, SOPHISTICATED with elegant details
      - Use gold, bronze, or silver accent colors
      - Serif fonts for headings (Playfair Display, Cormorant)
      - Elegant animations - smooth, slow transitions
      - High-quality imagery with soft focus
      - Use of textures (subtle patterns)
      - Generous padding and spacing
      - Ornamental dividers and decorative elements
      - Soft shadows and subtle gradients
      - Cursive or script fonts for accents
    `,
  };

  return themeDesigns[themeKey] || themeDesigns['professional'];
}

function getColorPaletteForTheme(colorTheme: string): string {
  // Extract the color name from theme strings like "Ocean Blue (Professional blue)"
  const themeKey = colorTheme.toLowerCase();
  
  // Check if user provided custom colors in the prompt (hex codes or color names)
  const customColorMatch = colorTheme.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
  if (customColorMatch && customColorMatch.length >= 2) {
    return `
      PRIMARY_COLOR = ${customColorMatch[0]} (User-defined primary)
      SECONDARY_COLOR = ${customColorMatch[1] || customColorMatch[0]} (User-defined secondary)
      ACCENT_COLOR = ${customColorMatch[2] || customColorMatch[0]} (User-defined accent)
      TEXT_COLOR = #ffffff (White)
      BACKGROUND_COLOR = ${customColorMatch[3] || '#0f0f0f'} (User-defined or dark)
      
      ⚠️ USER SPECIFIED THESE COLORS - USE THEM EXACTLY!
    `;
  }
  
  const palettes: { [key: string]: string } = {
    'dark': `
      PRIMARY_COLOR = #1a1a1a (Dark Charcoal - USE FOR MAIN BACKGROUNDS)
      SECONDARY_COLOR = #2d2d2d (Medium Gray - USE FOR CARDS/SECTIONS)
      ACCENT_COLOR = #4a90e2 (Bright Blue - USE FOR BUTTONS/LINKS)
      TEXT_COLOR = #ffffff (White - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #0f0f0f (Almost Black - USE FOR PAGE BACKGROUND)
      
      ⚠️ DARK THEME - MUST USE THESE EXACT COLORS THROUGHOUT!
      ⚠️ NO WHITE BACKGROUNDS! NO BLACK TEXT! ONLY USE THESE HEX CODES!
    `,
    'blue': `
      PRIMARY_COLOR = #0066cc (Ocean Blue - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #e6f2ff (Light Blue - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #00aaff (Sky Blue - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #001a33 (Dark Blue - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ BLUE THEME - BLUES MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'ocean': `
      PRIMARY_COLOR = #0066cc (Ocean Blue - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #e6f2ff (Light Blue - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #00aaff (Sky Blue - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #001a33 (Dark Blue - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ OCEAN BLUE THEME - BLUES MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'purple': `
      PRIMARY_COLOR = #6b46c1 (Royal Purple - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #f3f0ff (Light Purple - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #9f7aea (Lavender - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #2d1b4e (Dark Purple - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ PURPLE THEME - PURPLES MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'green': `
      PRIMARY_COLOR = #059669 (Emerald Green - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #ecfdf5 (Light Green - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #10b981 (Mint Green - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #064e3b (Dark Green - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ GREEN THEME - GREENS MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'forest': `
      PRIMARY_COLOR = #059669 (Emerald Green - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #ecfdf5 (Light Green - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #10b981 (Mint Green - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #064e3b (Dark Green - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ FOREST GREEN THEME - GREENS MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'orange': `
      PRIMARY_COLOR = #ea580c (Vibrant Orange - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #fff7ed (Cream - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #fb923c (Light Orange - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #7c2d12 (Dark Orange - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ ORANGE THEME - ORANGES MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
    'sunset': `
      PRIMARY_COLOR = #ea580c (Vibrant Orange - USE FOR HEADERS/BUTTONS)
      SECONDARY_COLOR = #fff7ed (Cream - USE FOR SECTION BACKGROUNDS)
      ACCENT_COLOR = #fb923c (Light Orange - USE FOR HIGHLIGHTS/HOVER)
      TEXT_COLOR = #7c2d12 (Dark Orange - USE FOR ALL TEXT)
      BACKGROUND_COLOR = #ffffff (White - USE FOR PAGE BACKGROUND)
      
      ⚠️ SUNSET ORANGE THEME - ORANGES MUST DOMINATE! USE THESE EXACT COLORS!
      ⚠️ PRIMARY COLOR MUST BE VISIBLE IN EVERY SECTION!
    `,
  };

  // Try to match the theme key
  for (const key in palettes) {
    if (themeKey.includes(key)) {
      return palettes[key];
    }
  }
  
  // Default to dark if no match
  return palettes['dark'];
}

function getDesignStyleForBusinessType(businessType: string): string {
  const styles: { [key: string]: string } = {
    'SaaS': `
      - Modern, tech-forward with animated gradients (blues, purples, cyans, teals)
      - Glassmorphism cards with backdrop-blur and subtle borders
      - Bold, animated CTAs with glow effects on hover
      - Feature cards with icons that float and scale on hover
      - Dashboard mockups using gradient divs with icons
      - Pricing tables with hover lift effects
      - Animated statistics/metrics with counting animations
      - Use tech-related icons: fa-rocket, fa-chart-line, fa-code, fa-cloud
    `,
    'E-commerce': `
      - Clean product showcase with gradient card backgrounds
      - Animated product cards with scale and shadow on hover
      - Clear pricing with animated price tags
      - Prominent "Add to Cart" buttons with pulse animations
      - Category sections with icon-based navigation
      - Use warm, inviting colors (oranges, reds, golds)
      - Shopping icons: fa-shopping-cart, fa-bag-shopping, fa-credit-card, fa-truck
      - Testimonial section with star ratings and animations
    `,
    'Portfolio': `
      - Minimalist, artistic with strong typography and animations
      - Project showcases with hover reveal effects
      - Monochrome or bold accent colors (blacks, whites, one vibrant color)
      - Large, animated headlines with typing or fade effects
      - Skills section with animated progress bars or icon grids
      - Case study cards with parallax backgrounds
      - Use creative icons: fa-palette, fa-pen-nib, fa-camera, fa-lightbulb
      - Smooth scroll-triggered animations for each project
    `,
    'Agency': `
      - Professional, corporate with sophisticated animations
      - Case study sections with hover effects
      - Team member cards with flip or reveal animations
      - Service offerings with icon-based cards
      - Use sophisticated color palettes (navy, gold, charcoal, teal)
      - Stats/achievements with counting animations
      - Client logo sections with subtle animations
      - Icons: fa-briefcase, fa-users, fa-chart-pie, fa-handshake
    `,
    'Restaurant/Cafe': `
      - Warm, inviting with rich textures and animations
      - Menu sections with animated category tabs
      - Food item cards with hover lift and glow effects
      - Reservation CTA with pulsing animation
      - Use earthy, warm tones (browns, creams, oranges, reds)
      - Ambient background with subtle parallax
      - Icons: fa-utensils, fa-mug-hot, fa-pizza-slice, fa-wine-glass
      - Hours/location section with map placeholder (gradient div)
    `,
    'Fitness/Gym': `
      - Energetic, bold with strong animations and motion
      - Membership cards with dramatic hover effects
      - Class schedule with animated time slots
      - Before/after sections with gradient divs
      - Use vibrant, energetic colors (red, orange, lime green, electric blue)
      - Hero with intense gradient animations
      - Icons: fa-dumbbell, fa-heart-pulse, fa-person-running, fa-fire
      - Pricing tiers with scale animations on hover
    `,
    'Real Estate': `
      - Luxurious, spacious with elegant animations
      - Property listing cards with smooth hover effects
      - Search/filter section with glassmorphism
      - Use elegant neutrals with gold/bronze accents
      - Large hero with parallax background
      - Feature highlights with animated icons
      - Icons: fa-house, fa-key, fa-building, fa-location-dot
      - Virtual tour CTAs with glow effects
    `,
    'Education': `
      - Trustworthy, accessible with smooth animations
      - Course listing cards with hover lift effects
      - Enrollment CTAs with pulse animations
      - Use calming blues, greens, and warm accents
      - Progress indicators with animated bars
      - Instructor profiles with animated cards
      - Icons: fa-graduation-cap, fa-book, fa-chalkboard, fa-certificate
      - Testimonial section with student success stories
    `,
    'Healthcare': `
      - Clean, trustworthy with gentle animations
      - Appointment booking section with smooth interactions
      - Service cards with subtle hover effects
      - Use calming blues, whites, and soft greens
      - Trust indicators with animated checkmarks
      - Doctor/staff profiles with professional cards
      - Icons: fa-stethoscope, fa-heart, fa-hospital, fa-user-doctor
      - Emergency contact section with prominent CTA
    `,
    'Finance': `
      - Professional, secure with sophisticated animations
      - Data visualization placeholders with animated charts (gradient divs)
      - Trust indicators with animated security badges
      - Use blues, greens, grays, and gold accents
      - Calculator/tool sections with interactive feel
      - Feature cards with lock/security icons
      - Icons: fa-shield, fa-chart-line, fa-piggy-bank, fa-wallet
      - Testimonial section with verified badges
    `,
  };

  return styles[businessType] || `
    - Professional, modern design with attention to detail
    - Heavy use of animations and micro-interactions
    - Sophisticated color palette matching the business context
    - Icon-driven visual hierarchy
    - Smooth scroll-triggered animations throughout
    - Premium feel with textures and depth
  `;
}
