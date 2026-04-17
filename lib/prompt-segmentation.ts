/**
 * Prompt Segmentation Engine — converts raw messy user prompts into structured JSON
 * that Gemini can interpret as a real website spec (not just echo back).
 */

export interface ParsedPromptSection {
  type: 'hero' | 'features' | 'cta' | 'about' | 'pricing' | 'testimonials' | 'gallery' | 'contact' | 'footer' | 'generic';
  title: string;
  content: string;
  style?: string;
}

export interface ParsedPrompt {
  brandName: string;
  tagline: string;
  intent: 'website' | 'video' | 'image' | 'fullstack';
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  typography: { display: string; body: string };
  animations: string[];
  sections: ParsedPromptSection[];
  rawPrompt: string;
}

const SECTION_KEYWORDS: Record<string, ParsedPromptSection['type']> = {
  hero: 'hero',
  header: 'hero',
  banner: 'hero',
  feature: 'features',
  features: 'features',
  benefit: 'features',
  benefits: 'features',
  'call to action': 'cta',
  cta: 'cta',
  button: 'cta',
  about: 'about',
  'about us': 'about',
  story: 'about',
  mission: 'about',
  pricing: 'pricing',
  plan: 'pricing',
  plans: 'pricing',
  testimonial: 'testimonials',
  testimonials: 'testimonials',
  review: 'testimonials',
  reviews: 'testimonials',
  gallery: 'gallery',
  portfolio: 'gallery',
  showcase: 'gallery',
  work: 'gallery',
  contact: 'contact',
  'contact us': 'contact',
  footer: 'footer',
};

function extractBrandName(text: string): string {
  const patterns = [
    /(?:brand|company|business|store|shop|site|website)\s*(?:name|called|named|is|:)\s*["""]?([^"""\n,.]{2,40})/i,
    /(?:called|named|for)\s+["""]?([A-Z][A-Za-z0-9\s&'-]{1,30})/,
    /^["""]?([A-Z][A-Za-z0-9\s&'-]{1,25})["""]?\s*[-–—:]/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  const words = text.split(/\s+/).slice(0, 4);
  const capitalized = words.filter(w => /^[A-Z]/.test(w));
  if (capitalized.length >= 1 && capitalized.length <= 3) {
    return capitalized.join(' ');
  }
  return '';
}

function extractTagline(text: string): string {
  const patterns = [
    /(?:tagline|slogan|headline|h1|hero\s*text|hero\s*copy)\s*[:–—]\s*["""]?(.{5,120}?)["""]?(?:\n|$)/i,
    /["""](.{5,80}?)["""]/, // quoted short phrase
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

/**
 * Detect what the user is trying to build from the prompt text.
 */
export function detectIntent(prompt: string): ParsedPrompt['intent'] {
  const lower = prompt.toLowerCase();

  const videoSignals = ['video', 'animation', 'animate', 'motion', 'cinematic clip', 'film', 'footage'];
  const imageSignals = ['image', 'photo', 'picture', 'illustration', 'background image', 'hero image', 'generate an image'];
  const fullstackSignals = ['full stack', 'fullstack', 'backend', 'back end', 'api route', 'database', 'authentication', 'login', 'signup', 'crud', 'dashboard app'];
  const websiteSignals = ['website', 'landing page', 'homepage', 'web page', 'site', 'portfolio', 'e-commerce', 'ecommerce', 'saas', 'store', 'shop'];

  const score = (keywords: string[]) => keywords.reduce((s, k) => s + (lower.includes(k) ? 1 : 0), 0);

  const vs = score(videoSignals);
  const is = score(imageSignals);
  const fs = score(fullstackSignals);
  const ws = score(websiteSignals);

  if (fs >= 2) return 'fullstack';
  if (vs > ws && vs > is) return 'video';
  if (is > ws && is > vs) return 'image';
  return 'website';
}

function inferPalette(text: string): ParsedPrompt['palette'] {
  const lower = text.toLowerCase();
  if (lower.includes('dark') || lower.includes('luxury') || lower.includes('premium') || lower.includes('elegant')) {
    return { primary: '#FFFFFF', secondary: '#A1A1AA', accent: '#8B5CF6', background: '#0A0A0A', text: '#F4F4F5' };
  }
  if (lower.includes('minimalist') || lower.includes('minimal') || lower.includes('clean')) {
    return { primary: '#18181B', secondary: '#71717A', accent: '#3B82F6', background: '#FAFAFA', text: '#18181B' };
  }
  if (lower.includes('bold') || lower.includes('startup') || lower.includes('vibrant')) {
    return { primary: '#7C3AED', secondary: '#A78BFA', accent: '#F59E0B', background: '#0F0F23', text: '#F9FAFB' };
  }
  if (lower.includes('nature') || lower.includes('organic') || lower.includes('eco')) {
    return { primary: '#059669', secondary: '#34D399', accent: '#F59E0B', background: '#0C1A12', text: '#ECFDF5' };
  }
  return { primary: '#FFFFFF', secondary: '#A1A1AA', accent: '#6366F1', background: '#050505', text: '#F4F4F5' };
}

function inferTypography(text: string): ParsedPrompt['typography'] {
  const lower = text.toLowerCase();
  if (lower.includes('serif') || lower.includes('editorial') || lower.includes('luxury') || lower.includes('elegant')) {
    return { display: 'Playfair Display', body: 'DM Sans' };
  }
  if (lower.includes('geometric') || lower.includes('tech') || lower.includes('modern') || lower.includes('futuristic')) {
    return { display: 'Space Grotesk', body: 'Inter' };
  }
  if (lower.includes('bold') || lower.includes('creative') || lower.includes('agency')) {
    return { display: 'Syne', body: 'Manrope' };
  }
  return { display: 'Outfit', body: 'DM Sans' };
}

function parseSections(text: string): ParsedPromptSection[] {
  const sections: ParsedPromptSection[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentType: ParsedPromptSection['type'] = 'hero';
  let currentContent: string[] = [];
  let currentTitle = '';

  const flush = () => {
    if (currentContent.length > 0 || currentTitle) {
      sections.push({
        type: currentType,
        title: currentTitle || (currentType === 'hero' ? 'Hero' : currentType.charAt(0).toUpperCase() + currentType.slice(1)),
        content: currentContent.join(' ').trim(),
      });
      currentContent = [];
      currentTitle = '';
    }
  };

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:\-–—]/g, ' ').trim();
    let matched = false;
    for (const [keyword, sectionType] of Object.entries(SECTION_KEYWORDS)) {
      if (lower.startsWith(keyword) || lower.includes(`${keyword} section`)) {
        flush();
        currentType = sectionType;
        const afterKeyword = line.replace(new RegExp(`^.*?${keyword}[:\\s–—-]*`, 'i'), '').trim();
        currentTitle = afterKeyword.split(/[.!?]/)[0]?.trim() || '';
        if (afterKeyword.length > currentTitle.length) {
          currentContent.push(afterKeyword);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      currentContent.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    sections.push({
      type: 'hero',
      title: '',
      content: text.slice(0, 200),
    });
    if (text.length > 200) {
      sections.push({
        type: 'features',
        title: '',
        content: text.slice(200, 600),
      });
    }
  }

  return sections;
}

/**
 * Main entry: parse a raw user prompt into structured JSON for the AI.
 */
export function parsePrompt(userPrompt: string): ParsedPrompt {
  const trimmed = (userPrompt || '').trim();

  return {
    brandName: extractBrandName(trimmed),
    tagline: extractTagline(trimmed),
    intent: detectIntent(trimmed),
    palette: inferPalette(trimmed),
    typography: inferTypography(trimmed),
    animations: ['scroll-reveal', 'stagger-fade', 'hero-entrance'],
    sections: parseSections(trimmed),
    rawPrompt: trimmed,
  };
}

/**
 * Convert parsed prompt to a structured system instruction for Gemini.
 */
export function structuredPromptToSystemInstruction(parsed: ParsedPrompt): string {
  const sectionsBlock = parsed.sections
    .map((s, i) => `  Section ${i + 1} (${s.type}): ${s.title ? `"${s.title}" — ` : ''}${s.content}`)
    .join('\n');

  return `=== STRUCTURED BRIEF (interpret this, do NOT echo it) ===

BRAND: ${parsed.brandName || '(infer from context)'}
TAGLINE: ${parsed.tagline || '(create a compelling one-liner)'}
INTENT: ${parsed.intent}

COLOR SYSTEM:
  Primary: ${parsed.palette.primary}
  Secondary: ${parsed.palette.secondary}
  Accent: ${parsed.palette.accent}
  Background: ${parsed.palette.background}
  Text: ${parsed.palette.text}

TYPOGRAPHY:
  Display: ${parsed.typography.display}
  Body: ${parsed.typography.body}

ANIMATIONS: ${parsed.animations.join(', ')}

SECTIONS:
${sectionsBlock}

INSTRUCTIONS FOR YOU:
- Build a REAL, functional website using these sections.
- Write actual marketing copy — polished, specific, and conversion-focused.
- Do NOT repeat this brief in the output. Do NOT show "What You Asked For".
- Every section must have real content, not placeholders.
- The hero must be a short, powerful headline (5-8 words max) with a refined sub-line.
- If fewer than 5 sections are listed above, ADD more sections that fit the brand (e.g. capabilities grid with inline SVG icons, stats strip, testimonial, pricing teaser, contact) so the page is visually full — an empty scroll area is unacceptable.
- Design must feel like a $1M+ product.

=== END STRUCTURED BRIEF ===`;
}
