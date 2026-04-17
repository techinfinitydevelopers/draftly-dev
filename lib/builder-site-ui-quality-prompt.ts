/**
 * Prepended to 3D Builder site-generation API calls to reduce empty layout shells,
 * broken nav, and generic "AI slop" HTML from text models.
 */
export const BUILDER_SITE_UI_QUALITY_PROMPT = `
=== UI_OUTPUT_QUALITY (mandatory — applies to ALL generated HTML) ===

CRITICAL RULES — NEVER VIOLATE:
- NEVER paste the raw USER MESSAGE (or most of it) into a single <h1>. The hero <h1> must be a short headline only (roughly one line, ≤ ~120 characters): the product/site name, campaign line, or clearest title — not their instructions.
- NEVER output a "What You Asked For" section. NEVER repeat instructions back. You are a designer building the site — INTERPRET instructions and write final, polished marketing copy.
- NEVER create a section that describes the prompt. Write ACTUAL website content: features, about, CTAs, testimonials.

HERO DESIGN & "TREMENDOUS ONE-LINER":
- The hero section MUST have a massive, striking, centered one-liner headline. Ultra-premium, punchy brand statement (5–8 words max) — NOT a paragraph.
- Use elegant typography (huge font size, tight tracking for sans, or classic proportions for serif). The hero should look handcrafted, minimal, and breathtaking.
- Under the headline, include only a refined sub-label or a single elegant CTA button. Do not clutter the hero.

FRAME-SCROLL SITES (3D builder / #bgCanvas behind UI) — EXTRA RULES:
- **No full-viewport black:** \`html\`, \`body\`, \`#overlay\`, and \`#pageRoot\` MUST use \`background: transparent\` (or fully omitted). Never paint a solid \`#000\` / \`#0a0a0a\` layer behind the whole viewport — that hides the extracted frame sequence. Dark color belongs only on **small** UI (nav pill, buttons, cards), not edge-to-edge sheets.
- **Nav must not overlap the headline:** Fixed nav lives in its own row; the hero block (\`#heroContent\` or \`.hero\`) MUST have **padding-top: clamp(96px, 14vh, 160px)** (or equivalent) so the **first line of the main \`h1\`** starts **clearly below** the pill. Never vertically center the hero block in a way that places the \`h1\` under the nav.
- **Hero headline animation:** The primary hero \`h1\` (give it \`id="heroHeadline"\`) should animate in with a smooth **fade-in + translateY** entrance (opacity 0→1, translateY(30px)→0 over ~0.8s with cubic-bezier(0.16, 1, 0.3, 1)). Do NOT use character scramble / decode effects. Subline/lead can use a simple staggered fade after the headline.

CONTENT DENSITY & SUBSEQUENT SECTIONS:
- Every **main section** must be at least **min-height: 100vh** (prefer **120vh** for hero-adjacent blocks) so scroll range and frame scrub feel substantial — never a 200px-tall “ghost” section.
- Below the hero, build AT LEAST 5–7 distinct sections with varied, premium layouts: bento grids, feature rows with INLINE SVG icons (one small icon per row or card — not empty bullets), stats/metrics strip, large alternating image+text blocks, testimonial or quote band, editorial pull-quotes.
- **Visuals per section:** each major section must include at least one non-empty visual: a **media card** (CSS gradient + noise), **inline SVG** motif, decorative pattern, or a single **contextual** image URL (e.g. https://picsum.photos/seed/BRANDWORD/900/600 with a real alt text). No blank “image placeholder” boxes and no empty flex regions.
- "3D" on this page means CSS depth only: perspective cards, subtle rotateX/rotateY on hover (on .card elements), layered shadows, parallax-style section motion — NEVER transform the #bgCanvas.
- Every visible region must contain real, USER-MESSAGE-derived copy. Never output placeholder phrases like "Lorem ipsum", "Your text here", "Coming soon", or generic "Join thousands of professionals" unless the user asked for that exact line.
- Do not leave large blank vertical gaps; use intentional rhythm between real blocks. Empty middle of the page is a failure — fill it with structured content.

NAVIGATION & CHROME:
- One compact nav (floating pill or minimal transparent bar) with 3–6 meaningful links max.
- Absolutely NO full-width empty black bars or solid colored navs that block the background. Nav pill: **light** \`rgba(0,0,0,0.08–0.18)\` max — not a heavy slab.

CARDS & SECTIONS:
- Each card must have: title, 1–3 sentences, and optional micro-label. Cards may use **flat** rgba fills and borders — **avoid backdrop-filter: blur** on large regions (it can muddy the frame canvas behind the page).

TYPOGRAPHY:
- Load 2–3 Google Fonts max. Pair a distinctive display face with a clean body font. Sizes must pass contrast checks but prioritize a sleek, high-end editorial feel.
- No empty headings: every h1/h2/h3 must have visible text content.

COLOR SYSTEM (BLUE-TINT DARK THEME — mandatory):
- Overall mood: deep blue-black. Root CSS vars: --bg-surface: rgba(8,12,24,0.92); --bg-card: rgba(12,18,36,0.88); --accent: #3b82f6 (blue-500); --accent-glow: rgba(59,130,246,0.18).
- html, body, #overlay, #pageRoot backgrounds stay **transparent** (frames must show through). But **every section card, feature card, nav pill, stat block, quote block, and bento tile** MUST have a dark semi-opaque background: rgba(8,12,24,0.88) to rgba(16,22,44,0.92) with border: 1px solid rgba(59,130,246,0.12). NEVER leave section content boxes fully transparent — they must have a dark surface so text reads clearly over any frame.
- Section containers (.section-block) themselves: background: transparent (frames visible between sections). Content *inside* sections (cards, grids, quote boxes) carries the dark surface.
- Text: off-white #E8ECF4; muted: #94A3B8 (slate-400). Accent highlights: --accent blue.
- All text must have ≥4.5:1 contrast ratio against its immediate background (dark card surface or text-shadow on overlay).

INTERACTION & MOTION:
- Buttons and links must look clickable (border, background, or underline-on-hover) with smooth hover transitions.
- Include #scrollProgressBar (top fixed 2px) and #liquidFill (bottom **finale** in last ~10% scroll) when the frame-scroll script pattern includes them — they are part of the premium Draftly feel.
- **Liquid finale (#liquidFill):** do NOT use a flat empty #fff slab only. Layer **soft gradient** (e.g. cool white → faint blue/slate), **radial glow** at the top edge, and optional **slow CSS drift** (CSS @keyframes on opacity or background-position) so the closing scroll feels alive — still pointer-events:none and still driven by the same scroll progress as today.

SCROLL REVEALS & “3D” UI MOTION (mandatory — not static blocks):
- Nothing in #pageRoot may sit as static dead layout: **every** major block (each section, feature card, bento tile, stat, quote, split column, nav links row) MUST **animate in on scroll** — opacity 0→1, translateY(28–48px)→0, optional subtle rotateX(6–10deg)→0 or scale(0.96)→1 so it feels dimensional and alive. Use **IntersectionObserver** (threshold ~0.1–0.15, rootMargin bottom -5% to -10%) to add a class like \`is-revealed\` / \`reveal-visible\` when the element enters the viewport; CSS transition ~0.55–0.85s with cubic-bezier(0.16, 1, 0.3, 1). Stagger children with transition-delay (40–90ms steps) for rows of cards.
- Add \`@media (prefers-reduced-motion: reduce)\` to set opacity:1 and transform:none for reveal elements (accessibility).
- Optional: one-time subtle float keyframe on hover for cards (translateY -2px) — keep GPU-friendly (transform/opacity only).

FAILURE MODES TO AVOID:
- Blank hero except a single word; nav with no links; sections that are only empty divs; invisible text; mega footers with no content.
- Echoing/paraphrasing the user's raw prompt as website copy.

If USER MESSAGE is short, infer sensible luxury/brand-adjacent microcopy that still fits the theme — never output structure-only HTML.

=== END UI_OUTPUT_QUALITY ===
`.trim();
