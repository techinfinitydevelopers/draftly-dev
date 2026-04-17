# 3D Builder — Cursor prompt pack (reference)

Use **one step at a time** in Cursor; do not generate everything at once.

---

## Master goal

We are building an advanced AI-powered web interface that generates dynamic, animated, scroll-based content from user prompts.

**Core requirements**

- Smooth scroll-based animations (no lag)
- Full rendering of all scroll sections (not just first frame)
- Auto-generated images based on user prompt
- Fully animated UI elements (fade, slide, scale)
- No empty states (every section must have meaningful content)
- Premium, fluid UX (similar to Apple / Stripe websites)

**Tech stack preference**

- React + Tailwind + Framer Motion (builder UI)
- `requestAnimationFrame` for frame-scroll preview performance
- Lazy loading where needed

Generated sites are **single-file HTML** from the API; iterate via `lib/builder-site-ui-quality-prompt.ts` and `app/api/3d-builder/generate-site/route.ts`.

---

## Step 1 — Scroll / sections

- Ensure full scrollable container renders all sections; `min-height` ≥ 100vh per section where applicable.
- Debug: append `?debug=1` to the preview blob URL (if exposed) or use the injected preview console log for `#pageRoot` block counts.

## Step 2 — Smooth scroll

- Frame scrub uses existing RAF loop in generated HTML; avoid layout thrashing (transform/opacity).

## Step 3 — Scroll-triggered animations

- IntersectionObserver + `.reveal-on-scroll` / `.is-visible` in generated HTML (see quality prompt).

## Step 4 — Images from prompt

- Prefer inline SVG, CSS gradients, or contextual `picsum.photos` URLs in prompts (no API keys required for placeholders).

## Step 5 — No empty sections

- Covered in `BUILDER_SITE_UI_QUALITY_PROMPT`.

## Step 6 — Liquid finale

- `#liquidFill` uses layered gradient + drift animation in fallback and API skeleton.

## Step 7 — Global motion

- Staggered reveals and consistent easing in quality prompt.

## Step 8 — Character limits

- See `lib/builder-prompt-limits.ts` (standard / extended caps). Chat uses auto-resize textarea.

## Step 9 — Premium polish

- Spacing, glass-style cards, blue-tint dark theme in quality prompt.

## Final test

- Scroll, preview, ZIP export, cloud save (requires valid Firebase Storage bucket).
