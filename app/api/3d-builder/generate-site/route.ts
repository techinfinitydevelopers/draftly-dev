import { NextRequest, NextResponse } from 'next/server';
import { enforceStudioLimits, incrementBuilderUsage } from '@/lib/studio-auth';
import { generateApiEasyText } from '@/lib/api-easy-studio';
import { estimateBuilderBilling } from '@/lib/builder-billing';
import { wrapWebsiteUserPrompt } from '@/lib/builder-display-models';
import {
  BUILDER_DEFAULT_MODEL,
  BUILDER_MODEL_OPTIONS,
  getChatUnitCost,
  getWebsiteGenerationModelCandidates,
} from '@/lib/builder-models';
import { canUseChat, PLAN_LIMITS, resetMonthlyCountsIfNeeded, type GenerationTracking } from '@/lib/subscription-plans';
import { isOwnerEmail } from '@/lib/owner-emails';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getMaxPromptCharsForPlan } from '@/lib/builder-prompt-limits';
import { BUILDER_UTILITY_SCROLL_REFERENCE_PROMPT } from '@/lib/builder-utility-scroll-reference-prompt';
import { BUILDER_SITE_UI_QUALITY_PROMPT } from '@/lib/builder-site-ui-quality-prompt';
import { buildReliableFallbackHtml } from '@/lib/builder-site-fallback-html';
import { parsePrompt, structuredPromptToSystemInstruction } from '@/lib/prompt-segmentation';
import { stripIterationContextForPromptParse } from '@/lib/builder-site-iteration-prompt';
import { injectGA4 } from '@/lib/ga4-inject';
import { buildGraphicsStackPromptFragment } from '@/lib/builder-graphics-stack-prompt';
import { getAdminDb } from '@/lib/firebase-admin';
import { decryptSecretsJson } from '@/lib/integrations/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type UserAsset = {
  id?: string;
  name?: string;
  dataUrl?: string;
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.warn(`[3d-builder] ${label} timed out after ${ms}ms`);
      // Surface a user-friendly, provider-agnostic message to the client.
      reject(new Error('Our AI backend is taking longer than expected. Please try again in a minute.'));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result as T;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HERO_HEADLINE_MAX = 120;

/** Split a long user brief into a short hero headline vs remaining copy (fallback templates). */
function splitPromptForHero(prompt: string): { headline: string; rest: string } {
  const t = prompt.trim();
  if (!t) return { headline: 'Welcome', rest: '' };

  // If this looks like a structured brief with "Brand Name: X", extract that for the headline.
  const brandNameMatch = t.match(/Brand\s*Name\s*[:\-]\s*"?([^"\n]+)"?/i);
  if (brandNameMatch && brandNameMatch[1]) {
    return {
      headline: brandNameMatch[1].trim(),
      rest: t
    };
  }

  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const labelRe = /^(title|headline|h1|hero|cta|button|subhead|subtitle|tagline|home|page\s*\d+|section\s*\d+|brand name|tagline|category|goal|design direction|animation style|homepage structure)\s*[:—\-]/i;
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

/**
 * Models often set body to white for “light” brands, shrink #bgWrap / #bgCanvas, or paint #pageRoot white,
 * which produces bands over the scroll frames. This guard forces the frame layer to cover the viewport and
 * keeps html/body transparent so extracted frames remain visible (no solid #070707 sheet).
 */
const DRAFTLY_FRAME_VIEWPORT_GUARD = `<style id="__draftly_bg_viewport_guard">
html{height:100%;background:transparent!important}
body{min-height:100%;margin:0;background:transparent!important}
#bgWrap{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-height:100vh!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important;margin:0!important;padding:0!important;box-sizing:border-box!important}
#bgCanvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;margin:0!important;padding:0!important;box-sizing:border-box!important}
#bgWrap,#bgCanvas,#bgWrap *{filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
#overlay{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important}
#pageRoot{background:transparent!important}
#postFrameBackdrop{position:fixed!important;inset:0!important;z-index:1!important;pointer-events:none!important;opacity:0!important;margin:0!important;padding:0!important;box-sizing:border-box!important}
body>nav,body>header,#pageRoot>nav:first-of-type,#pageRoot>header:first-of-type,nav[role="navigation"],header[role="banner"]{z-index:8000!important}
</style>`;

function injectDraftlyFrameViewportGuard(html: string): string {
  if (!html.includes('bgWrap') || !html.includes('bgCanvas')) return html;
  if (html.includes('__draftly_bg_viewport_guard')) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${DRAFTLY_FRAME_VIEWPORT_GUARD}</head>`);
  return html;
}

/**
 * Previously we required substrings like `framePath` + `__FRAME_DATA_URLS`, which rejected many valid
 * model outputs (minified names, alternate structure) and forced a thin fallback. Accept any HTML that
 * clearly implements canvas frame loading + document scroll driving the scrub.
 */
function isLikelyValidFrameScrollHtml(html: string): boolean {
  const h = html;
  const hasBg = /id\s*=\s*['"]bgWrap['"]/i.test(h) && /id\s*=\s*['"]bgCanvas['"]/i.test(h);
  const hasFramePipeline =
    /frames-(?:webp|jpg)|__FRAME_DATA_URLS|padStart\s*\(\s*6|\.(?:webp|jpg)/i.test(h) &&
    (/new\s+Image\s*\(/i.test(h) || /Image\s*\(/i.test(h)) &&
    (/drawImage/i.test(h) || /getContext\s*\(\s*['"]2d['"]/i.test(h));
  const hasScroll = /scrollY|scrollTop|pageScroll|scrollHeight/i.test(h);
  return hasBg && hasFramePipeline && hasScroll;
}

function buildVideoFallbackHtml(prompt: string): string {
  const { headline, rest } = splitPromptForHero(prompt);
  const safeHeadline = escapeHtml(headline);
  const safeLead = escapeHtml(rest || 'This fallback keeps your brief in a readable hero layout.');
  const navBits = escapeHtml(headline.split(/\s+/).slice(0, 3).join(' ') || 'Website');
  const heroAssetBlock = '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Draftly Video Website</title>
  <style id="app-styles">
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,sans-serif;background:#050507;color:#fff;overflow-y:auto}
    #heroVideoWrap{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;z-index:0;background:#000}
    #heroVideo{position:absolute;top:50%;left:50%;min-width:100%;min-height:100%;width:auto;height:auto;object-fit:cover;transform:translate(-50%,-50%) scale(1.12);z-index:0}
    #shade{position:fixed;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,.6))}
    nav{position:fixed;z-index:20;left:20px;right:20px;top:16px;display:flex;justify-content:space-between;padding:12px 16px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);backdrop-filter:blur(14px);border-radius:14px}
    #hero{position:relative;z-index:20;min-height:100vh;padding:22vh 8vw 8vh;max-width:900px}
    h1{font-size:clamp(42px,7vw,84px);line-height:1.03;margin:0 0 12px}
    p{font-size:clamp(16px,2.2vw,22px);line-height:1.65;color:rgba(255,255,255,.92);max-width:64ch}
    main{position:relative;z-index:20;background:linear-gradient(180deg,rgba(5,5,7,.1),rgba(5,5,7,.95));}
    section{min-height:160vh;padding:86px 8vw;border-top:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;justify-content:center;}
    section h2{font-size:clamp(28px,4vw,52px);margin:0 0 10px}
  </style>
</head>
<body>
  <div id="heroVideoWrap"><video id="heroVideo" autoplay muted loop playsinline></video></div>
  <div id="shade"></div>
  <nav><strong>${navBits}</strong><span>Overview • Offer • Details • Contact</span></nav>
  <header id="hero"><h1>${safeHeadline}</h1><p>${safeLead}</p>${heroAssetBlock}</header>
  <main>
    <section><h2>Features</h2><p>Professional sections with crisp readability and conversion-focused structure.</p></section>
    <section><h2>Showcase</h2><p>Reusable blocks that are easy to edit via prompt refinements.</p></section>
    <section><h2>Pricing</h2><p>Straightforward CTA hierarchy and modern visual rhythm.</p></section>
    <section><h2>Contact</h2><p>Clear actions and polished branding throughout the journey.</p></section>
  </main>
  <script id="app-script">
    (function(){
      var v=document.getElementById('heroVideo');
      if(window.__VIDEO_DATA_URL){ v.src = window.__VIDEO_DATA_URL; }
      else { v.src = 'assets/video/hero.mp4'; }
    })();
  </script>
</body>
</html>`;
}

function injectAssetResolverRuntime(html: string): string {
  const runtime = `
<script id="draftly-asset-runtime">
(function(){
  function resolveAssetById(id){
    try {
      if (!id || !window.__USER_ASSETS) return null;
      return window.__USER_ASSETS[id] || null;
    } catch (_) { return null; }
  }

  function resolveAssetByName(name){
    try {
      if (!name || !window.__USER_ASSETS) return null;
      const keys = Object.keys(window.__USER_ASSETS);
      const normalized = String(name).trim().toLowerCase();
      const exact = keys.find(function(k){ return k.toLowerCase() === normalized; });
      if (exact) return window.__USER_ASSETS[exact];
      return null;
    } catch (_) { return null; }
  }

  function applyAssetBindings(root){
    if (!root || !window.__USER_ASSETS) return;

    var idTargets = root.querySelectorAll('[data-asset-id]');
    idTargets.forEach(function(el){
      var id = el.getAttribute('data-asset-id');
      var src = resolveAssetById(id);
      if (src && (el.tagName === 'IMG' || el.tagName === 'SOURCE')) {
        el.setAttribute('src', src);
      }
    });

    var nameTargets = root.querySelectorAll('[data-asset-name]');
    nameTargets.forEach(function(el){
      var name = el.getAttribute('data-asset-name');
      var src = resolveAssetByName(name);
      if (src && (el.tagName === 'IMG' || el.tagName === 'SOURCE')) {
        el.setAttribute('src', src);
      }
    });

    // Recovery path: model sometimes outputs src="window.__USER_ASSETS['asset_x']"
    var badSrcTargets = root.querySelectorAll('img[src*="window.__USER_ASSETS"],source[src*="window.__USER_ASSETS"]');
    badSrcTargets.forEach(function(el){
      var raw = el.getAttribute('src') || '';
      var m = raw.match(/window\\.__USER_ASSETS\\[['"]([^'"]+)['"]\\]/);
      if (m && m[1]) {
        var src = resolveAssetById(m[1]) || resolveAssetByName(m[1]);
        if (src) el.setAttribute('src', src);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ applyAssetBindings(document); }, { once: true });
  } else {
    applyAssetBindings(document);
  }
})();
</script>`;

  if (html.includes('id="draftly-asset-runtime"')) return html;
  if (html.includes('</body>')) return html.replace('</body>', `${runtime}\n</body>`);
  return `${html}\n${runtime}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      totalFrames,
      existingCode,
      buildTarget,
      userAssets,
      userId,
      websiteModelId,
      graphicsStack,
    } = await req.json();
    const graphicsStackPrompt = buildGraphicsStackPromptFragment(graphicsStack);
    const mode: 'frame-scroll' = 'frame-scroll';
    const target: 'desktop' | 'mobile' = buildTarget === 'mobile' ? 'mobile' : 'desktop';
    const isIteration = Boolean(existingCode);
    const hasUploadedAssets = Array.isArray(userAssets) && userAssets.some((a: any) => a && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:image/'));
    const allowProductAssetPlacement = isIteration || hasUploadedAssets;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const assets: Required<UserAsset>[] = Array.isArray(userAssets)
      ? userAssets
        .filter((a: UserAsset) => a && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:image/'))
        .slice(0, 12)
        .map((a: UserAsset, i: number) => ({
          id: (a.id && String(a.id).trim()) || `asset_${i + 1}`,
          name: (a.name && String(a.name).trim()) || `Uploaded image ${i + 1}`,
          dataUrl: String(a.dataUrl),
        }))
      : [];

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data() || {};
    let userEmail = (userData.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch { /* ignore */ }
    }
    const isOwner = isOwnerEmail(userEmail);
    let subscription = (userData.subscription || { plan: 'free', status: 'active' }) as {
      plan: string;
      status: string;
      customStudioCredits?: number;
    };
    if (isTestingCreditsEmail(userEmail)) {
      subscription = { plan: 'testing', status: 'active' };
    }
    const plan = String(subscription.plan || 'free');
    const maxPromptChars = getMaxPromptCharsForPlan(plan, isOwner);
    if (prompt.length > maxPromptChars) {
      return NextResponse.json(
        { error: `Prompt is too long (maximum ${maxPromptChars} characters for your plan).` },
        { status: 400 },
      );
    }

    const resolvedModelId =
      typeof websiteModelId === 'string' && BUILDER_MODEL_OPTIONS.some((o) => o.id === websiteModelId)
        ? websiteModelId
        : BUILDER_DEFAULT_MODEL;
    const promptForGeneration = wrapWebsiteUserPrompt(prompt, resolvedModelId);

    const parsedPrompt = parsePrompt(
      isIteration ? stripIterationContextForPromptParse(prompt) : prompt,
    );
    const structuredBrief = structuredPromptToSystemInstruction(parsedPrompt);

    const billing = estimateBuilderBilling({
      prompt,
      existingCode: typeof existingCode === 'string' ? existingCode : '',
      assetsCount: assets.length,
      mode,
      isIteration,
      modelId: resolvedModelId,
      subscriptionPlan: plan,
      isOwner,
    });

    // Apply plan-specific auth/caps (paid plans only for full site generation).
    const tracking = resetMonthlyCountsIfNeeded(
      (userData.generationTracking || {
        fullAppsGenerated: 0,
        uiPreviewsGenerated: 0,
        chatsUsed: 0,
        creditsUsed: 0,
        studioGenerations: 0,
        studioImageGenerations: 0,
        studioVideoGenerations: 0,
        builderImageGenerations: 0,
        builderVideoGenerations: 0,
        builderTrialCreditsUsed: 0,
        lastResetDate: new Date().toISOString(),
        projects: {},
      }) as GenerationTracking,
      subscription
    );
    const status = String(subscription.status || 'inactive');
    const isPaidBuilderPlan = ['basic', 'basic-plus', 'pro', 'premium', 'agency', 'tester', 'testing'].includes(plan) && status === 'active';
    const isLimitedTester200 =
      subscription.plan === 'tester' &&
      typeof subscription.customStudioCredits === 'number' &&
      Number.isFinite(subscription.customStudioCredits) &&
      Math.floor(subscription.customStudioCredits) <= 200;

    if (!isOwner && !isPaidBuilderPlan) {
      return NextResponse.json(
        { error: 'The 3D Website Builder is exclusively available for paid plans. Please upgrade to get started.', requiresUpgrade: true },
        { status: 403 },
      );
    }

    // Paid plans use normal shared credit enforcement (owner bypassed in enforceStudioLimits).
    const auth = await enforceStudioLimits({ userId }, { creditCost: billing.creditCost });
    if (!auth.allowed) return auth.errorResponse!;

    if (!isOwner && !isIteration) {
      const sites3DUsed = tracking.sites3DGenerated || 0;
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const fullSitesLimit = isLimitedTester200 ? 1 : (limits as { sites3D?: number }).sites3D ?? 0;
      if (fullSitesLimit > 0 && sites3DUsed >= fullSitesLimit) {
        const packageLabel = isLimitedTester200 ? 'your 200-credit access package' : `${plan} plan`;
        return NextResponse.json(
          {
            error: `3D Builder website limit reached (${fullSitesLimit}/${fullSitesLimit}) for ${packageLabel}.`,
            limitReached: true,
            used: sites3DUsed,
            limit: fullSitesLimit,
            type: 'full-site',
          },
          { status: 429 },
        );
      }
    }

    // Iterative "chat updates" must also respect per-plan chat limits (owner has no limit).
    if (!isOwner && isIteration) {
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const planChatAllowance = Number((limits as { chats?: number }).chats ?? 0) || 0;
      const chatUnitCost = getChatUnitCost(resolvedModelId, planChatAllowance);

      if (isLimitedTester200) {
        const usedChats = tracking.chatsUsed || 0;
        const chatLimit = 3;
        if (usedChats + chatUnitCost > chatLimit) {
          return NextResponse.json(
            {
              error: `3D Builder iteration chat limit reached (${chatLimit}/${chatLimit}) for your 200-credit access package.`,
              remainingChats: 0,
              limitReached: true,
              used: usedChats,
              limit: chatLimit,
              type: 'chat',
            },
            { status: 429 },
          );
        }
      } else if (subscription.plan === 'basic') {
        // Basic plan: 10 chats per generated website, up to 2 websites (max 20 chats).
        const fullSitesGenerated = tracking.sites3DGenerated || 0;
        const basicChatLimit = Math.min(fullSitesGenerated * 10, 20);
        const usedChats = tracking.chatsUsed || 0;
        if (basicChatLimit <= 0) {
          return NextResponse.json(
            {
              error: 'Generate a website first to start iterative chat updates.',
              remainingChats: 0,
              limitReached: true,
              used: usedChats,
              limit: 0,
              type: 'chat',
            },
            { status: 429 },
          );
        }
        if (usedChats + chatUnitCost > basicChatLimit) {
          return NextResponse.json(
            {
              error: `3D Builder iteration chat limit reached (${basicChatLimit}/${basicChatLimit}) for Basic plan.`,
              remainingChats: 0,
              limitReached: true,
              used: usedChats,
              limit: basicChatLimit,
              type: 'chat',
            },
            { status: 429 },
          );
        }
      } else {
        const chatCheck = canUseChat(subscription, tracking, chatUnitCost);
        if (!chatCheck.allowed) {
          return NextResponse.json(
            { error: chatCheck.reason || 'Chat limit reached for this plan.', remainingChats: chatCheck.remaining ?? 0 },
            { status: 429 },
          );
        }
      }
    }

    console.log('🌐 3D Builder: Generating website code with API-Easy...');

    const frameCount = totalFrames || 400;
    const assetsPromptBlock = assets.length
      ? allowProductAssetPlacement
        ? `\n\nUPLOADED USER ASSETS (use exact visuals):
- User uploaded ${assets.length} image(s). Place them where the USER REQUEST describes (hero, product grid, gallery, logo strip, etc.). Short commands like "add product", "put this in the hero", "replace the image" refer to these files.
- Runtime map in the live preview and exported site: window.__USER_ASSETS['asset_id'] → data URL string.
- PREFERRED (works with Draftly asset runtime): <img data-asset-id="ASSET_ID" alt="descriptive alt" /> — do not leave src empty without data-asset-id; the runtime assigns src. Also valid: set img.src in a tiny inline script after DOM ready using window.__USER_ASSETS['id'].
- WRONG: <img src="window.__USER_ASSETS['x']" ...> as a literal string.
- Match ASSET_ID to filename or role when the user names an upload (e.g. product shot → shopping section).

ASSET IDs:
${assets.map((a) => `- ${a.id}: ${a.name}`).join('\n')}`
        : `\n\nUPLOADED REFERENCE ASSETS (style-only mode):
- User uploaded ${assets.length} image(s) as visual references for style/direction.
- IMPORTANT: Do NOT directly place/copy these exact images into the generated website.
- IMPORTANT: Do NOT output <img data-asset-id=...> in this first build.
- IMPORTANT: Use references only for palette, layout direction, spacing rhythm, visual tone, and design language.
- Keep media placeholders abstract (gradients/placeholders) until later user iteration requests product placement.`
      : '';

    const systemPrompt = existingCode
      ? `You are an expert web developer and premium brand designer. Update the EXISTING website code based on the user's request.

${structuredBrief}

CONVERSATIONAL EDITS (Cursor-style):
- The USER REQUEST may be a short imperative ("add product", "change this", "move CTA up", "use my upload in the hero"). Treat it as a concrete HTML/CSS/JS change. Do not reply with explanations — only the updated page.
- If the prompt includes "RECENT CHAT" plus "CURRENT EDIT", use the chat lines only to resolve pronouns ("this", "that section", "the image"); the CURRENT EDIT block is the instruction you must apply.
- When new images are listed in UPLOADED USER ASSETS, wire them into the layout the user asked for (see data-asset-id rules above).

USER-FIRST: Obey the user's exact instructions for copy, fonts, colors, sections, and assets. Do not substitute a generic redesign when they asked for a specific change.
- When the user pastes a long brief or structured requirements, parse them intelligently. DO NOT dump the entire prompt into the hero section. Create the sections they describe.
BUSINESS-FIRST: Treat any business details in the request (offer, products/services, audience, tone, location, pricing, hours, contact points) as source-of-truth content. Keep those details and adapt layout around them; do not overwrite with placeholder business text.

VISUAL TARGET (preserve unless user asks to change): Utility-scroll premium aesthetic — editorial serif/sans pairing, centered glassy nav pill, optional single-dot custom cursor + noise overlay, 3D-tilt cards (UI only), smooth scrubbed hero fade. **Scroll reveals:** keep IntersectionObserver-based \`.reveal-on-scroll\` → \`.is-visible\` on sections/cards; if missing, add them. **Frames must stay visible:** keep #bgWrap / #bgCanvas at full opacity for the whole page; do NOT crossfade to an opaque #postFrameBackdrop over the sequence (optional: leave #postFrameBackdrop transparent or at opacity 0).

${BUILDER_SITE_UI_QUALITY_PROMPT}

AVOID generic AI slop—write copy specific to the user's prompt. Use distinctive typography and scroll-triggered motion. Skip cliché filler unless the user asked for that tone.

HARD CONSTRAINTS (must stay intact):
- Keep frame-sequence rendering and scroll frame controls intact.
- Keep #bgWrap opacity at 1.0 at all times so extracted frames remain visible behind UI; keep #postFrameBackdrop transparent (opacity 0) unless the user explicitly asks for a tint — never replace the frame layer with a solid ink gradient.
- Keep scroll-progress mapping intact:
  - early scroll => frame 1 → last frame (within FRAME_PHASE)
  - after FRAME_PHASE => hold last frame; frames still visible (no hiding the canvas)
  - scrolling up rewinds frames when still in frame phase
- Do NOT add canvas CSS perspective/3D transforms, custom cursor, or per-section parallax in the animation loop (causes jank and half-screen black).
- Section containers: background transparent (frames show between sections). Content INSIDE sections (cards, grids, quote/stat blocks) MUST have dark semi-opaque backgrounds: rgba(8,12,24,0.88) to rgba(16,22,44,0.92) + border:1px solid rgba(59,130,246,0.12). Blue accent #3b82f6.
- (Do not use full-bleed dark fills across sections or cinematic bars that hide frame sequence.) — transparent or rgba(255,255,255,0.02–0.06) only; NO backdrop-filter on sections or #overlay (blurs frames). Never full-bleed near-black section fills or edge-to-edge horizontal “cinematic” bars that hide the sequence.
- CRITICAL — full-viewport frames: keep #bgWrap position:fixed; inset:0 (or equivalent) and #bgCanvas filling it (100% width+height). Do NOT set body background to #fff/#fafafa (use #050505–#0a0a0a for the page; put brand white/cream only on cards). Do NOT give #pageRoot a solid white full-bleed background over the first screen — keep #pageRoot background transparent; use margin-top:100vh (or padding-top) so the first viewport is only #bgWrap + #overlay.
- Keep visual readability high (opaque text, strong contrast).
- Keep existing product image placements editable.

Only modify UI content, copy, layout, and styling based on request.

CURRENT CODE:
${existingCode}

USER REQUEST: ${promptForGeneration}
BUILD TARGET: ${target}
${assetsPromptBlock}${graphicsStackPrompt}

Return the COMPLETE updated HTML file. ALL frame loading and scroll-progress mapping must remain intact.`
      : `You are a senior product designer and full-stack engineer. You output ONE complete HTML file for a scroll-scrubbed WebP background (technical skeleton below).

=== CORE DIRECTIVE ===
You MUST interpret the user's prompt and build a real, functional website — NOT echo their instructions back.
Convert their raw ideas into: structured UI layouts, component hierarchy, clean modern design, and production-ready code.
NEVER repeat the user's prompt text in the output. ALWAYS expand and improve design quality.
Use modern UI standards: glassmorphism, premium gradients, generous spacing, sharp typography hierarchy.

${structuredBrief}

${BUILDER_UTILITY_SCROLL_REFERENCE_PROMPT}

${BUILDER_SITE_UI_QUALITY_PROMPT}

CONTENT — USER MESSAGE ONLY:
- Every headline, nav label, section title, body copy, CTA wording, and font/palette choice must be inferred SOLELY from the USER MESSAGE. Do not add template copy such as “Scroll-reactive 3D experience”, “Start Exploring”, “Draftly Studio”, or generic Features/Showcase/Pricing blocks unless the user explicitly asked for those words or sections.
- If the user provided business context, all visible copy must reflect that business context; never replace with generic lorem/agency copy.
- NEVER paste the raw USER MESSAGE (or most of it) into a single <h1>. The hero <h1> must be a short headline only (roughly one line, ≤ ~120 characters): the product/site name, campaign line, or clearest title the user implied — not their full instructions or paragraphs.
- CRITICAL: Never output a "What You Asked For" section. Never just repeat the user's instructions back to them. You are an expert designer building the site, you must INTERPRET the instructions and write final, polished marketing copy for the website. Write the actual website content (features, about, CTA), not meta-commentary about the prompt.
- If the prompt looks like a list of instructions (like "Build a high-end website... Brand: X, Tagline: Y, Goal: Z"), parse it intelligently. DO NOT print "Build a high-end website" as the H1. The H1 should be the brand name or tagline. Put the remaining descriptive content in the appropriate sections (about, collections, etc).
- Longer copy from the user belongs in: a hero subline <p> under the h1, and in <main id="pageRoot"> sections. If they wrote “Page 1 / Home / second page / Section 3” or labeled blocks (Title:, CTA:, Hero copy:, etc.), map each label to the correct place: nav links, h1, primary button text, and section headings + paragraphs respectively.
- If the brief is unstructured prose, infer: the strongest short title or first sentence fragment for h1; following sentences and paragraphs become supporting hero text and scroll sections in order.
- First-screen #heroContent: (1) one short main h1, (2) optional one supporting <p> if the user gave substantive hero copy, (3) one primary CTA whose label matches the user’s requested button text (or a sensible verb if they only described the action).
- Optional: minimal top nav with 3–5 links whose labels match the user’s business or named pages/sections (still derived from USER MESSAGE).

DEFAULT MOTION (required):
- **Hero headline:** Give the main hero h1 the id "heroHeadline". Animate it with a smooth fade-in + translateY entrance (opacity 0→1, translateY(30px)→0 over ~0.8s with cubic-bezier(0.16, 1, 0.3, 1)). Do NOT use character scramble / decode effects.
- Subline / CTAs may use @keyframes fade-in (opacity 0→1, slight translateY) with staggered delay.
- Add motion-designer polish on UI only (never transform #bgCanvas): e.g. staggered line/child reveals, translate3d + perspective on cards, hover tilt rotateX/rotateY ≤6deg, cubic-bezier(0.16, 1, 0.3, 1), IntersectionObserver or scroll-driven section entrances. Keep it lightweight (no huge animated box-shadows).

OVERLAY — NO BLACK BOXES ON THE FRAMES:
- Do NOT add full-width horizontal strips, letterbox divs, or nav bars spanning 100vw with dark rgba fills — they read as “black boxes” over the scroll sequence.
- If you include nav: use a compact floating pill (max-width ~min(560px, 92vw)), centered or inset with safe margins; dark blue-tinted background rgba(8,12,24,0.65) with border:1px solid rgba(59,130,246,0.15).
- #overlay root: no background or gradient on the overlay container itself — only individual chips/buttons may have small rgba backgrounds. Hero type uses text-shadow for legibility.
- **Nav vs headline:** \`#heroContent\` must have **padding-top: clamp(96px, 14vh, 160px)** (or equivalent) so the **first line of \`h1\` never sits under** the fixed nav pill.

SHARP FRAMES — NO BLUR:
- NEVER use backdrop-filter or filter:blur on #bgWrap, #bgCanvas, or #overlay (overlay is full-viewport — blur would blur the frames). Do NOT use backdrop-filter on tall sections that reveal the fixed frames behind them; use flat rgba scrims or borders only. Nav: compact floating pill only — no full-bleed dark bars, no frosted glass over the whole viewport.
- Text legibility: text-shadow on type, not full-screen blur veils.

DARK CARD SURFACES (MANDATORY):
- Every section card, feature card, bento tile, stat block, quote block, and info panel MUST have a dark semi-opaque background: rgba(8,12,24,0.88) to rgba(16,22,44,0.92) with border: 1px solid rgba(59,130,246,0.12). NEVER leave content boxes fully transparent — the user must see a dark surface behind text. The SECTION CONTAINER may be transparent (frames visible between sections), but all content items inside sections carry the dark surface.
- Blue-tint color theme: accent #3b82f6; text #E8ECF4; muted #94A3B8; card backgrounds use deep blue-black rgba fills.

LAYOUT / SCROLL:
- html, body { min-height:100%; background:transparent; } (not solid black — frames must show through). #bgWrap fixed inset:0; #bgCanvas 100%×100%; canvas internal size = innerWidth×innerHeight in resize().
- #pageRoot { background:transparent; margin-top:100vh; } Add enough tall sections so scroll range maps frames; section copy must match USER MESSAGE theme. No opaque full-viewport white or black layer on the first screen.

BUILD TARGET: ${target}
TOTAL FRAMES: ${frameCount}
FRAME PATH: frames-jpg/frame_NNNNNN.jpg (e.g., frame_000001.jpg)

USER MESSAGE:
${promptForGeneration}
${assetsPromptBlock}${graphicsStackPrompt}

Output a COMPLETE single HTML file. Return ONLY HTML (no markdown).

Implement the following JavaScript system requirements exactly:

──────────────────────────────────────────
FRAME PRELOADER + ALWAYS-VISIBLE FRAMES (copy exactly)
──────────────────────────────────────────
<script>
(function(){
  const TOTAL_FRAMES = window.__FRAME_DATA_URLS ? window.__FRAME_DATA_URLS.length : ${frameCount};
  const LERP_SPEED = 0.15;
  const FRAME_PHASE = 0.36;
  const images = new Array(TOTAL_FRAMES);
  let currentFrame = 0, targetFrame = 0, loaded = 0, isReady = false;
  let maxLoadedIndex = -1;

  function framePath(i) { return 'frames-jpg/frame_' + String(i+1).padStart(6,'0') + '.jpg'; }

  const loaderEl = document.getElementById('loader');
  const barEl = document.getElementById('loader-bar');
  function onFrameLoad() {
    loaded++;
    if (barEl) barEl.style.width = (loaded/TOTAL_FRAMES*100)+'%';
    if (loaded >= TOTAL_FRAMES) {
      isReady = true;
      if (loaderEl) loaderEl.style.display = 'none';
    }
  }
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    images[i] = new Image();
    const frameIndex = i;
    images[i].onload = function () {
      maxLoadedIndex = Math.max(maxLoadedIndex, frameIndex);
      onFrameLoad();
    };
    images[i].onerror = function () {
      maxLoadedIndex = Math.max(maxLoadedIndex, frameIndex);
      onFrameLoad();
    };
    images[i].src = window.__FRAME_DATA_URLS ? window.__FRAME_DATA_URLS[i] : framePath(i);
  }

  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function resize() {
    const w = window.innerWidth || document.documentElement.clientWidth || 1920;
    const h = window.innerHeight || document.documentElement.clientHeight || 1080;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.transform = 'none';
  }
  window.addEventListener('resize', resize); resize();

  function drawFrame(img) {
    if (!img || !img.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    if (cw < 10 || ch < 10) return;
    ctx.clearRect(0, 0, cw, ch);
    const scale = Math.max(cw/img.naturalWidth, ch/img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, (cw-w)/2, (ch-h)/2, w, h);
  }

  function pageScroll01() {
    const el = document.documentElement;
    const body = document.body;
    const sh = Math.max(el ? el.scrollHeight : 0, body ? body.scrollHeight : 0, el ? el.offsetHeight : 0);
    const vh = window.innerHeight || (el ? el.clientHeight : 0) || 1;
    let maxScroll = Math.max(sh - vh, 1);
    let y = window.scrollY != null ? window.scrollY : (el ? el.scrollTop : 0);
    if (body && body.scrollTop) y = Math.max(y, body.scrollTop);
    if (maxScroll <= 1 && y < 0.5) {
      const pr = document.getElementById('pageRoot');
      if (pr && pr.scrollHeight > pr.clientHeight + 2) {
        y = pr.scrollTop;
        maxScroll = Math.max(pr.scrollHeight - pr.clientHeight, 1);
      }
    }
    return Math.min(Math.max(y / maxScroll, 0), 1);
  }
  function getFrameScrubT() {
    const p = pageScroll01();
    if (p <= FRAME_PHASE) return p / FRAME_PHASE;
    return 1;
  }
  window.__currentFrame = 0;
  function animate() {
    if (maxLoadedIndex >= 0 || isReady) {
      targetFrame = getFrameScrubT() * (TOTAL_FRAMES - 1);
    }
    currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
    window.__currentFrame = currentFrame;
    var idx = Math.round(currentFrame);
    if (idx < 0) idx = 0;
    if (idx >= TOTAL_FRAMES) idx = TOTAL_FRAMES - 1;
    if (!isReady) idx = Math.min(idx, Math.max(0, maxLoadedIndex));
    if (idx >= 0 && idx < TOTAL_FRAMES) drawFrame(images[idx]);
    var bgWrap = document.getElementById('bgWrap');
    var backdrop = document.getElementById('postFrameBackdrop');
    if (bgWrap) bgWrap.style.opacity = '1';
    if (backdrop) backdrop.style.opacity = '0';
    var pHero = getFrameScrubT();
    var hero = document.getElementById('heroContent');
    if (hero) {
      var o = Math.max(0, 1 - pHero * 3.2);
      var scale = 1 - pHero * 0.08;
      var y = -pHero * 48;
      hero.style.opacity = o;
      hero.style.transform = 'translateY(' + y + 'px) scale(' + scale + ')';
      hero.style.pointerEvents = o < 0.08 ? 'none' : 'auto';
    }
    // Liquid fill effect + scroll progress bar
    var fillP = Math.max(0, Math.min(1, (pageScroll01() - 0.9) / 0.1));
    var fill = document.getElementById('liquidFill');
    var sbar = document.getElementById('scrollProgressBar');
    if (fill) { fill.style.height = (fillP * 100) + 'vh'; fill.style.borderTopLeftRadius = ((1-fillP)*100)+'%'; fill.style.borderTopRightRadius = ((1-fillP)*100)+'%'; }
    if (sbar) sbar.style.width = (pageScroll01() * 100) + '%';
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
</script>

──────────────────────────────────────────
REQUIRED HTML STRUCTURE
──────────────────────────────────────────
The HTML body MUST contain:
<div id="scrollProgressBar" style="position:fixed;top:0;left:0;height:2px;background:#fff;z-index:1000;width:0%;mix-blend-mode:difference;pointer-events:none;transition:width 0.15s ease-out"></div>
<div id="loader" style="position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column">
  <div style="width:200px;height:2px;background:rgba(255,255,255,0.1);border-radius:9px;overflow:hidden">
    <div id="loader-bar" style="height:100%;width:0%;background:white;transition:width 0.3s"></div>
  </div>
  <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:12px;font-family:monospace">Loading frames...</p>
</div>
<div id="bgWrap" style="position:fixed;inset:0;z-index:0;overflow:hidden;opacity:1"><canvas id="bgCanvas" style="position:absolute;left:0;top:0;width:100%;height:100%;display:block"></canvas></div>
<div id="postFrameBackdrop" aria-hidden="true"></div>
<div id="liquidFill" style="position:fixed;bottom:0;left:0;right:0;z-index:45;height:0vh;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(248,250,252,0) 0%,rgba(241,245,249,0.9) 45%,#f1f5f9 100%),radial-gradient(ellipse 95% 55% at 50% 0%,rgba(59,130,246,0.14),transparent 62%);box-shadow:0 -36px 72px rgba(15,23,42,0.1)"></div>

Then add (optional noise div + overlay + page):
<div class="noise-overlay" aria-hidden="true"></div>
<div id="overlay" style="position:fixed;inset:0;z-index:40;pointer-events:none;background:transparent">
  <div id="heroContent" style="padding-top:clamp(96px,14vh,160px);box-sizing:border-box"><!-- h1 id="heroHeadline" + lead + CTA — padding clears fixed nav --></div>
</div>
<main id="pageRoot" style="position:relative;z-index:30;pointer-events:auto;background:transparent">
  <!-- 5–7 tall sections; keep section backgrounds transparent or very light rgba so frames stay visible behind -->
</main>

Style #postFrameBackdrop (fixed inset:0; z-index:1; opacity:0; pointer-events:none): default to **background: transparent** so it never hides the WebP sequence. Only if the user explicitly asks for a tint, add a very light optional scrim (max opacity ~0.12); never a full-viewport opaque ink layer.

- #bgWrap is fixed inset:0. #bgCanvas fills it (100% width/height). drawFrame MUST use cover scaling (scale = max(cw/imgW, ch/imgH)) and center the image — **never** apply CSS perspective or 3D transforms to the canvas (causes black regions).
- OPTIONAL custom cursor (utility-style): single #cursorDot (or class cursor-dot) + mousemove; expand on a, button, .hoverable; hide for coarse pointers. If omitted, cursor:auto on body.

In CSS:
- html, body { min-height: 100%; background: transparent; }
- body: overflow-y:auto; overflow-x:hidden; margin:0; (do NOT use a full-viewport solid black body — it hides the frame canvas)
- #pageRoot: background transparent; margin-top:100vh OR equivalent so the first screen shows frames + overlay only.
- Give each page section meaningful height (**min-height: min 100vh, prefer 120vh**) and readable text; cards MUST use dark semi-opaque fills (rgba(8,12,24,0.88) to rgba(16,22,44,0.92) with border:1px solid rgba(59,130,246,0.12)) — frames must still read through the page behind them.
- **#liquidFill** must not be a flat empty white only: use layered gradient + soft radial highlight (see REQUIRED HTML default) and optional slow opacity pulse via @keyframes so the finale feels premium, not blank.

Build enough scrollable sections (e.g. 5–7) so the frame phase (~first 36% of total scroll) feels long enough; remaining scroll uses IntersectionObserver or CSS scroll-driven animations on content (stagger, translateY, opacity).

SCROLL REVEAL (mandatory — same HTML file, lightweight, no libraries):
- Add CSS: \`.reveal-on-scroll{opacity:0;transform:translate3d(0,40px,0) perspective(900px) rotateX(8deg);transition:opacity .65s cubic-bezier(0.16,1,0.3,1),transform .65s cubic-bezier(0.16,1,0.3,1)}\` and \`.reveal-on-scroll.is-visible{opacity:1;transform:translate3d(0,0,0) rotateX(0deg)}\`. Optional stagger: \`.reveal-on-scroll:nth-child(1){transition-delay:0ms}\` … up to ~6th child with +60ms steps.
- Add a short script before \`</body>\` (after the frame IIFE): \`IntersectionObserver\` on \`document.querySelectorAll('.reveal-on-scroll')\`, \`threshold:0.12\`, \`rootMargin:'0px 0px -8% 0px'\`, add class \`is-visible\` when intersecting. Respect \`prefers-reduced-motion\`: if true, add \`is-visible\` immediately to all reveals.
- Put class \`reveal-on-scroll\` on **every** meaningful #pageRoot block: each \`<section>\`, each card/article, stat row, quote, bento cell, and major flex children — **at least 12 elements** so scroll feels continuously animated, not static.

IMPORTANT — SCROLL MAPPING:
- Let pageP = scrollY / max(scrollHeight - innerHeight, 1) clamped to [0,1].
- Frame scrub: use getFrameScrubT() = min(pageP / 0.36, 1) to drive frame index (smooth lerp to (TOTAL_FRAMES-1)*getFrameScrubT()). Full range of frames plays in the FIRST ~36% of document scroll (roughly first 3–4 tall sections), NOT the whole page.
- **Never** fade #bgWrap out or raise #postFrameBackdrop to a full opaque layer — keep the extracted frame canvas visible for the full scroll (script keeps bgWrap opacity 1 and postFrameBackdrop opacity 0).
- After the scrub phase, hold the last frame; do not replace the canvas with a flat color.
- Do not replace the WebP sequence with a static image during the frame phase.
- Do not use wheel-delta-only frame logic.
- Do not output markdown.

TYPOGRAPHY / MOBILE:
- Load Google Fonts that fit the USER MESSAGE; avoid Inter, Roboto, Arial, Space Grotesk unless the user asked.
- For luxury/editorial builds, default toward **Cinzel** (wordmark), **Cormorant Garamond** (headings), **DM Sans** (UI/body) like the reference.
- If BUILD TARGET is mobile, tighten spacing for 9:16.

OUTPUT: Return ONLY the complete HTML starting with <!DOCTYPE html>. No markdown, no fences, no explanation.`;

    const imageParts = assets
      .map((a) => {
        const m = a.dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (!m) return null;
        return {
          inlineData: {
            mimeType: m[1],
            data: m[2],
          },
        };
      })
      .filter(Boolean);
    const assetGuide = assets.length
      ? allowProductAssetPlacement
        ? `Use the uploaded images you received as multimodal inputs. Map them by order to IDs:\n${assets
          .map((a, i) => `${i + 1}. ${a.id} (${a.name})`)
          .join('\n')}\nUse these assets where user asked.`
        : `Use uploaded images strictly as style references only (do not place exact files in HTML).`
      : '';

    const multimodalHint = imageParts.length > 0
      ? allowProductAssetPlacement
        ? `\n\nUser uploaded ${imageParts.length} image(s). Respect asset IDs and placeholders exactly as instructed.`
        : `\n\nUser uploaded ${imageParts.length} image reference(s). Use them for style guidance only; do not directly place exact image files in output HTML.`
      : '';
    const fullPrompt = `${systemPrompt}${assetGuide ? `\n\n${assetGuide}` : ''}${multimodalHint}`;

    let code = '';
    let lastError: any = null;
    const modelsToTry = getWebsiteGenerationModelCandidates(resolvedModelId);

    for (const model of modelsToTry) {
      try {
        console.log(`🚀 3D Builder: Trying model ${model}...`);
        code = await withTimeout(
          generateApiEasyText({
            prompt: fullPrompt,
            model,
            temperature: 0.7,
            maxTokens: 40000, // Reduced from 65k to avoid some TPM limits
          }),
          180_000,
          `generateApiEasyText(${model})`,
        );
        if (code) break;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('quota') || msg.includes('exhausted') || msg.includes('429')) {
          console.warn(`⚠ Quota exceeded for ${model}, retrying with next fallback...`);
          continue;
        }
        throw err; // Re-throw if it's not a quota issue
      }
    }

    if (!code) {
      throw lastError || new Error('Failed to generate website code with all available models');
    }
    code = code.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
      throw new Error('Generated code does not appear to be valid HTML');
    }

    if (!isLikelyValidFrameScrollHtml(code)) {
      console.warn('⚠ Generated code missed frame-scroll markers; using rich fallback template.');
      code = buildReliableFallbackHtml(promptForGeneration, frameCount);
    }

    code = injectDraftlyFrameViewportGuard(code);

    // Inject user-connected tracking scripts into the generated HTML.
    // GA4: inject only if user has connected their measurement ID.
    try {
      const db = getAdminDb();
      const intSnap = await db.collection('users').doc(userId).collection('integrations').get();
      const intDocs = Object.fromEntries(intSnap.docs.map(d => [d.id, d.data()]));

      if (intDocs.google_analytics?.status === 'connected' && intDocs.google_analytics?.ciphertext) {
        try {
          const gaSecrets = decryptSecretsJson(intDocs.google_analytics.ciphertext);
          if (gaSecrets.measurementId) code = injectGA4(code, gaSecrets.measurementId);
        } catch { /* skip GA4 injection on decrypt failure */ }
      }
    } catch {
      // Ignored
    }

    // Asset runtime is only needed for post-build product-placement iterations.
    if (allowProductAssetPlacement) {
      code = injectAssetResolverRuntime(code);
    }

    const billedCreditCost = billing.creditCost;
    // Only deduct credits here. fullApps is incremented when the client reaches step 5 (confirm-site-built)
    // so that the monthly "sites built" limit counts only completed sites, not failed attempts.
    const chatUnits = (() => {
      if (!isIteration) return 0;
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const planChatAllowance = Number((limits as { chats?: number }).chats ?? 0) || 0;
      return getChatUnitCost(resolvedModelId, planChatAllowance);
    })();
    await incrementBuilderUsage(
      userId,
      isIteration
        ? { chats: chatUnits, creditCost: billing.creditCost }
        : { creditCost: billing.creditCost },
    );
    console.log('✅ Website code generated, length:', code.length);
    return NextResponse.json({
      success: true,
      code,
      billing: {
        creditCost: billedCreditCost,
        estimatedUsd: Number(billing.estimatedUsd.toFixed(4)),
        inputTokens: billing.inputTokens,
        outputTokens: billing.outputTokens,
      },
    });
  } catch (error: any) {
    console.error('3D Builder site generation error:', error);
    const safeMessage =
      'Our AI backend had an issue while building your website. Please try again in a minute or switch to a different model.';
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
