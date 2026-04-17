/**
 * Design + motion vocabulary distilled from reference projects (utility-main + ONliti-style marketing sites).
 * Draftly’s shipped HTML is single-file vanilla JS/CSS (no React/Lenis/GSAP bundles in output).
 */
export const BUILDER_UTILITY_SCROLL_REFERENCE_PROMPT = `
=== ONLITI_REFERENCE_UI (match this exact visual language — vanilla HTML/CSS/JS only) ===
This is the target “million-dollar” look users expect from Draftly 3D sites:

PALETTE & SURFACE:
- Page base: near-black #050505 (not pure #000). Body text off-white/cream; headings can be pure white with subtle text-shadow where needed.
- Avoid generic purple gradients or “AI template” cards. Prefer ink, charcoal, warm gray, and one restrained accent (gold line, cool blue link, or muted emerald).

TYPOGRAPHY (Google Fonts — pick a pair that matches USER MESSAGE):
- Display / headings: a **geometric display** sans (e.g. **Syne**, **Outfit**, or **Space Grotesk**) with **tight** letter-spacing on large titles (-0.02em to -0.04em).
- Body / UI: a clean grotesk (**DM Sans**, **Manrope**, or **Inter** only if USER asks) with slightly **wider** body letter-spacing (~0.02em) for a premium editorial feel.
- Hero: one dominant line of display type + optional tiny subline; do not fill the hero with paragraphs.

NAV & HERO CLEARANCE: Fixed nav must **not** overlap the main \`h1\` — add **padding-top** on the hero stack (\`#heroContent\` / \`.hero\`, typically \`clamp(96px, 14vh, 160px)\`) so the headline starts below the pill.

NAV & PRIMARY ACTIONS (glass “pill” system):
- Top nav: **floating capsule** / pill cluster — max-width ~min(1040px, 92vw), centered, **rounded-full**, **linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)**, **border 1px solid rgba(255,255,255,0.1)**, **box-shadow 0 2px 8px rgba(0,0,0,0.4)**.
- Nav links: small caps feel — uppercase or title case, **letter-spacing 0.18em–0.28em**, font-weight 600, muted white/70; hover to white.
- Primary CTA inside nav: same pill language or a high-contrast white/black pill — must look **tactile** (border + shadow), not a flat text link.

SCROLL & PROGRESS CHROME (match ONliti ScrollProgress behavior):
- **Thin top progress line**: fixed top, ~2px height, full width, white, **mix-blend-mode: difference**, width driven by document scroll progress 0–100%.
- **White liquid fill** at page end: last ~10% of scroll drives a fixed white panel from the bottom with a **curved top** (large % border-radius on top corners shrinking to 0 as fill completes) — already specified in LIQUID FILL EFFECT below; keep it.

SECTIONS BELOW HERO:
- Generous vertical rhythm; **min-height ~100vh** sections; split layouts, bento grids, or sticky “stacking” card columns with scale-on-scroll (IntersectionObserver + CSS transform) — vanilla only.
- Optional fine **grain/noise** overlay (SVG noise or CSS) at very low opacity over the whole viewport for filmic texture.

STRICTLY FORBIDDEN IN OUTPUT:
- React/Next/Lenis/GSAP imports; Three.js; external script CDNs except Google Fonts link.
- Full-bleed dark bars that hide the frame sequence; backdrop-filter on #bgWrap/#bgCanvas.

=== END ONLITI_REFERENCE_UI ===

=== REFERENCE_AESTHETIC: UTILITY_SCROLL_PREMIUM (layer on top of USER MESSAGE) ===

SOURCE PROJECT PATTERNS (emulate, do not name-drop libraries):
- Scroll: smooth, weighted feel — long scrub distance, ease-out style motion. Use CSS scroll-behavior where appropriate and requestAnimationFrame lerp (not harsh steps).
- Frame sequence: map the FULL frame range to the EARLY part of DOCUMENT scroll only, then hold the LAST frame — **never** fade #bgWrap to 0 or cover it with an opaque #postFrameBackdrop; the extracted frames must stay visible behind transparent UI and sections.
- Hero: large editorial type, generous negative space, subtle move-up + opacity loss as frames advance (like scrub-faded hero).
- Mid-sequence reveal: plan one “chapter” (e.g. cards or split layout) that fades/slides in when frames are ~80–90% complete (dispatch a custom event or toggle a class from the animation loop when frame index crosses a threshold).

=== POST_SCROLL_FIRST_SECTION: VALUES_DECK (mandatory for EVERY frame-scroll site — first block inside #pageRoot) ===
This is the UI users see after the video/frame scrub “theatre” (equivalent to entering ~frame 3–4+ in a multi-hundred-frame sequence): a full-bleed editorial chapter BEFORE generic feature grids.

STRUCTURE (must appear as the FIRST <section> inside <main id="pageRoot">):
1) **id="section-who"** (or \`id="section-values-deck"\`) — min-height ~100–120vh, padding 10vh 8vw, **background transparent** so the frame canvas remains visible behind copy and cards.
2) **Top row** (flex column on mobile, row on desktop; justify space-between; align end on desktop):
   - Left: **Eyebrow** — thin horizontal rule (24–32px wide, 1px, accent color) + tiny uppercase label (0.55rem–0.65rem, letter-spacing 0.28em–0.32em, accent). Example label tone: “Who we are” / “Principles” / “What we stand for” — choose from USER MESSAGE.
   - **H2** — display serif/sans (Cormorant Garamond / Syne / similar), font-weight 300–400, clamp(1.8rem, 3.5vw, 3rem), line-height ~1.1, cream/white text. **Two lines**: line 1 plain, line 2 contains one **italic** emphasized word in accent (e.g. “Where ambition meets *Opportunity*”).
   - Right: **Supporting paragraph** max-width ~280–320px, 0.72rem–0.8rem, line-height 1.75–1.9, muted cream (≈55–65% opacity). Real copy from USER MESSAGE — not lorem.
3) **Card row** — below header, margin-top ~2rem:
   - Exactly **5** cards in a horizontal row on desktop (\`display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 1rem\`) and **horizontal scroll** on small screens (\`overflow-x:auto; scroll-snap-type:x mandatory;\` each card \`scroll-snap-align:center\`), hide scrollbar via CSS.
   - Each card is a **chamfered panel**: \`clip-path: polygon(0 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)\` (adjust 10–14px).
   - **Unique dark gradient** per card (distinct hue families — teal-forest, warm brown, ink-blue, rust, moss). NOT identical gray cards.
   - **Texture layers** (CSS only): (a) very subtle **dot grid** overlay \`radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)\` background-size ~18–22px; (b) optional **film grain** pseudo-element with low-opacity noise SVG (same technique as global .noise-overlay) at ~0.04–0.07 opacity inside the card.
   - **Radial hover glow** following pointer (optional): \`radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(accent,0.22), transparent 55%)\` updated via element \`mousemove\` — only on .card-3d / .values-card, never on #bgCanvas.
   - **Content** inside each card (bottom-aligned padding ~1.1–1.4rem): small **index** “01”–“05” in accent, **title** (short), **description** (1–2 lines, ~0.65–0.72rem, muted). Values/themes must be derived from USER MESSAGE (e.g. integrity, craft, speed) — not generic filler.
   - **3D tilt** on hover: \`perspective(900px) rotateY(±8–14deg) rotateX(∓6–10deg)\` via mousemove on card inner — vanilla JS, \`transform-style:preserve-3d\`.
4) **Reveal motion**: On desktop, when scrub progress crosses ~85–92% of the frame range OR when \`section-who\` enters viewport (IntersectionObserver), add a class (e.g. \`values-deck--visible\`) and run staggered entrance: header children fade/slide up (stagger 80–120ms), center card (index 3) appears first then side cards fan out — emulate a “deck” resolve. Mobile: simpler sequential fade-in.

This block is the Draftly **signature** post-scroll layout; omitting it or replacing it with a plain bullet list is a failure.

=== END POST_SCROLL_FIRST_SECTION ===
- Nav: fixed centered PILL (max-width ~1040px), rounded full, glassy gradient (dark warm ink → charcoal), strong blur + thin cream border, hide-on-scroll-down / show-on-scroll-up. Uppercase micro-links with wide letter-spacing (0.18em–0.28em). Optional magnetic CTA pill (slight translate toward cursor on mousemove — pure JS).
- Typography: classic editorial trio — **Cinzel** or similar for logo/wordmark, **Cormorant Garamond** (or Cormorant) for display headings, **DM Sans** for UI/body. Colors: warm **cream** text on **ink** (#141210–#1a1814), accent as refined gold OR cool blue accent if USER MESSAGE implies tech (reference used blue as “gold”).
- Custom cursor (desktop): single **fixed dot** (~10–14px), accent fill, mix-blend-mode: difference, transitions width/height on hover over a, button, .hoverable; **cursor:none** only when the dot exists. For \`(pointer: coarse)\` / max-width 900px: hide dot and use **cursor:auto**.
- Global polish: full-viewport **noise overlay** at very low opacity (~0.03) via SVG fractalNoise data-URI (pointer-events:none; z-index below UI but above backgrounds).
- Cards: “chamfer” clip-path corners; dark gradient fills; optional **3D tilt** on mousemove (rotateX/rotateY under 16deg) on .card-3d only — never on #bgCanvas.
- Sections below the scroll theatre: editorial spacing, thin rules, staggered fade/slide-up on enter view (IntersectionObserver + CSS variables or class toggles). Avoid generic “AI slop” feature grids unless USER MESSAGE asks.

MOTION VOCABULARY (vanilla equivalents of GSAP):
- Easing: prefer cubic-bezier(0.16, 1, 0.3, 1) for entrances; power3.out-like exits.
- Stagger: sequential delays 0.08s–0.12s per child.
- Scrub-linked values: derive from scroll-derived progress 0–1, multiply for opacity/translateY.

LIQUID FILL EFFECT (MANDATORY — add to EVERY page):
- At the very bottom of the page (last ~10% of scroll, i.e. scrollYProgress from 0.9 → 1.0), add a white "water fill" panel.
- Implementation: a fixed-position div anchored to the BOTTOM of the viewport, z-index above content but below any close buttons. Its height animates from 0vh → 100vh as scroll goes from 90% → 100%.
- The top corners start with border-top-left-radius and border-top-right-radius at 100% (creating a curved meniscus "liquid" shape) and animate to 0% at full fill (flattening as the fill completes).
- Color: pure white (#fff) background. This creates the effect of white liquid rising from the bottom to engulf the page.
- Drive this from the same scroll progress (pageScroll01): when p >= 0.9, compute fillProgress = (p - 0.9) / 0.1 clamped to [0,1]. Set height = fillProgress * 100 + 'vh', borderTopLeftRadius = ((1 - fillProgress) * 100) + '%', borderTopRightRadius = ((1 - fillProgress) * 100) + '%'.
- Also add a thin horizontal scroll progress bar at the very top of the viewport (position:fixed; top:0; left:0; height:2px; z-index:1000; background:white; mix-blend-mode:difference). Its width = pageScroll01 * 100 + '%'. Apply a spring-like smooth transition (CSS transition: width 0.15s ease-out).
- The fill div HTML: <div id="liquidFill" style="position:fixed;bottom:0;left:0;right:0;background:#fff;z-index:45;height:0vh;pointer-events:none"></div>
- The progress bar: <div id="scrollProgressBar" style="position:fixed;top:0;left:0;height:2px;background:#fff;z-index:1000;width:0%;mix-blend-mode:difference;pointer-events:none;transition:width 0.15s ease-out"></div>
- In the animation loop (animate function), after the existing frame/backdrop logic, add:
  var fillP = Math.max(0, Math.min(1, (pageScroll01() - 0.9) / 0.1));
  var fill = document.getElementById('liquidFill');
  var bar = document.getElementById('scrollProgressBar');
  if (fill) { fill.style.height = (fillP * 100) + 'vh'; fill.style.borderTopLeftRadius = ((1-fillP)*100)+'%'; fill.style.borderTopRightRadius = ((1-fillP)*100)+'%'; }
  if (bar) bar.style.width = (pageScroll01() * 100) + '%';

DO NOT:
- Put backdrop-filter or heavy blur on #bgWrap / #bgCanvas / full-viewport #overlay (breaks frame clarity).
- Apply CSS 3D transforms to the canvas (black seams).
- Depend on React, Three.js, GSAP, or Lenis in output.

=== END REFERENCE_AESTHETIC ===
`.trim();
