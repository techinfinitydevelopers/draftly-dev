/**
 * 3D Builder: user chip selections for Three.js / Spline / etc.
 * Keys must match labels in `app/3d-builder/page.tsx` library chips.
 */

export const BUILDER_GRAPHICS_STACK_LABELS = [
  'Three.js',
  'React Three Fiber',
  'Spline',
  'Babylon.js',
  'OGL',
  'Liquid Cursor',
] as const;

export type BuilderGraphicsStackLabel = (typeof BUILDER_GRAPHICS_STACK_LABELS)[number];

const INSTRUCTIONS: Record<string, string> = {
  'Three.js':
    'THREE.JS: Add <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> (or another stable cdnjs three release). Use a **separate** WebGL canvas for 3D (never replace #bgCanvas). Position as fixed/absolute overlay with pointer-events:none on the wrapper unless interaction is required. The scroll-scrubbed JPEG/WebP sequence must keep drawing on #bgCanvas behind UI.',
  'React Three Fiber':
    'REACT THREE FIBER: Output is a **single HTML file** with no bundler — R3F will not run. Implement the same motion/3D intent with **plain Three.js** from CDN (see Three.js). Do not emit react, react-dom, or @react-three/fiber script tags.',
  Spline:
    'SPLINE: Use @splinetool/runtime from a CDN (e.g. unpkg) with type="module", create a canvas, `import { Application } from ...` and `application.load("https://prod.spline.design/.../scene.splinecode")` **or** embed a published scene via <iframe src="https://my.spline.design/..."> in a sized container. Do not remove #bgWrap/#bgCanvas; Spline sits in #pageRoot or a sibling overlay.',
  'Babylon.js':
    'BABYLON.JS: Load babylon.js from cdn.babylonjs.com. Engine on its own canvas; do not hijack #bgCanvas used for scroll frames.',
  OGL:
    'OGL: Load ogl as an ES module from esm.sh or unpkg inside <script type="module">. Keep WebGL on a dedicated canvas; preserve frame-scroll on #bgCanvas.',
  'Liquid Cursor':
    'LIQUID CURSOR: Implement with Canvas2D or a small WebGL pass + pointermove (or CSS blend modes). Avoid full-viewport backdrop-filter; keep CPU/GPU cost low so scroll scrub stays smooth.',
};

export function buildGraphicsStackPromptFragment(selected: unknown): string {
  if (!Array.isArray(selected) || selected.length === 0) return '';
  const uniq = Array.from(new Set(selected.map((s) => String(s).trim()).filter(Boolean)));
  const blocks = uniq.map((k) => INSTRUCTIONS[k]).filter(Boolean);
  if (!blocks.length) return '';
  return `\n\n─── USER-SELECTED WEB GRAPHICS (required in shipped HTML) ───\nThe user turned these on in the builder chips. Implement each with scripts that work in a **single static HTML file** in the preview iframe (CDN or import maps). Do not omit or “simplify away” these choices.\n\n${blocks.map((b, i) => `${i + 1}. ${b}`).join('\n\n')}\n`;
}
