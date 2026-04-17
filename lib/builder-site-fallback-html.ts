/**
 * Last-resort HTML when the LLM output fails frame-scroll validation.
 * Must feel complete (dense sections, icons, motion) — not a thin wireframe.
 */
import { parsePrompt } from '@/lib/prompt-segmentation';

const HERO_HEADLINE_MAX = 120;

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Split a long user brief into a short hero headline vs remaining copy. */
function splitPromptForHero(prompt: string): { headline: string; rest: string } {
  const t = prompt.trim();
  if (!t) return { headline: 'Welcome', rest: '' };

  const brandNameMatch = t.match(/Brand\s*Name\s*[:\-]\s*"?([^"\n]+)"?/i);
  if (brandNameMatch && brandNameMatch[1]) {
    return {
      headline: brandNameMatch[1].trim(),
      rest: t,
    };
  }

  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const labelRe =
    /^(title|headline|h1|hero|cta|button|subhead|subtitle|tagline|home|page\s*\d+|section\s*\d+|brand name|tagline|category|goal|design direction|animation style|homepage structure)\s*[:—\-]/i;
  let headline = '';
  const restParts: string[] = [];
  for (const line of lines) {
    const m = line.match(labelRe);
    if (m) {
      const key = m[1].toLowerCase().replace(/\s+/g, '');
      const val = line.slice(m[0].length).trim();
      if ((key === 'title' || key === 'headline' || key === 'h1' || key === 'hero') && val && !headline) {
        headline = val.length > HERO_HEADLINE_MAX ? `${val.slice(0, HERO_HEADLINE_MAX - 1)}…` : val;
        continue;
      }
      restParts.push(line);
      continue;
    }
    if (!headline && line.length <= HERO_HEADLINE_MAX && lines.length > 1) {
      headline = line;
      continue;
    }
    if (!headline) {
      const sentenceEnd = line.search(/[.!?](\s|$)/);
      const cut =
        sentenceEnd > 0 && sentenceEnd <= HERO_HEADLINE_MAX
          ? sentenceEnd + 1
          : Math.min(HERO_HEADLINE_MAX, line.length);
      headline = line.slice(0, cut).trim() || line.slice(0, 80).trim();
      const tail = line.slice(headline.length).trim();
      if (tail) restParts.push(tail);
      continue;
    }
    restParts.push(line);
  }
  if (!headline) {
    headline = t.slice(0, HERO_HEADLINE_MAX).trim() + (t.length > HERO_HEADLINE_MAX ? '…' : '');
  }
  let rest = restParts.join('\n\n').trim();
  if (!rest && lines.length > 1 && lines[0] === headline) {
    rest = lines.slice(1).join('\n\n').trim();
  }
  return { headline: headline || 'Welcome', rest };
}

const ICO = {
  bolt: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linejoin="round"/></svg>`,
  stack: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
};

/**
 * Rich single-file scroll-frame site used only when the primary LLM output is rejected.
 */
export function buildReliableFallbackHtml(prompt: string, frameCount: number): string {
  const parsed = parsePrompt(prompt);
  const { headline, rest } = splitPromptForHero(prompt);
  const brandRaw = parsed.brandName || prompt.trim().split(/[\s—\-–,.:;|]+/)[0] || 'Studio';
  const brandName = escapeHtml(brandRaw);
  const heroH1 = escapeHtml(headline);
  const heroLead = escapeHtml(
    rest
      ? rest.slice(0, 360) + (rest.length > 360 ? '…' : '')
      : `${parsed.tagline || `Premium digital experiences tailored for ${brandRaw} — clarity, craft, and measurable impact.`}`,
  );
  const { display: displayFont, body: bodyFont } = parsed.typography;
  const { background, text: textColor, accent } = parsed.palette;

  const feat = [
    { icon: ICO.bolt, t: 'Performance-first', d: `Speed, stability, and polish tuned for ${brandName}’s real users — not demo-day metrics.` },
    { icon: ICO.stack, t: 'Layered storytelling', d: 'Scroll-native narrative: hero → proof → depth → action, with intentional pacing.' },
    { icon: ICO.shield, t: 'Trust & clarity', d: 'Transparent structure, strong hierarchy, and copy that reads like a finished brand.' },
    { icon: ICO.spark, t: 'Signature motion', d: 'Micro-interactions, staggered reveals, and tactile UI depth — without touching the frame canvas.' },
  ];

  const featureGrid = feat
    .map(
      (f) => `
    <article class="feat-card card-3d reveal-on-scroll">
      <div class="feat-ico">${f.icon}</div>
      <h3>${escapeHtml(f.t)}</h3>
      <p>${escapeHtml(f.d)}</p>
    </article>`,
    )
    .join('');

  const valuesDeck = `
    <section id="section-who" class="wwa-section section-block" aria-labelledby="wwa-heading">
      <div class="wwa-header">
        <div class="wwa-header-left">
          <div class="wwa-reveal-item reveal-on-scroll" style="transition-delay:40ms">
            <div class="wwa-eyebrow">
              <span class="wwa-rule" aria-hidden="true"></span>
              <span>Who we are</span>
            </div>
          </div>
          <h2 id="wwa-heading" class="wwa-reveal-item reveal-on-scroll" style="transition-delay:120ms">
            Where ambition meets<br /><em>opportunity</em>
          </h2>
        </div>
        <p class="wwa-lead wwa-reveal-item reveal-on-scroll" style="transition-delay:200ms">
          ${escapeHtml(
            `${brandRaw} pairs editorial craft with scroll-native storytelling — built for teams who want a cinematic first impression and proof-rich pages beneath it.`,
          )}
        </p>
      </div>
      <div class="wwa-cards">
        <article class="values-card card-3d reveal-on-scroll wwa-reveal-item" style="transition-delay:260ms;background:linear-gradient(145deg,#0c1224,#162040);--glow:59,130,246">
          <div class="values-card-grain" aria-hidden="true"></div>
          <div class="values-card-dots" aria-hidden="true"></div>
          <div class="values-card-glow" aria-hidden="true"></div>
          <div class="values-card-body">
            <span class="values-idx">01</span>
            <h3 class="values-title">Integrity</h3>
            <p class="values-desc">Clear promises, honest positioning, and copy that matches what you ship.</p>
          </div>
        </article>
        <article class="values-card card-3d reveal-on-scroll wwa-reveal-item" style="transition-delay:340ms;background:linear-gradient(145deg,#0e1428,#1a2848);--glow:96,165,250">
          <div class="values-card-grain" aria-hidden="true"></div>
          <div class="values-card-dots" aria-hidden="true"></div>
          <div class="values-card-glow" aria-hidden="true"></div>
          <div class="values-card-body">
            <span class="values-idx">02</span>
            <h3 class="values-title">Unity</h3>
            <p class="values-desc">Design, motion, and narrative locked together — one voice from hero to footer.</p>
          </div>
        </article>
        <article class="values-card card-3d reveal-on-scroll wwa-reveal-item" style="transition-delay:420ms;background:linear-gradient(145deg,#0a1020,#182844);--glow:147,197,253">
          <div class="values-card-grain" aria-hidden="true"></div>
          <div class="values-card-dots" aria-hidden="true"></div>
          <div class="values-card-glow" aria-hidden="true"></div>
          <div class="values-card-body">
            <span class="values-idx">03</span>
            <h3 class="values-title">Innovation</h3>
            <p class="values-desc">Layouts that feel bespoke: chamfered surfaces, depth, and texture — not flat templates.</p>
          </div>
        </article>
        <article class="values-card card-3d reveal-on-scroll wwa-reveal-item" style="transition-delay:500ms;background:linear-gradient(145deg,#10142a,#1c2850);--glow:129,140,248">
          <div class="values-card-grain" aria-hidden="true"></div>
          <div class="values-card-dots" aria-hidden="true"></div>
          <div class="values-card-glow" aria-hidden="true"></div>
          <div class="values-card-body">
            <span class="values-idx">04</span>
            <h3 class="values-title">Focus</h3>
            <p class="values-desc">Every block earns attention: hierarchy, rhythm, and CTAs where they convert.</p>
          </div>
        </article>
        <article class="values-card card-3d reveal-on-scroll wwa-reveal-item" style="transition-delay:580ms;background:linear-gradient(145deg,#0c1424,#142240);--glow:56,189,248">
          <div class="values-card-grain" aria-hidden="true"></div>
          <div class="values-card-dots" aria-hidden="true"></div>
          <div class="values-card-glow" aria-hidden="true"></div>
          <div class="values-card-body">
            <span class="values-idx">05</span>
            <h3 class="values-title">Excellence</h3>
            <p class="values-desc">Polish you can feel: grain, dot grids, and motion that respects readability.</p>
          </div>
        </article>
      </div>
    </section>
`;

  const sections = `
${valuesDeck}
    <section id="section-1" class="section-block">
      <p class="eyebrow reveal-on-scroll">Capabilities</p>
      <h2 class="reveal-on-scroll">Built to feel expensive</h2>
      <p class="section-lead reveal-on-scroll">A full surface of marketing depth — not a hollow hero. Every block below is intentional layout, not filler.</p>
      <div class="feat-grid">${featureGrid}</div>
    </section>

    <section id="section-2" class="section-block section-stats">
      <div class="stat reveal-on-scroll"><span class="stat-num">48ms</span><span class="stat-label">interaction baseline</span></div>
      <div class="stat reveal-on-scroll"><span class="stat-num">120+</span><span class="stat-label">layout patterns</span></div>
      <div class="stat reveal-on-scroll"><span class="stat-num">∞</span><span class="stat-label">scroll storytelling</span></div>
    </section>

    <section id="section-3" class="section-block split">
      <div class="reveal-on-scroll">
        <p class="eyebrow">About ${brandName}</p>
        <h2>Precision without noise</h2>
        <p class="body-copy">We combine editorial typography, restrained color, and motion that supports the message. The frame sequence above sets the mood; the sections carry the proof.</p>
        <ul class="ticks">
          <li><span class="tick-ico">${ICO.globe}</span> Global-ready layout and responsive rhythm</li>
          <li><span class="tick-ico">${ICO.shield}</span> Accessible contrast targets on dark surfaces</li>
        </ul>
      </div>
      <div class="media-card reveal-on-scroll" role="img" aria-label="Abstract product visual"></div>
    </section>

    <section id="section-4" class="section-block">
      <p class="eyebrow reveal-on-scroll">Proof</p>
      <h2 class="reveal-on-scroll">What teams feel on day one</h2>
      <div class="quote reveal-on-scroll">
        <p>“Finally a builder that doesn’t look like a template — the scroll feels cinematic and the page still reads like us.”</p>
        <cite>— Creative lead, ${brandName}</cite>
      </div>
    </section>

    <section id="section-5" class="section-block cta-fin">
      <h2 class="reveal-on-scroll">Ready when you are</h2>
      <p class="body-copy reveal-on-scroll">Move from idea to a scroll-native experience with real sections, real hierarchy, and a hero that earns the first frame.</p>
      <div class="cta-row reveal-on-scroll">
        <a class="cta primary" href="#section-1">Explore the story</a>
        <span class="cta-hint">Scroll up to replay the sequence</span>
      </div>
    </section>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brandName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(displayFont)}:wght@400;500;600;700&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap" rel="stylesheet">
  <style id="app-styles">
    :root { color-scheme: dark; --cream:#E8ECF4; --ink:#080C18; --accent:#3b82f6; --bg-surface:rgba(8,12,24,0.92); --bg-card:rgba(12,18,36,0.88); --accent-glow:rgba(59,130,246,0.18); }
    * { box-sizing: border-box; }
    html { height:100%; background:transparent; }
    body { margin:0; min-height:100%; background:transparent !important; color:var(--cream); overflow-y:auto; overflow-x:hidden; cursor:auto; font-family:'${bodyFont}',system-ui,sans-serif; letter-spacing:0.02em; }
    #scrollProgressBar { position:fixed; top:0; left:0; height:2px; background:#fff; z-index:1000; width:0%; mix-blend-mode:difference; pointer-events:none; transition:width 0.15s ease-out; }
    #bgWrap { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; opacity:1; transition:opacity 0.15s linear; }
    #bgCanvas { position:absolute; left:0; top:0; width:100%; height:100%; display:block; }
    /* Keep transparent so extracted frames stay visible; do not paint a full-viewport ink layer over #bgWrap */
    #postFrameBackdrop {
      position:fixed; inset:0; z-index:1; pointer-events:none; opacity:0; transition:opacity 0.15s linear;
      background: transparent;
    }
    @keyframes liquid-finale-drift {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.94; }
    }
    #liquidFill {
      position:fixed; bottom:0; left:0; right:0; z-index:45; height:0vh; pointer-events:none; overflow:hidden;
      background:
        linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(241,245,249,0.88) 42%, #f1f5f9 100%),
        radial-gradient(ellipse 95% 55% at 50% 0%, rgba(59,130,246,0.14), transparent 62%);
      box-shadow: 0 -36px 72px rgba(15,23,42,0.1);
      animation: liquid-finale-drift 12s ease-in-out infinite;
    }
    .noise-overlay {
      position:fixed; inset:0; z-index:5; pointer-events:none; opacity:0.035;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 128px 128px;
    }
    #loader { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column; background:#030303; }
    #loaderWrap { width:220px; height:3px; background:rgba(255,255,255,.12); border-radius:999px; overflow:hidden; }
    #loader-bar { height:100%; width:0%; background:linear-gradient(90deg,#00d4ff,#7c3aed); transition:width .2s linear; }
    #overlay { position:fixed; inset:0; z-index:40; pointer-events:none; padding:24px; display:flex; flex-direction:column; align-items:center; background:transparent !important; }
    #heroContent { transition:opacity .4s cubic-bezier(.25,.46,.45,.94), transform .4s cubic-bezier(.25,.46,.45,.94); will-change:opacity,transform; width:100%; max-width:min(820px,92vw); }
    .nav-pill { pointer-events:auto; position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:50; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 20px; border-radius:999px; max-width:min(560px,calc(100vw - 32px)); width:100%; background:rgba(8,12,24,0.65); border:1px solid rgba(59,130,246,0.15); box-shadow:0 8px 32px rgba(0,0,0,.25); }
    .brand { font-family:'${displayFont}',serif; font-weight:600; letter-spacing:.28em; font-size:11px; text-transform:uppercase; }
    .links { display:flex; gap:18px; color:rgba(255,255,255,.9); font-weight:600; font-size:13px; }
    .links span { cursor:default; }
    .hero { margin-top:0; padding-top:clamp(104px,14vh,168px); align-self:flex-start; width:100%; max-width:min(820px,92vw); pointer-events:auto; padding-left:max(0px, env(safe-area-inset-left)); }
    #heroHeadline { font-family:'${displayFont}',serif; font-size:clamp(38px,6vw,72px); font-weight:400; line-height:1.06; margin:14px 0 16px; color:var(--cream); text-shadow:0 4px 32px rgba(0,0,0,.8); opacity:1; min-height:1.15em; }
    .hero-lead { font-size:clamp(16px,2vw,20px); line-height:1.65; color:rgba(255,255,255,.88); max-width:54ch; margin:0 0 22px; text-shadow:0 2px 20px rgba(0,0,0,.65); animation:scramble-in 1.25s .08s cubic-bezier(.25,.46,.45,.94) forwards; opacity:0; }
    @keyframes scramble-in { 0%{ opacity:0; letter-spacing:.12em; transform:translateY(14px); } 55%{ opacity:1; letter-spacing:0; transform:translateY(0); } 100%{ opacity:1; letter-spacing:0; transform:translateY(0); } }
    .hero-cta-row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; animation:scramble-in 1.25s .14s cubic-bezier(.25,.46,.45,.94) forwards; opacity:0; }
    .cta { display:inline-flex; align-items:center; gap:10px; padding:14px 22px; border-radius:12px; border:1px solid rgba(255,255,255,.35); color:#fff; text-decoration:none; font-weight:700; background:rgba(255,255,255,.12); transition:transform .2s, box-shadow .2s; pointer-events:auto; }
    .cta:hover { transform:scale(1.02) translateY(-1px); box-shadow:0 8px 32px rgba(0,212,255,.2); }
    .cta.ghost { background:transparent; border-color:rgba(255,255,255,.22); font-weight:600; }
    #pageRoot { position:relative; z-index:30; pointer-events:auto; margin-top:100vh; background:transparent !important; }
    .wwa-section { border-top: none !important; padding-top: 12vh !important; padding-bottom: 10vh !important; min-height: 110vh !important; }
    .wwa-header { display: flex; flex-direction: column; gap: 28px; margin-bottom: 2.5rem; max-width: 1200px; }
    @media (min-width: 900px) {
      .wwa-header { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 40px; }
    }
    .wwa-eyebrow { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 600; color: var(--accent); }
    .wwa-rule { display: inline-block; width: 28px; height: 1px; background: var(--accent); }
    .wwa-header h2 { font-family:'${displayFont}',serif; font-size: clamp(1.85rem, 3.6vw, 3rem); font-weight: 300; line-height: 1.08; margin: 0; color: var(--cream); text-shadow: 0 2px 28px rgba(0,0,0,.55); }
    .wwa-header h2 em { font-style: italic; color: var(--accent); font-weight: 400; }
    .wwa-lead { max-width: 300px; margin: 0; font-size: 13px; line-height: 1.85; color: rgba(255,255,255,0.58); text-align: left; }
    @media (min-width: 900px) { .wwa-lead { text-align: right; } }
    .reveal-on-scroll {
      opacity: 0;
      transform: translate3d(0, 40px, 0) perspective(900px) rotateX(8deg);
      transform-style: preserve-3d;
      transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: opacity, transform;
    }
    .reveal-on-scroll.is-visible {
      opacity: 1;
      transform: translate3d(0, 0, 0) perspective(900px) rotateX(0deg);
    }
    .feat-grid .reveal-on-scroll:nth-child(1) { transition-delay: 0ms; }
    .feat-grid .reveal-on-scroll:nth-child(2) { transition-delay: 55ms; }
    .feat-grid .reveal-on-scroll:nth-child(3) { transition-delay: 110ms; }
    .feat-grid .reveal-on-scroll:nth-child(4) { transition-delay: 165ms; }
    .section-stats .reveal-on-scroll:nth-child(1) { transition-delay: 0ms; }
    .section-stats .reveal-on-scroll:nth-child(2) { transition-delay: 70ms; }
    .section-stats .reveal-on-scroll:nth-child(3) { transition-delay: 140ms; }
    @media (prefers-reduced-motion: reduce) {
      .reveal-on-scroll { opacity: 1 !important; transform: none !important; transition: none !important; }
    }
    .wwa-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; max-width: 1240px; perspective: 1200px; }
    @media (max-width: 899px) {
      .wwa-cards { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px; padding-bottom: 12px; scrollbar-width: none; -ms-overflow-style: none; }
      .wwa-cards::-webkit-scrollbar { display: none; }
      .values-card { flex: 0 0 78vw; max-width: 320px; scroll-snap-align: center; }
    }
    .values-card {
      position: relative; min-height: 200px; overflow: hidden;
      clip-path: polygon(0 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
      border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 56px rgba(0,0,0,0.45);
      transform-style: preserve-3d;
    }
    .values-card-dots {
      position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
      background-image: radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .values-card-grain {
      position: absolute; inset: 0; pointer-events: none; opacity: 0.055; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
      background-size: 96px 96px;
    }
    .values-card-glow {
      position: absolute; inset: 0; pointer-events: none; opacity: 0;
      background: radial-gradient(circle 85% at var(--mx, 50%) var(--my, 50%), rgba(var(--glow), 0.38), transparent 58%);
      transition: opacity 0.35s ease;
    }
    .values-card:hover .values-card-glow { opacity: 1; }
    .values-card-body { position: relative; z-index: 2; height: 100%; min-height: 200px; display: flex; flex-direction: column; justify-content: flex-end; padding: 1.15rem 1.1rem 1.2rem; }
    .values-idx { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; font-weight: 600; }
    .values-title { margin: 0 0 8px; font-family:'${displayFont}',serif; font-size: clamp(1rem, 1.5vw, 1.2rem); font-weight: 400; color: #f4f4f5; line-height: 1.2; }
    .values-desc { margin: 0; font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.55); }
    .section-block { min-height: 120vh; padding: 100px 8vw 120px; display: flex; flex-direction: column; justify-content: center; border-top: 1px solid rgba(59,130,246,0.08); background: transparent; }
    .section-block h2 { font-family:'${displayFont}',serif; font-size:clamp(30px,4vw,52px); font-weight:400; margin:0 0 14px; color:var(--cream); text-shadow:0 2px 24px rgba(0,0,0,.65); }
    .eyebrow { text-transform:uppercase; letter-spacing:0.22em; font-size:11px; color:var(--accent); margin:0 0 12px; font-weight:600; }
    .section-lead, .body-copy { max-width:62ch; font-size:17px; line-height:1.75; color:rgba(255,255,255,.9); text-shadow:0 1px 18px rgba(0,0,0,.55); margin:0 0 20px; }
    .feat-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:18px; margin-top:28px; max-width:1100px; }
    @media (max-width: 900px) { .feat-grid { grid-template-columns:1fr; } }
    .feat-card { padding:22px 22px 24px; border-radius:18px; border:1px solid rgba(59,130,246,0.12); background:rgba(12,18,36,0.88); box-shadow:0 24px 60px rgba(0,0,0,.35); transform-style:preserve-3d; }
    .feat-card h3 { margin:10px 0 8px; font-size:18px; font-weight:600; }
    .feat-card p { margin:0; font-size:14px; line-height:1.65; color:rgba(255,255,255,.78); }
    .feat-ico { color:var(--accent); display:flex; margin-bottom:4px; }
    .section-stats { flex-direction:row; flex-wrap:wrap; justify-content:space-around; gap:32px; text-align:center; min-height:70vh; }
    .stat-num { display:block; font-family:'${displayFont}',serif; font-size:clamp(36px,5vw,56px); color:#fff; }
    .stat-label { font-size:13px; color:rgba(255,255,255,.5); letter-spacing:0.06em; text-transform:uppercase; }
    .split { display:grid; grid-template-columns:1.1fr 0.9fr; gap:40px; align-items:center; max-width:1200px; margin:0 auto; }
    @media (max-width:900px){ .split { grid-template-columns:1fr; } }
    .ticks { list-style:none; padding:0; margin:16px 0 0; }
    .ticks li { display:flex; gap:12px; align-items:flex-start; margin-bottom:12px; font-size:15px; color:rgba(255,255,255,.85); }
    .tick-ico { color:var(--accent); flex-shrink:0; margin-top:2px; }
    .media-card { min-height:280px; border-radius:20px; border:1px solid rgba(59,130,246,0.15); background:
      radial-gradient(85% 120% at 10% 15%, rgba(59,130,246,.18), transparent 55%),
      radial-gradient(80% 100% at 85% 15%, rgba(56,189,248,.14), transparent 55%),
      rgba(12,18,36,0.88);
      box-shadow:0 30px 80px rgba(0,0,0,.45);
    }
    .quote { max-width:720px; padding:28px 32px; border-left:3px solid var(--accent); background:rgba(12,18,36,0.88); border:1px solid rgba(59,130,246,0.12); border-radius:0 16px 16px 0; }
    .quote p { font-size:20px; line-height:1.55; margin:0 0 12px; font-family:'${displayFont}',serif; }
    .quote cite { font-size:14px; color:rgba(255,255,255,.5); font-style:normal; }
    .cta-fin { text-align:center; align-items:center; min-height:90vh; }
    .cta-fin h2 { max-width:14ch; }
    .cta-row { display:flex; flex-direction:column; gap:10px; align-items:center; margin-top:8px; }
    .cta.primary { background:linear-gradient(135deg, rgba(59,130,246,.35), rgba(0,180,255,.2)); border-color:rgba(59,130,246,.35); }
    .cta-hint { font-size:13px; color:rgba(255,255,255,.45); }
    @media (max-width: 900px) { #overlay { padding:14px; } .nav-pill{top:12px;max-width:calc(100vw - 24px);} .links { display:none; } .section-block { min-height:85vh; padding:72px 22px 88px; } }
  </style>
</head>
<body>
  <div id="scrollProgressBar"></div>
  <div id="loader"><div id="loaderWrap"><div id="loader-bar"></div></div><p style="margin-top:10px;color:rgba(255,255,255,.55);font:12px monospace">Loading frames...</p></div>
  <div id="bgWrap"><canvas id="bgCanvas"></canvas></div>
  <div id="postFrameBackdrop" aria-hidden="true"></div>
  <div id="liquidFill" aria-hidden="true"></div>
  <div class="noise-overlay" aria-hidden="true"></div>

  <div id="overlay">
    <nav class="nav-pill">
      <div class="brand">${brandName}</div>
      <div class="links"><span>Story</span><span>Proof</span><span>Contact</span></div>
    </nav>
    <div class="hero" id="heroContent">
      <h1 id="heroHeadline">${heroH1}</h1>
      <p class="hero-lead">${heroLead}</p>
      <div class="hero-cta-row">
        <a class="cta" href="#section-1">See the experience</a>
        <a class="cta ghost" href="#section-5">Plan a launch</a>
      </div>
    </div>
  </div>

  <main id="pageRoot">
${sections}
  </main>

  <script id="app-script">
    (function () {
      var urls = window.__FRAME_DATA_URLS;
      var TOTAL_FRAMES = urls && urls.length ? urls.length : ${frameCount};
      var LERP_SPEED = 0.18;
      var images = new Array(TOTAL_FRAMES);
      var currentFrame = 0, targetFrame = 0, loaded = 0, isReady = false;
      var maxLoadedIndex = -1;
      function framePath(i){ return 'frames-jpg/frame_' + String(i+1).padStart(6,'0') + '.jpg'; }
      var loaderEl = document.getElementById('loader');
      var barEl = document.getElementById('loader-bar');
      var canvas = document.getElementById('bgCanvas');
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      function resize(){
        var w = innerWidth || document.documentElement.clientWidth || 1920;
        var h = innerHeight || document.documentElement.clientHeight || 1080;
        canvas.width = w;
        canvas.height = h;
      }
      addEventListener('resize', resize); resize();
      var FRAME_PHASE = 0.36;
      function drawFrame(img){
        if(!img||!img.naturalWidth) return;
        var cw=canvas.width, ch=canvas.height;
        if(cw<10||ch<10) return;
        ctx.clearRect(0,0,cw,ch);
        var p = getFrameScrubT();
        var parallaxX = Math.sin(p * Math.PI) * 6;
        var parallaxY = (p - 0.5) * 4;
        var s = Math.max(cw/img.naturalWidth, ch/img.naturalHeight);
        var w = Math.max(img.naturalWidth*s, cw+2), drawH = Math.max(img.naturalHeight*s, ch+2);
        ctx.drawImage(img, (cw-w)/2 + parallaxX, (ch-drawH)/2 + parallaxY, w, drawH);
        if(canvas){ canvas.style.transform = 'none'; }
      }
      function pageScroll01(){
        var el = document.documentElement;
        var body = document.body;
        var sh = Math.max(el ? el.scrollHeight : 0, body ? body.scrollHeight : 0, el ? el.offsetHeight : 0);
        var vh = innerHeight || (el ? el.clientHeight : 0) || 1;
        var maxScroll = Math.max(sh - vh, 1);
        var y = window.scrollY != null ? window.scrollY : (el ? el.scrollTop : 0);
        if (body && body.scrollTop) y = Math.max(y, body.scrollTop);
        if (maxScroll <= 1 && y < 0.5) {
          var pr = document.getElementById('pageRoot');
          if (pr && pr.scrollHeight > pr.clientHeight + 2) {
            y = pr.scrollTop;
            maxScroll = Math.max(pr.scrollHeight - pr.clientHeight, 1);
          }
        }
        return Math.min(Math.max(y / maxScroll, 0), 1);
      }
      function getFrameScrubT(){
        var pageP = pageScroll01();
        // As requested: scroll down = frames go down, scroll up = frames go up
        return 1 - pageP;
      }
      function onFrameLoad(){ loaded++; if(barEl) barEl.style.width=(loaded/TOTAL_FRAMES*100)+'%'; if(loaded>=TOTAL_FRAMES){ isReady=true; if(loaderEl) loaderEl.style.display='none'; } }
      for(var i=0;i<TOTAL_FRAMES;i++){
        images[i]=new Image();
        (function(frameIndex){
          images[frameIndex].onload=function(){ maxLoadedIndex=Math.max(maxLoadedIndex,frameIndex); onFrameLoad(); };
          images[frameIndex].onerror=function(){ maxLoadedIndex=Math.max(maxLoadedIndex,frameIndex); onFrameLoad(); };
          images[frameIndex].src=urls&&urls[frameIndex]?urls[frameIndex]:framePath(frameIndex);
        })(i);
      }
      window.__currentFrame = 0;

      var cards = document.querySelectorAll('.card-3d');
      cards.forEach(function(card){
        card.addEventListener('mousemove', function(e){
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(900px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateZ(0)';
          if (card.classList.contains('values-card')) {
            var px = ((e.clientX - r.left) / r.width) * 100;
            var py = ((e.clientY - r.top) / r.height) * 100;
            card.style.setProperty('--mx', px + '%');
            card.style.setProperty('--my', py + '%');
          }
        });
        card.addEventListener('mouseleave', function(){ card.style.transform = ''; });
      });

      /* Hero headline: simple fade-in instead of scramble */

      (function initScrollReveals(){
        var nodes = document.querySelectorAll('#pageRoot .reveal-on-scroll');
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function markAll(){ nodes.forEach(function(n){ n.classList.add('is-visible'); }); }
        if (reduced || !('IntersectionObserver' in window)) { markAll(); return; }
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
        nodes.forEach(function(n){ io.observe(n); });
      })();

      function animate(){
        if(maxLoadedIndex >= 0 || isReady) targetFrame = getFrameScrubT() * (TOTAL_FRAMES - 1);
        currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
        var idx = Math.round(currentFrame);
        if(idx < 0) idx = 0;
        if(idx >= TOTAL_FRAMES) idx = TOTAL_FRAMES - 1;
        if(!isReady) idx = Math.min(idx, Math.max(0, maxLoadedIndex));
        if(idx>=0&&idx<TOTAL_FRAMES) drawFrame(images[idx]);
        window.__currentFrame = currentFrame;
        /* Keep frame canvas fully visible at all times — do not crossfade to an opaque backdrop over #bgWrap */
        var bw = document.getElementById('bgWrap'), bd = document.getElementById('postFrameBackdrop');
        if (bw) bw.style.opacity = '1';
        if (bd) bd.style.opacity = '0';
        var hero = document.getElementById('heroContent');
        if (hero) {
          var p = getFrameScrubT();
          var o = Math.max(0, 1 - p * 3.2);
          var scale = 1 - p * 0.08;
          var y = -p * 60 - Math.sin(p * Math.PI) * 15;
          hero.style.opacity = String(o);
          hero.style.transform = 'translateY(' + y + 'px) scale(' + scale + ')';
          hero.style.pointerEvents = o < 0.08 ? 'none' : 'auto';
        }
        var pScroll = pageScroll01();
        var fillP = Math.max(0, Math.min(1, (pScroll - 0.9) / 0.1));
        var fill = document.getElementById('liquidFill');
        var sbar = document.getElementById('scrollProgressBar');
        if (fill) {
          fill.style.height = (fillP * 100) + 'vh';
          fill.style.borderTopLeftRadius = ((1 - fillP) * 100) + '%';
          fill.style.borderTopRightRadius = ((1 - fillP) * 100) + '%';
        }
        if (sbar) sbar.style.width = (pScroll * 100) + '%';

        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    })();
  </script>
</body>
</html>`;
}
