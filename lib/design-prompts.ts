/**
 * Comprehensive Design Prompts for Different Website Types
 * Extracted from analysis of top-tier landing pages
 * Use these prompts to guide Gemini API for generating high-quality UI designs
 */

export interface DesignPrompt {
  category: string;
  name: string;
  prompt: string;
  colorPalette: string[];
  typography: string;
  visualElements: string[];
}

export const DESIGN_PROMPTS: DesignPrompt[] = [
  {
    category: 'SaaS/Tech',
    name: 'Futuristic Tech SaaS (Harmoniq Style)',
    prompt: `Create a dark, futuristic SaaS landing page with the following specifications:

COLOR PALETTE:
- Primary Background: Deep black (#000000) transitioning to dark purple (#1a0033) gradient
- Accent Colors: Bright purple (#8B5CF6), Electric purple (#A855F7), Deep purple (#6D28D9)
- Text: Pure white (#FFFFFF) for headlines, Light gray (#E5E7EB) for body text
- Glow Effects: Bright purple (#C084FC) with 80-95% opacity for glowing elements
- Metallic Accents: Silver/chrome (#C0C0C0) for metallic objects

TYPOGRAPHY:
- Headline Font: Bold, modern sans-serif (Inter, Poppins, or Montserrat), 48-72px, weight 700-800
- Sub-headline: Regular sans-serif, 18-24px, weight 400-500, line-height 1.6
- Body Text: Sans-serif, 16px, weight 400, line-height 1.7
- Navigation: Sans-serif, 14-16px, weight 500, letter-spacing 0.5px
- Button Text: Sans-serif, 16px, weight 600, uppercase with letter-spacing 1px

LAYOUT STRUCTURE:
- Full-width hero section with left-aligned content (60% width) and right visual area (40%)
- Navigation bar: Fixed top, transparent with backdrop blur, logo left, nav links center, CTA button right
- Hero content: Announcement badge → Large headline (2 lines max) → Sub-headline (2-3 lines) → Two CTA buttons side by side
- Visual area: Floating 3D metallic objects (discs/coins) with purple glow, positioned at different angles and heights
- Diagonal light beam: Bright purple gradient beam cutting diagonally from top-center to bottom-right, creating depth

VISUAL ELEMENTS:
- Diagonal purple light beam: Linear gradient from bright purple (#C084FC) to deep purple (#6D28D9), opacity 40-60%, positioned diagonally across background
- Floating metallic objects: 3-4 disc-shaped objects with chrome/silver rims, glowing purple-blue centers (#8B5CF6), white logo symbols centered, soft shadows beneath
- Glow effects: Purple glow around objects (blur: 20-40px, spread: 5-10px), inner shadows on buttons
- Particle effects: Subtle white dots/stars scattered in dark areas, opacity 30-50%
- Gradient overlays: Purple-to-black radial gradients in corners, opacity 20-30%

BUTTONS & CTAs:
- Primary CTA: Solid black (#000000) with white text, rounded-full (pill shape), padding 16px 32px, hover: subtle scale (1.05)
- Secondary CTA: Transparent with white border (2px), white text, rounded-full, hover: white background with black text
- Navigation CTA: Light purple/white background (#F3F4F6) with dark text, rounded-full, padding 12px 24px

SPACING & SIZING:
- Section padding: 120px top, 80px bottom
- Content max-width: 1400px, centered
- Element spacing: 24px between headline and sub-headline, 32px between sub-headline and buttons
- Button spacing: 16px gap between primary and secondary buttons

ANIMATIONS:
- Floating objects: Subtle vertical float animation (translateY -10px to +10px, 3s ease-in-out infinite)
- Glow pulse: Purple glows pulse gently (opacity 60% to 90%, 2s ease-in-out infinite)
- Fade-in on scroll: Content fades in from bottom (opacity 0 to 1, translateY 30px to 0, 0.8s ease-out)

MOOD & AESTHETIC:
- Futuristic, innovative, high-tech
- Premium, sophisticated
- Modern, cutting-edge
- Professional yet dynamic`,
    colorPalette: ['#000000', '#1a0033', '#8B5CF6', '#A855F7', '#6D28D9', '#C084FC', '#FFFFFF', '#E5E7EB'],
    typography: 'Bold sans-serif (Inter/Poppins), 48-72px headlines, 18-24px sub-headlines',
    visualElements: ['Diagonal purple light beam', 'Floating metallic objects', 'Purple glows', 'Particle effects']
  },
  {
    category: 'Crypto/Fintech',
    name: 'Clean Minimalist Crypto (Ctrl Style)',
    prompt: `Create a clean, modern cryptocurrency/fintech landing page with minimalist design:

COLOR PALETTE:
- Primary Background: Pure white (#FFFFFF) for main content area
- Background Gradient: Soft multi-color gradient (light green #E8F5E9, yellow #FFF9C4, light blue #E3F2FD, pink #FCE4EC) - heavily blurred/diffused
- Text: Deep black (#1F2937) for headlines, Dark gray (#4B5563) for body text
- Accent: Bright green (#10B981) for primary CTA, Dark gray (#374151) for secondary elements
- Navigation: Light gray (#F3F4F6) for button backgrounds, Black (#000000) for text

TYPOGRAPHY:
- Logo Font: Bold, geometric sans-serif (Inter Bold, Montserrat Bold), 32-40px, custom "C" icon (square with cross)
- Headline Font: Extra bold sans-serif (Inter Black, Poppins Black), 64-80px, weight 900, tight letter-spacing (-1px)
- Tagline: Regular sans-serif, 18-20px, weight 400, letter-spacing 0.5px
- Body Text: Sans-serif, 16px, weight 400, line-height 1.6
- Button Text: Sans-serif, 16px, weight 600, letter-spacing 0.5px

LAYOUT STRUCTURE:
- Centered white content card with rounded corners (8-12px border-radius) on blurred colorful background
- Navigation: Logo left, nav links center (with vertical dividers), Download button right
- Hero: Centered content, tagline → large headline → primary CTA button
- Clean, spacious layout with generous white space (80-120px padding)

VISUAL ELEMENTS:
- Blurred colorful background: Multi-color gradient (green, yellow, blue, pink) with heavy blur (blur: 100-150px)
- White content card: Rounded rectangle with subtle shadow (0 20px 60px rgba(0,0,0,0.1))
- Minimal decorative elements: Small icons, clean lines, no heavy graphics
- Browser extension icon: Two overlapping circles icon for Chrome extension CTA

BUTTONS & CTAs:
- Primary CTA: Bright green (#10B981) background, white text, rounded-lg (8px), padding 16px 32px, icon + text
- Secondary Button: Black (#000000) background, white text, rounded-lg, padding 12px 24px
- Navigation Links: Light gray rounded buttons (#F3F4F6) with dark text, padding 8px 16px

SPACING & SIZING:
- Content card padding: 60-80px vertical, 80-100px horizontal
- Headline to tagline spacing: 16px
- Tagline to CTA spacing: 40px
- Max content width: 1200px, centered

ANIMATIONS:
- Subtle fade-in: Content fades in (opacity 0 to 1, 0.6s ease-out)
- Button hover: Slight scale (1.02) and shadow increase
- Background: Subtle color shift animation (very slow, 10s ease-in-out infinite)

MOOD & AESTHETIC:
- Clean, minimalist, modern
- Trustworthy, professional
- Fresh, approachable
- Tech-forward but accessible`,
    colorPalette: ['#FFFFFF', '#1F2937', '#4B5563', '#10B981', '#374151', '#F3F4F6', '#E8F5E9', '#FFF9C4'],
    typography: 'Bold geometric sans-serif, 64-80px headlines, clean minimal',
    visualElements: ['Blurred colorful background', 'White content card', 'Minimal icons']
  },
  {
    category: 'Creative/Portfolio',
    name: 'Playful Creative Portfolio (Truus Style)',
    prompt: `Create a playful, modern creative/portfolio website with vibrant personality:

COLOR PALETTE:
- Primary Background: Light blue (#E0F2FE, #BFDBFE) - soft, airy
- Content Card: Light beige/cream (#FEF3C7, #FDE68A) - warm, inviting
- Accent Section: Vibrant blue (#3B82F6, #2563EB) - energetic
- Text: Deep black (#1F2937) on light backgrounds, Pure white (#FFFFFF) on blue section
- Accent Colors: Orange (#F97316) for icons, various colors for stickers (red, pink, yellow)

TYPOGRAPHY:
- Brand Font: Handwritten/stylized font (Caveat, Kalam, or custom script), 36-48px, weight 600-700
- Headline Font: Bold sans-serif (Inter Bold, Poppins Bold), 48-64px, weight 700-800
- Section Labels: Regular sans-serif, 14px, weight 500, uppercase, letter-spacing 1px, in beige rounded pills
- Body Text: Sans-serif, 18-24px, weight 400, line-height 1.6
- Contact Info: Large sans-serif, 32-40px, weight 600, white on blue background

LAYOUT STRUCTURE:
- Large rounded content card (16-20px border-radius) on light blue background
- Header: Logo left (with icon), brand name center, icons right (search, phone)
- Main content: Three-column grid on blue section
  - Column 1: "looking for a job?" label → job description
  - Column 2: "office" label → address with Google Maps link
  - Column 3: "contact" label → email, WhatsApp, social icons
- Decorative bottom: Large handwritten brand name in wavy text, colorful emoji stickers overlaid

VISUAL ELEMENTS:
- Rounded label pills: Light beige (#FEF3C7) rounded rectangles, 8px border-radius, padding 8px 16px
- Emoji stickers: Colorful, playful stickers (speech bubbles, hearts, camera, numbers) scattered and overlaid
- Wavy text: Large handwritten-style text flowing across bottom section, opacity 30-40%
- Social icons: White icons (LinkedIn, Instagram, TikTok) on blue background, 24-32px size
- Orange star icon: Small orange (#F97316) star/asterisk icon next to brand name

BUTTONS & CTAs:
- Links: Underlined white text on blue background, hover: opacity change
- Social Icons: White icons, hover: scale (1.1) and slight color shift
- Credits button: Small dark gray rounded button, white text, bottom-right corner

SPACING & SIZING:
- Content card padding: 40-60px
- Column spacing: 32-40px gap
- Label to content spacing: 16px
- Large text: 32-40px for contact info, 18-24px for descriptions

ANIMATIONS:
- Sticker entrance: Stickers fade in with slight rotation (0deg to 5deg, 0.5s ease-out)
- Hover effects: Icons and links scale slightly (1.05-1.1) on hover
- Wavy text: Subtle wave animation (translateY -2px to +2px, 3s ease-in-out infinite)

MOOD & AESTHETIC:
- Playful, creative, fun
- Modern, youthful
- Approachable, friendly
- Unique, memorable`,
    colorPalette: ['#E0F2FE', '#FEF3C7', '#3B82F6', '#2563EB', '#1F2937', '#FFFFFF', '#F97316'],
    typography: 'Handwritten + bold sans-serif mix, playful and modern',
    visualElements: ['Rounded label pills', 'Emoji stickers', 'Wavy text', 'Colorful accents']
  },
  {
    category: 'SaaS/Productivity',
    name: 'Dark SaaS Waitlist (Nuvio Style)',
    prompt: `Create a dark, modern SaaS/productivity tool landing page with waitlist focus:

COLOR PALETTE:
- Primary Background: Deep black (#000000, #0A0A0A) - almost pure black
- Accent Colors: Bright purple (#A855F7, #8B5CF6), Electric purple (#C084FC)
- Text: Pure white (#FFFFFF) for all text
- Glow Colors: Purple (#9333EA) with high opacity (80-95%)
- Button: Purple gradient (#8B5CF6 to #A855F7) for primary CTA

TYPOGRAPHY:
- Logo Font: Sans-serif (Inter, Poppins), 24-28px, weight 600, with purple asterisk icon
- Headline Font: Extra bold sans-serif, 56-72px, weight 800-900, line-height 1.1, centered
- Sub-headline: Regular sans-serif, 20-24px, weight 400, line-height 1.6, centered, max-width 600px
- Body Text: Sans-serif, 16px, weight 400
- Navigation: Sans-serif, 14-16px, weight 500

LAYOUT STRUCTURE:
- Centered, full-width layout with maximum focus on headline and CTA
- Navigation: Logo left, nav links center, Community button right (with purple glow)
- Hero: Early access badge → Large centered headline (2-3 lines) → Sub-headline → Email input + CTA button → Social proof
- Footer: Trust section with company logos in a row

VISUAL ELEMENTS:
- Angular purple light beams: Bright purple angular shapes emanating from bottom-left and bottom-right corners
  - Core: Almost white purple (#E9D5FF) at center
  - Outer: Deep purple (#6D28D9) fading out
  - Blur: 80-120px for soft glow effect
  - Position: Bottom corners, extending upward and inward at 45-degree angles
- Purple glow dots: Small glowing purple dots (4-6px) with high opacity (90-95%), used for badges
- Gradient buttons: Linear gradient purple (#8B5CF6 to #A855F7), rounded-lg (8px)
- Social proof: Small circular avatars (4-6 profile pictures) in a row, followed by text

BUTTONS & CTAs:
- Primary CTA: Purple gradient background, white text, rounded-lg, padding 14px 28px, with subtle glow
- Email Input: Dark background (#1F2937), white text, rounded-lg, padding 14px 20px, border: 1px solid #374151
- Community Button: Dark background with purple glow border, white text, rounded-lg

SPACING & SIZING:
- Section padding: 100-120px vertical
- Headline to sub-headline: 24px
- Sub-headline to CTA: 40px
- CTA to social proof: 24px
- Max content width: 800px, centered

ANIMATIONS:
- Glow pulse: Purple glows pulse gently (opacity 70% to 95%, 2.5s ease-in-out infinite)
- Fade-in: Content fades in from bottom (opacity 0 to 1, translateY 20px, 0.8s ease-out)
- Button hover: Scale (1.02) and glow intensifies

MOOD & AESTHETIC:
- Modern, sleek, premium
- Futuristic, innovative
- Professional, trustworthy
- Exclusive, early-access feel`,
    colorPalette: ['#000000', '#0A0A0A', '#A855F7', '#8B5CF6', '#C084FC', '#9333EA', '#FFFFFF'],
    typography: 'Extra bold sans-serif, 56-72px centered headlines',
    visualElements: ['Angular purple light beams', 'Purple glow effects', 'Gradient buttons']
  },
  {
    category: 'HR/B2B',
    name: 'Professional HR Platform (Oyster Style)',
    prompt: `Create a professional B2B HR platform landing page with dark green theme:

COLOR PALETTE:
- Primary Background: Dark green (#065F46, #047857, #059669) - rich, professional
- Header/Footer: Pure white (#FFFFFF)
- Text: Pure white (#FFFFFF) on green sections, Dark gray (#1F2937) on white sections
- Accent: Bright green (#10B981, #34D399) for highlights
- Card Backgrounds: Gradient cards (purple-green, yellow-green, purple-red gradients)

TYPOGRAPHY:
- Logo Font: Sans-serif (Inter, Poppins), 28-32px, weight 600
- Headline Font: Extra bold sans-serif, 56-72px, weight 800-900, line-height 1.1
- Sub-headline: Regular sans-serif, 14px, weight 500, uppercase, letter-spacing 2px
- Body Text: Sans-serif, 18-20px, weight 400, line-height 1.7
- Button Text: Sans-serif, 16px, weight 600

LAYOUT STRUCTURE:
- Top banner: Light blue (#DBEAFE) with offer text and close button
- Header: White background, logo left, nav links center, action buttons right (Log In, Sign Up, Book a Demo)
- Hero: Split layout - 50% left (text content), 50% right (interactive cards)
- Trust section: Row of company logos below hero
- Footer: White background with value proposition

VISUAL ELEMENTS:
- Gradient employee cards: Multiple cards with gradient backgrounds
  - Purple-green gradient (#8B5CF6 to #10B981)
  - Yellow-green gradient (#FCD34D to #34D399)
  - Purple-red gradient (#8B5CF6 to #EF4444)
  - Each card: Employee photo, name, role, flag icon, status badge
- Salary tool card: White background card with input fields, dropdowns, salary range display
- Profile pictures: Circular avatars (60-80px) with employee photos
- Country flags: Small flag icons next to employee names
- Status badges: "FULL-TIME EMPLOYEE", "CONTRACTOR" with colored backgrounds

BUTTONS & CTAs:
- Primary CTA: White background, dark text, rounded-lg, border: 2px solid dark gray, padding 14px 28px
- Secondary CTA: Dark green background, white text, white border (2px), rounded-lg, padding 14px 28px
- Navigation buttons: Dark gray text, hover: underline

SPACING & SIZING:
- Hero padding: 100-120px vertical
- Card grid: 2x2 or 2x3 grid with 24px gaps
- Card size: 280-320px width, 200-240px height
- Text max-width: 600px on left side

ANIMATIONS:
- Card hover: Lift effect (translateY -8px, shadow increase)
- Fade-in: Cards stagger in (delay 0.1s each, 0.6s duration)
- Button hover: Background color change, scale (1.02)

MOOD & AESTHETIC:
- Professional, trustworthy
- Global, inclusive
- Modern, efficient
- Enterprise-grade`,
    colorPalette: ['#065F46', '#047857', '#059669', '#10B981', '#34D399', '#FFFFFF', '#1F2937'],
    typography: 'Extra bold sans-serif, 56-72px headlines, professional',
    visualElements: ['Gradient employee cards', 'Salary tool widget', 'Profile pictures', 'Country flags']
  },
  {
    category: 'Developer/Infrastructure',
    name: 'Futuristic AI Infrastructure (Developer Style)',
    prompt: `Create a futuristic AI/developer infrastructure landing page with glowing wave effects:

COLOR PALETTE:
- Primary Background: Deep black (#000000, #0A0A0A)
- Wave Colors: Deep purple (#6D28D9) → Bright fuchsia (#EC4899) → Bright pink (#F472B6) → Fiery red (#EF4444)
- Text: Pure white (#FFFFFF)
- Accent: White (#FFFFFF) for buttons and highlights
- Glow: Bright pink/red (#F472B6, #EF4444) with high opacity

TYPOGRAPHY:
- Logo Font: Sans-serif, 24-28px, weight 600, with circular icon (cross/starburst)
- Headline Font: Extra bold sans-serif, 64-80px, weight 900, line-height 1.1
- Sub-headline: Regular sans-serif, 20-24px, weight 400, line-height 1.6
- Navigation: Sans-serif, 14-16px, weight 500
- Button Text: Sans-serif, 16px, weight 600

LAYOUT STRUCTURE:
- Full-width dark background
- Navigation: Logo left, nav links center, Login/Signup buttons right
- Social proof bar: Small profile pictures + text "Join 1M+ developers"
- Hero: Left-aligned content (headline, sub-headline, two CTAs)
- Background: Large flowing wave pattern spanning entire background

VISUAL ELEMENTS:
- Flowing wave pattern: Multi-layered translucent waves
  - Layer 1: Deep purple (#6D28D9) at bottom, opacity 40%
  - Layer 2: Bright fuchsia (#EC4899) in middle, opacity 60%
  - Layer 3: Bright pink (#F472B6) center band, opacity 80%, strong glow
  - Layer 4: Fiery red (#EF4444) on right, opacity 50%
  - Blur: Layer blur 150px (uniform, progressive)
  - Inner shadows: Multiple inner shadows for depth
    - White inner shadow: Y: 2px, Blur: 10px, Opacity: 95%
    - Pink inner shadow: Y: 6px, Blur: 34px, Opacity: 100%
    - Red inner shadow: Y: 4px, Blur: 44px, Opacity: 100%
- Particle effects: Small white dots/stars scattered throughout, opacity 30-50%
- Gradient overlays: Radial gradients in corners for depth

BUTTONS & CTAs:
- Primary CTA: White background, black text, rounded-lg, padding 16px 32px
- Secondary CTA: Black background, white border (2px), white text, rounded-lg, padding 16px 32px
- Navigation buttons: Black background with white text, rounded-lg

SPACING & SIZING:
- Hero padding: 120-160px vertical
- Content max-width: 1200px
- Headline to sub-headline: 24px
- Sub-headline to buttons: 40px
- Button spacing: 16px

ANIMATIONS:
- Wave flow: Waves move slowly (translateX -5% to +5%, 8s ease-in-out infinite)
- Glow pulse: Pink/red glows pulse (opacity 60% to 90%, 3s ease-in-out infinite)
- Particle twinkle: Stars/dots twinkle (opacity 20% to 50%, 2s ease-in-out infinite)
- Content fade-in: Fade from bottom (opacity 0 to 1, translateY 30px, 1s ease-out)

MOOD & AESTHETIC:
- Futuristic, cutting-edge
- High-performance, powerful
- Developer-focused, technical
- Dynamic, energetic`,
    colorPalette: ['#000000', '#6D28D9', '#EC4899', '#F472B6', '#EF4444', '#FFFFFF'],
    typography: 'Extra bold sans-serif, 64-80px headlines, technical',
    visualElements: ['Flowing wave pattern', 'Multi-layer glows', 'Particle effects', 'Inner shadows']
  },
  {
    category: 'Component Library',
    name: 'Dark Component Showcase (HeadlessUI Style)',
    prompt: `Create a dark-themed component library/documentation website:

COLOR PALETTE:
- Primary Background: Deep black (#000000, #0F172A) with subtle purple-blue gradient
- Card Background: Dark gray (#1E293B, #334155) for component containers
- Text: Pure white (#FFFFFF) for headings, Light gray (#CBD5E1) for body
- Accent: Subtle purple-blue (#6366F1, #8B5CF6) in gradients
- Border: Dark gray (#475569) for component borders

TYPOGRAPHY:
- Logo Font: Sans-serif, 24-28px, weight 600
- Headline Font: Extra bold sans-serif, 48-56px, weight 800, line-height 1.2
- Tagline: Regular sans-serif, 20-24px, weight 400, line-height 1.6
- Component Labels: Sans-serif, 14px, weight 500, uppercase, letter-spacing 1px
- Body Text: Sans-serif, 16px, weight 400

LAYOUT STRUCTURE:
- Header: Logo left, version selector, GitHub icon right
- Centered tagline below header
- Framework tabs: React/Vue tabs, horizontal
- Component grid: 2x3 or 3x2 grid layout with equal-sized cards
- Each card: Dark gray background, component demo, label below

VISUAL ELEMENTS:
- Component cards: Dark gray rounded rectangles (8-12px border-radius), padding 24-32px
- Grid pattern: Subtle grid overlay on background, opacity 10-15%
- Blurred gradient: Purple-blue gradient in background, heavily blurred (blur: 100-150px)
- Component demos: Fully functional UI components rendered in cards
  - Dropdown menus with icons
  - Accordion/disclosure components
  - Modal dialogs
  - Navigation menus
  - Segmented controls
  - Loading spinners

BUTTONS & CTAs:
- Tab buttons: Dark background, selected tab has lighter background and border
- Component buttons: Various styles shown in component demos
- GitHub icon: White icon, hover: scale (1.1)

SPACING & SIZING:
- Grid gap: 24-32px
- Card padding: 24-32px
- Section padding: 80-100px vertical
- Max width: 1400px, centered

ANIMATIONS:
- Component interactions: Smooth transitions for dropdowns, modals, etc.
- Hover effects: Cards lift slightly (translateY -4px, shadow increase)
- Fade-in: Cards stagger in (delay 0.1s each)

MOOD & AESTHETIC:
- Clean, professional
- Developer-focused
- Modern, minimalist
- Documentation-style`,
    colorPalette: ['#000000', '#0F172A', '#1E293B', '#334155', '#6366F1', '#8B5CF6', '#FFFFFF', '#CBD5E1'],
    typography: 'Sans-serif, clean and readable, developer-focused',
    visualElements: ['Component grid', 'Dark cards', 'Blurred gradients', 'Functional demos']
  }
];

/**
 * Get design prompt based on user's website type/category
 */
export function getDesignPromptForCategory(category: string): DesignPrompt | null {
  const categoryMap: { [key: string]: string } = {
    'saas': 'SaaS/Tech',
    'tech': 'SaaS/Tech',
    'productivity': 'SaaS/Productivity',
    'crypto': 'Crypto/Fintech',
    'fintech': 'Crypto/Fintech',
    'wallet': 'Crypto/Fintech',
    'portfolio': 'Creative/Portfolio',
    'creative': 'Creative/Portfolio',
    'personal': 'Creative/Portfolio',
    'hr': 'HR/B2B',
    'b2b': 'HR/B2B',
    'business': 'HR/B2B',
    'developer': 'Developer/Infrastructure',
    'infrastructure': 'Developer/Infrastructure',
    'ai': 'Developer/Infrastructure',
    'component': 'Component Library',
    'library': 'Component Library',
    'docs': 'Component Library',
  };

  const mappedCategory = categoryMap[category.toLowerCase()] || category;
  return DESIGN_PROMPTS.find(p => p.category === mappedCategory) || DESIGN_PROMPTS[0];
}

/**
 * Generate comprehensive design prompt string for Gemini API
 */
export function generateDesignPrompt(userPrompt: string, category: string = 'SaaS/Tech'): string {
  const designPrompt = getDesignPromptForCategory(category);
  
  if (!designPrompt) {
    return userPrompt;
  }

  return `${designPrompt.prompt}

USER REQUEST: ${userPrompt}

IMPORTANT: Follow the exact specifications above for colors, typography, layout, and visual elements. Create a landing page that matches the described aesthetic and structure.`;
}

