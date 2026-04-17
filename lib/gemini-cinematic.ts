import { GoogleGenerativeAI } from '@google/generative-ai';

const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MODEL_FALLBACKS = [
  'gemini-3-flash-preview',     // Gemini 3 Flash Preview — primary for cinematic UI generation
  'gemini-3-pro-preview',       // Gemini 3 Pro Preview — heavier fallback
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-pro'
];

/**
 * CINEMATIC IMMERSIVE WEBSITE GENERATOR V2
 * Generates premium Framer-quality websites with:
 * - Subtle 3D effects (no overwhelming glows)
 * - Custom cursor
 * - Smooth scroll animations
 * - Internal navigation (no external links)
 * - Dynamic colors based on prompt
 * - Professional, cinematic feel
 */
export async function generateCinematicWebsite(
  prompt: string,
  userContext: {
    theme?: string;
    colorScheme?: string;
    businessType?: string;
  },
  customApiKey?: string
) {
  let lastError: any = null;
  
  for (const modelName of MODEL_FALLBACKS) {
    try {
      console.log(`🎬 Generating cinematic website with ${modelName}`);
      const genAI = customApiKey ? new GoogleGenerativeAI(customApiKey) : defaultGenAI;
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const businessType = userContext.businessType || 'General';
      const enhancedPrompt = buildCinematicPrompt(prompt, businessType);
      
      const result = await model.generateContent(enhancedPrompt);
      const response = await result.response;
      let code = response.text();

      // Clean up
      code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Fix navigation - ensure all links are internal anchors
      code = code.replace(/href="http[^"]*"/g, 'href="#"');
      code = code.replace(/href='http[^']*'/g, "href='#'");
      
      // Add script to prevent external navigation
      const preventNavScript = `
<script>
  // Prevent all external navigation
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('http')) {
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

function buildCinematicPrompt(userPrompt: string, businessType: string): string {
  return `You are an ELITE 3D WEB DESIGNER specializing in IMMERSIVE, ANIMATED, CINEMATIC websites with HEAVY 3D effects.

You create websites that look like they were built with Spline, Three.js, and Framer - with LOTS of animations, 3D elements, and interactive effects.

USER REQUEST: ${userPrompt}
BUSINESS TYPE: ${businessType}

🎯 GLOBAL DESIGN RULES (NON-NEGOTIABLE):

1. **VISUAL STYLE**
   - Dark background (#0a0a0a or #000000)
   - Animated grain texture overlay
   - ONE dominant accent color (choose based on prompt: teal #14b8a6, cyan #06b6d4, amber #f59e0b, purple #a855f7, or red #ef4444)
   - Glassmorphism on all cards (backdrop-filter: blur(20px))
   - Rounded corners (16-32px)
   - Soft glowing shadows on interactive elements
   - Gradient overlays and color transitions

2. **TYPOGRAPHY**
   - Large, bold headings (6xl-8xl on hero)
   - Gradient text effects on main headings
   - Body text is muted (#a1a1a1)
   - Font: Inter for body, Space Grotesk or Orbitron for headings
   - Text shadows for depth

3. **LAYOUT PHILOSOPHY**
   - Floating, layered elements
   - Large spacing (100-150px between sections)
   - 3D perspective on containers
   - Elements that tilt and rotate on hover
   - Max width: 1400px

4. **HEAVY ANIMATIONS & 3D (CRITICAL)**
   - THREE.JS animated background with particles, geometric shapes, or waves
   - Floating particle system (50-100 particles)
   - GSAP ScrollTrigger on EVERY section
   - Parallax mouse tracking on hero elements
   - Rotating 3D shapes in background
   - Cards that lift and tilt on hover (translateZ, rotateX, rotateY)
   - Staggered fade-in animations on page load
   - Smooth scroll animations with easing
   - Ambient floating animations on icons
   - Scale and rotate transitions
   - All animations are SMOOTH and CONTINUOUS

5. **3D EFFECTS (MUST INCLUDE)**
   - Three.js canvas as fixed background
   - Animated 3D geometry (torus, sphere, or abstract shapes)
   - Particle system with glowing dots
   - Mouse parallax effect (elements move with cursor)
   - 3D transforms on cards (perspective: 1000px)
   - Hover effects with translateZ(50px)
   - Rotating wireframe objects
   - Depth layering with z-index

6. **CUSTOM CURSOR**
   - Custom cursor with smooth follow animation
   - Ring + dot design
   - Grows on hover over interactive elements
   - Accent color glow
   - Hidden on mobile

7. **NAVIGATION (CRITICAL - MUST BE INTERNAL)**
   - Fixed navbar at top
   - All links MUST be internal anchors: href="#home", href="#features", href="#about", href="#contact"
   - NEVER EVER use external URLs or http links
   - Smooth scroll to sections on click
   - Active section highlighting
   - Glassmorphism background

📋 REQUIRED HTML STRUCTURE WITH HEAVY 3D ANIMATIONS:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${userPrompt}</title>
  
  <!-- Essential Libraries -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Three.js for 3D -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  
  <!-- GSAP for Advanced Animations -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
  
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      cursor: none;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: #000000;
      color: #e5e5e5;
      overflow-x: hidden;
      position: relative;
    }
    
    /* 🌌 THREE.JS CANVAS BACKGROUND */
    #canvas-3d {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    
    /* 🌟 PARTICLE SYSTEM */
    #particles {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    
    .particle {
      position: absolute;
      width: 3px;
      height: 3px;
      background: ACCENT_COLOR;
      border-radius: 50%;
      animation: particle-float 15s linear infinite;
      box-shadow: 0 0 10px ACCENT_COLOR, 0 0 20px ACCENT_COLOR;
      opacity: 0.6;
    }
    
    @keyframes particle-float {
      0% { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { transform: translateY(-100vh) translateX(100px) scale(1); opacity: 0; }
    }
    
    .content-wrapper {
      position: relative;
      z-index: 2;
    }
    
    /* 🎯 CUSTOM CURSOR */
    .custom-cursor {
      position: fixed;
      width: 24px;
      height: 24px;
      border: 2px solid ACCENT_COLOR;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.15s ease;
      box-shadow: 0 0 20px rgba(ACCENT_RGB, 0.5);
    }
    
    .custom-cursor-dot {
      position: fixed;
      width: 8px;
      height: 8px;
      background: ACCENT_COLOR;
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      transition: all 0.1s ease;
      box-shadow: 0 0 10px ACCENT_COLOR;
    }
    
    .custom-cursor.hover {
      width: 50px;
      height: 50px;
      background: rgba(ACCENT_RGB, 0.1);
      border-width: 3px;
    }
    
    /* 🎨 ANIMATED GRAIN TEXTURE */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0.05;
      pointer-events: none;
      z-index: 1;
      animation: grain-move 8s steps(10) infinite;
    }
    
    @keyframes grain-move {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-5%, -10%); }
      30% { transform: translate(3%, -15%); }
      50% { transform: translate(-5%, 5%); }
      70% { transform: translate(10%, 5%); }
      90% { transform: translate(-10%, 10%); }
    }
    
    /* 🎭 GLASSMORPHISM */
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    
    .glass-dark {
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    /* ✨ HEAVY ANIMATIONS */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(50px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes float3d {
      0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
      50% { transform: translateY(-20px) rotateX(5deg) rotateY(5deg); }
    }
    
    @keyframes rotate3d {
      from { transform: rotateY(0deg) rotateX(0deg) rotateZ(0deg); }
      to { transform: rotateY(360deg) rotateX(360deg) rotateZ(360deg); }
    }
    
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(ACCENT_RGB, 0.3), 0 0 40px rgba(ACCENT_RGB, 0.1); }
      50% { box-shadow: 0 0 40px rgba(ACCENT_RGB, 0.6), 0 0 80px rgba(ACCENT_RGB, 0.3); }
    }
    
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    .fade-in-up {
      opacity: 0;
      animation: fadeInUp 1s ease forwards;
    }
    
    .float-3d {
      animation: float3d 6s ease-in-out infinite;
    }
    
    .rotate-3d {
      animation: rotate3d 20s linear infinite;
    }
    
    .pulse-glow {
      animation: pulse-glow 3s ease-in-out infinite;
    }
    
    /* 🎨 GRADIENT TEXT */
    .gradient-text {
      background: linear-gradient(135deg, ACCENT_COLOR 0%, #ffffff 50%, ACCENT_COLOR 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      background-size: 200% 200%;
      animation: gradient-shift 4s ease infinite;
    }
    
    /* 🎯 3D PERSPECTIVE */
    .perspective-container {
      perspective: 1000px;
      transform-style: preserve-3d;
    }
    
    .transform-3d {
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    }
    
    .transform-3d:hover {
      transform: translateZ(50px) rotateY(10deg) rotateX(5deg) scale(1.05);
    }
    
    /* 🔥 HOVER EFFECTS */
    .hover-lift-3d {
      transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      transform-style: preserve-3d;
    }
    
    .hover-lift-3d:hover {
      transform: translateY(-20px) translateZ(40px) scale(1.03);
      box-shadow: 0 30px 60px rgba(ACCENT_RGB, 0.3), 0 0 40px rgba(ACCENT_RGB, 0.2);
    }
    
    /* 📱 RESPONSIVE */
    @media (max-width: 768px) {
      .custom-cursor, .custom-cursor-dot {
        display: none;
      }
      * { cursor: auto !important; }
      .transform-3d:hover {
        transform: translateZ(20px) scale(1.02);
      }
      .hover-lift-3d:hover {
        transform: translateY(-10px) scale(1.02);
      }
    }
    
    /* 🎨 ACCENT COLOR UTILITIES */
    .accent-text { color: ACCENT_COLOR; }
    .accent-bg { background: ACCENT_COLOR; }
    .accent-border { border-color: ACCENT_COLOR; }
    .accent-glow { box-shadow: 0 0 30px rgba(ACCENT_RGB, 0.5); }
    
    /* 🌊 SMOOTH SCROLL */
    html {
      scroll-behavior: smooth;
    }
    
    /* 🎯 SECTION SPACING */
    section {
      padding: 150px 24px;
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
    }
    
    @media (max-width: 768px) {
      section {
        padding: 100px 20px;
      }
    }
  </style>
</head>
<body>
  <!-- 🌌 THREE.JS 3D CANVAS -->
  <canvas id="canvas-3d"></canvas>
  
  <!-- 🌟 PARTICLE SYSTEM -->
  <div id="particles"></div>
  
  <!-- 🎯 CUSTOM CURSOR -->
  <div class="custom-cursor"></div>
  <div class="custom-cursor-dot"></div>
  
  <div class="content-wrapper">
    <!-- 🧭 NAVIGATION (INTERNAL LINKS ONLY - CRITICAL) -->
    <nav class="fixed w-full top-0 z-50 glass-dark">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="text-2xl font-bold font-['Orbitron']">
          <span class="gradient-text">BRAND</span>
        </div>
        <div class="hidden md:flex gap-8">
          <a href="#home" class="text-sm text-white/70 hover:text-white transition-all duration-300">Home</a>
          <a href="#features" class="text-sm text-white/70 hover:text-white transition-all duration-300">Features</a>
          <a href="#about" class="text-sm text-white/70 hover:text-white transition-all duration-300">About</a>
          <a href="#contact" class="text-sm text-white/70 hover:text-white transition-all duration-300">Contact</a>
        </div>
        <button class="glass px-6 py-2 rounded-full text-sm hover-lift-3d accent-glow">
          Get Started
        </button>
      </div>
    </nav>
    
    <!-- 🚀 HERO SECTION -->
    <section id="home" class="min-h-screen flex items-center justify-center">
      <div class="text-center space-y-8 max-w-4xl">
        <div class="fade-in-up text-sm tracking-widest text-white/40 uppercase">
          Welcome to the Future
        </div>
        <h1 class="fade-in-up text-6xl md:text-8xl font-bold font-['Space_Grotesk'] leading-tight" style="animation-delay: 0.1s;">
          [Powerful Headline<br/>for ${businessType}]
        </h1>
        <p class="fade-in-up text-xl text-white/60 max-w-2xl mx-auto leading-relaxed" style="animation-delay: 0.2s;">
          [Compelling subheadline that explains the value proposition in a calm, confident way]
        </p>
        <div class="fade-in-up flex gap-4 justify-center" style="animation-delay: 0.3s;">
          <button class="accent-bg px-8 py-4 rounded-full text-black font-medium hover-lift">
            Start Now
          </button>
          <button class="glass px-8 py-4 rounded-full font-medium hover-lift">
            Learn More
          </button>
        </div>
      </div>
    </section>
    
    <!-- ✨ FEATURES SECTION -->
    <section id="features">
      <div class="text-center mb-20">
        <h2 class="text-5xl font-bold font-['Space_Grotesk'] mb-4">
          Key Features
        </h2>
        <p class="text-xl text-white/60 max-w-2xl mx-auto">
          Everything you need to succeed
        </p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Feature Card 1 -->
        <div class="glass rounded-3xl p-8 hover-lift feature-card">
          <div class="w-16 h-16 accent-bg rounded-2xl flex items-center justify-center mb-6 float">
            <i class="fas fa-rocket text-2xl text-black"></i>
          </div>
          <h3 class="text-2xl font-bold mb-4 font-['Space_Grotesk']">
            Fast & Reliable
          </h3>
          <p class="text-white/60 leading-relaxed">
            Lightning-fast performance that keeps your users engaged and satisfied.
          </p>
        </div>
        
        <!-- Feature Card 2 -->
        <div class="glass rounded-3xl p-8 hover-lift feature-card">
          <div class="w-16 h-16 accent-bg rounded-2xl flex items-center justify-center mb-6 float" style="animation-delay: 0.5s;">
            <i class="fas fa-shield-alt text-2xl text-black"></i>
          </div>
          <h3 class="text-2xl font-bold mb-4 font-['Space_Grotesk']">
            Secure by Default
          </h3>
          <p class="text-white/60 leading-relaxed">
            Enterprise-grade security to protect your valuable data and privacy.
          </p>
        </div>
        
        <!-- Feature Card 3 -->
        <div class="glass rounded-3xl p-8 hover-lift feature-card">
          <div class="w-16 h-16 accent-bg rounded-2xl flex items-center justify-center mb-6 float" style="animation-delay: 1s;">
            <i class="fas fa-chart-line text-2xl text-black"></i>
          </div>
          <h3 class="text-2xl font-bold mb-4 font-['Space_Grotesk']">
            Analytics Driven
          </h3>
          <p class="text-white/60 leading-relaxed">
            Make data-driven decisions with powerful analytics and insights.
          </p>
        </div>
      </div>
    </section>
    
    <!-- 💼 ABOUT SECTION -->
    <section id="about">
      <div class="grid md:grid-cols-2 gap-16 items-center">
        <div class="space-y-6">
          <h2 class="text-5xl font-bold font-['Space_Grotesk']">
            About Us
          </h2>
          <p class="text-xl text-white/70 leading-relaxed">
            [Write a compelling story about the business, its mission, and values. Focus on the human element and the problem being solved.]
          </p>
          <p class="text-lg text-white/60 leading-relaxed">
            [Additional details about what makes this business unique and why customers should trust them.]
          </p>
          <button class="accent-bg px-8 py-4 rounded-full text-black font-medium hover-lift">
            Our Story
          </button>
        </div>
        <div class="glass rounded-3xl p-12 hover-lift">
          <div class="aspect-square flex items-center justify-center">
            <i class="fas fa-building text-9xl text-white/10"></i>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 📧 CONTACT SECTION -->
    <section id="contact">
      <div class="max-w-2xl mx-auto text-center space-y-8">
        <h2 class="text-5xl font-bold font-['Space_Grotesk']">
          Get in Touch
        </h2>
        <p class="text-xl text-white/60">
          Ready to start your journey? Let's talk.
        </p>
        <button class="accent-bg px-12 py-5 rounded-full text-black font-medium text-lg hover-lift">
          Contact Us
        </button>
      </div>
    </section>
    
    <!-- 🦶 FOOTER -->
    <footer class="glass py-12 px-6 mt-32">
      <div class="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <div class="text-xl font-bold font-['Space_Grotesk'] mb-4">
            <span class="accent-text">BRAND</span>
          </div>
          <p class="text-white/40 text-sm">
            Building the future, one innovation at a time.
          </p>
        </div>
        <div>
          <h4 class="font-semibold mb-4 text-sm">Product</h4>
          <ul class="space-y-2 text-sm text-white/40">
            <li><a href="#features" class="hover:text-white transition">Features</a></li>
            <li><a href="#about" class="hover:text-white transition">About</a></li>
            <li><a href="#contact" class="hover:text-white transition">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4 text-sm">Company</h4>
          <ul class="space-y-2 text-sm text-white/40">
            <li><a href="#about" class="hover:text-white transition">About</a></li>
            <li><a href="#contact" class="hover:text-white transition">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4 text-sm">Connect</h4>
          <div class="flex gap-4">
            <a href="#" class="w-10 h-10 glass rounded-full flex items-center justify-center hover-lift text-sm">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="#" class="w-10 h-10 glass rounded-full flex items-center justify-center hover-lift text-sm">
              <i class="fab fa-linkedin"></i>
            </a>
            <a href="#" class="w-10 h-10 glass rounded-full flex items-center justify-center hover-lift text-sm">
              <i class="fab fa-github"></i>
            </a>
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-white/30 text-sm">
        <p>&copy; 2024 Company Name. All rights reserved.</p>
      </div>
    </footer>
  </div>
  
  <script>
    // 🎯 CUSTOM CURSOR
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let dotX = 0, dotY = 0;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    function animateCursor() {
      // Smooth follow for cursor ring
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
      
      // Faster follow for dot
      dotX += (mouseX - dotX) * 0.25;
      dotY += (mouseY - dotY) * 0.25;
      cursorDot.style.left = dotX + 'px';
      cursorDot.style.top = dotY + 'px';
      
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Cursor hover effect
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
    
    // 🎬 GSAP SCROLL ANIMATIONS
    gsap.registerPlugin(ScrollTrigger);
    
    // Animate feature cards on scroll
    gsap.utils.toArray('.feature-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 60,
        duration: 0.8,
        delay: i * 0.1,
        ease: 'power3.out'
      });
    });
    
    // Animate sections on scroll
    gsap.utils.toArray('section').forEach(section => {
      gsap.from(section.children, {
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          end: 'bottom 30%',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out'
      });
    });
    
    // 🌊 SMOOTH SCROLL
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>

🚨 CRITICAL REQUIREMENTS:

1. **NO EXCESSIVE GLOWS** - Only subtle shadows and soft effects
2. **INTERNAL NAVIGATION** - All href="#section" format, NO external URLs
3. **CUSTOM CURSOR** - Smooth follow animation, grows on hover
4. **SCROLL ANIMATIONS** - Every section animates with GSAP ScrollTrigger
5. **DYNAMIC COLORS** - Choose accent color based on prompt context
6. **SUBTLE 3D** - Use CSS transforms, not heavy Three.js scenes
7. **CINEMATIC FEEL** - Large spacing, calm typography, premium look
8. **RESPONSIVE** - Works on all devices (cursor hidden on mobile)
9. **SMOOTH SCROLL** - Anchor links scroll smoothly
10. **PROFESSIONAL** - Looks like $50,000 Framer site

⚡ COLOR SELECTION GUIDE:
- Healthcare/Medical: Teal #14b8a6
- Finance/Banking: Cyan #06b6d4
- E-commerce/Retail: Amber #f59e0b
- Tech/SaaS: Cyan #06b6d4
- Creative/Agency: Red #ef4444
- Default: Teal #14b8a6

Replace ACCENT_COLOR with chosen color hex.
Replace ACCENT_RGB with RGB values (e.g., 20, 184, 166 for teal).

⚡ OUTPUT: Complete HTML code ONLY. NO markdown. NO backticks. Start with <!DOCTYPE html>`;
}

export default generateCinematicWebsite;
