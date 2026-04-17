/**
 * Predetermined help content for the Draftly guide chat (no live AI).
 */

export type GuideCategory = {
  id: string;
  label: string;
  icon: 'route' | 'sparkles' | 'bot' | 'lightbulb';
};

export type GuideEntry = {
  id: string;
  categoryId: string;
  question: string;
  /** Plain text; paragraphs separated by \n\n */
  answer: string;
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'walkthrough', label: 'Step-by-step walkthrough', icon: 'route' },
  { id: 'pipeline', label: 'Pipeline & preview', icon: 'route' },
  { id: 'prompts', label: 'Writing prompts', icon: 'sparkles' },
  { id: 'gpt', label: 'ChatGPT & Gemini', icon: 'bot' },
  { id: 'tips', label: 'Better results', icon: 'lightbulb' },
];

export const GUIDE_ENTRIES: GuideEntry[] = [
  {
    id: 'walk-01-site',
    categoryId: 'walkthrough',
    question: 'Step 1 — What do I type first?',
    answer:
      'Your **first message** is the **website brief**: who it’s for, brand or product name, tone, **nav** link labels, **hero** headline + supporting line, **primary CTA** text, and **3–6 sections** below the fold (what each should say).\n\nThis step controls **HTML structure, copy, and UI** — not the cinematic background. Keep it concrete; vague asks produce generic pages.',
  },
  {
    id: 'walk-02-bg',
    categoryId: 'walkthrough',
    question: 'Step 2 — Background prompt',
    answer:
      'Describe **only** the **scene** that will scrub behind the site: camera, lighting, environment, mood, depth. Say **16:9** and **cinematic**.\n\n**Do not** ask for logos, buttons, or marketing text in the background — that fights the frame pipeline and Step 1.',
  },
  {
    id: 'walk-03-image',
    categoryId: 'walkthrough',
    question: 'Step 3 — Image confirm & motion chips',
    answer:
      '**Confirm** the still when it matches your vision, or **Regenerate**. If you use **first→last frame** (eligible plans), set both frames before generating video.\n\n**Library chips** (Three.js, Spline, etc.): toggling **on** adds them to the prompt **and** sends a **graphics stack** flag to the site generator so the model must output **working CDN scripts** in the single HTML file. Turn chips **off** before the next build if you change your mind.',
  },
  {
    id: 'walk-04-video',
    categoryId: 'walkthrough',
    question: 'Step 4 — Video, FPS, and multiple clips',
    answer:
      'After the clip is ready, **confirm** or redo. **Add Video** chains another clip (plan limits apply).\n\n**Frames** scale with **clip length × extraction FPS** (slider, typically 10–40 FPS) **per clip**, then all clips are **concatenated** for scroll. Example: **3 × ~8s clips** at **40 FPS** → on the order of **hundreds to 1000+** frames. More frames = richer scrub but heavier preview — Draftly runs a **warmup overlay** after the site build so the browser can decode before fullscreen opens.',
  },
  {
    id: 'walk-05-build',
    categoryId: 'walkthrough',
    question: 'Step 5 — Build, preview warmup, fullscreen',
    answer:
      '**Continue** runs **frame extraction** → **site generation**. When the HTML is ready, the **workspace iframe** starts loading; you may see **“Preparing preview”** for roughly **10–50 seconds** (longer with more clips / frames). Then **fullscreen preview** opens automatically.\n\n**Full screen** stays disabled during warmup. If anything looks stuck, wait out the timer first, then try fullscreen or a hard refresh.',
  },
  {
    id: 'walk-06-after',
    categoryId: 'walkthrough',
    question: 'Step 6 — After the site is ready',
    answer:
      'Use **chat** for **one change at a time** (“change hero to …”, “add FAQ”). **ZIP export** depends on plan. **Business Suite** icons connect billing, auth, email, etc.\n\nRe-open this **Guide** anytime — topics under **Pipeline** and **Writing prompts** go deeper on each step.',
  },
  {
    id: 'what-is-pipeline',
    categoryId: 'pipeline',
    question: 'What is the 3D builder pipeline (steps)?',
    answer:
      'Draftly runs a **fixed order** so each layer has one job. Treat it like production: concept → environment → motion → site.\n\n**Step 1 — Website prompt** describes the **UI and copy**: brand name, nav labels, hero headline and subline, CTAs, typography vibe, and what sections you want below the scroll (features, proof, pricing, contact). This drives **structure, text, and layout** in the generated HTML.\n\n**Step 2 — Background prompt** describes **only the visual world** behind the UI: lighting, camera feel, setting, mood. **No** buttons, logos, or marketing copy here — that belongs in Step 1. This becomes the basis for **video and extracted frames**.\n\n**Confirm** each step so the next step doesn’t fight the previous one. After the **site build**, you can **iterate in chat** with small, concrete edits (exact copy, add/remove a section, tweak tone).',
  },
  {
    id: 'frames-preview',
    categoryId: 'pipeline',
    question: 'How do scroll frames work behind the site?',
    answer:
      'Your video is turned into a **sequence of WebP frames**. The generated page draws those frames on a **full-viewport canvas** (`#bgCanvas`) fixed behind transparent HTML. **Scroll position** maps to **which frame** is shown (early scroll = early frames; later scroll often holds the last frame).\n\n**What you should see:** the motion **through** the UI — text and cards sit in layers above the canvas. **If the background looks flat black**, the page may still be loading frames, or generated CSS painted an opaque layer over the canvas — Draftly injects guards in preview to keep the stack transparent; a **refresh** after build usually syncs.\n\n**ZIP export** includes the HTML plus a `frames-webp` folder so you can host the same behavior locally.',
  },
  {
    id: 'step1-good',
    categoryId: 'prompts',
    question: 'What should I put in Step 1 (website prompt)?',
    answer:
      'Think like a **creative brief**, not a spec dump. The model turns this into **real nav, hero, and sections** — vagueness becomes generic output.\n\n**Include:**\n• **Brand / product name** and one-line positioning.\n• **Nav**: exact or approximate link labels (e.g. Vision, Capabilities, Insights, Contact).\n• **Hero**: target headline (or theme + max length), subline, primary + secondary CTA labels.\n• **Visual tone**: dark/light, accent color, serif vs sans, “editorial”, “fintech”, “luxury”, etc.\n• **Below the fold**: name **3–6 sections** and what each should communicate — not just “Features” but *what* features matter for **your** audience.\n\n**Avoid:** pasting your whole product requirements as the hero line, or contradicting yourself (“minimal” + ten different styles). **Short, structured beats long and fuzzy.**',
  },
  {
    id: 'step2-good',
    categoryId: 'prompts',
    question: 'What should I put in Step 2 (background prompt)?',
    answer:
      'Describe **only the scene** that will scrub behind your UI — the **camera**, **environment**, **lighting**, and **mood**.\n\n**Useful knobs:** wide vs tight framing, slow dolly vs static, interior vs exterior, time of day, color temperature, fog, reflections, depth cues. Say **16:9**, **high detail**, and that it should feel **cinematic and scroll-friendly** (strong depth, readable motion).\n\n**Do not** ask for text, logos, UI chrome, or brand marks in the background — that conflicts with Step 1 and can confuse the frame pipeline. If you need **product** in the shot, describe it as **environment / subject** without asking for readable words on screen.',
  },
  {
    id: 'gpt-template',
    categoryId: 'gpt',
    question: 'What should I paste into ChatGPT or Gemini?',
    answer:
      'Give the external model a **role**, **constraints**, and **one pasteable block** per step so you’re not editing chaos.\n\n**Step 1 — website prompt template (adapt the brackets):**\n“You are a senior landing page copywriter. Output **one** paragraph I can paste into Draftly Step 1. Business: […]. Audience: […]. Tone: [premium / direct / playful]. Include: brand name, **four** nav items, hero headline (max 12 words), subline, primary CTA, secondary CTA, and **three** section titles with one sentence each describing what that section proves. No markdown headings; plain sentences only.”\n\n**Step 2 — background template:**\n“You are a cinematographer. Output **one** paragraph describing a **16:9** cinematic background for a scroll-driven site. Mood: […]. Setting: […]. Lighting: […]. Emphasize depth and motion-friendly composition. **No text, logos, or UI.**”\n\nThen **edit** the result to match your taste before sending in Draftly.',
  },
  {
    id: 'gemini-vs-gpt',
    categoryId: 'gpt',
    question: 'Gemini vs ChatGPT for prompts — any difference?',
    answer:
      'Either model works if you **constrain the format**. Tips that help both:\n\n• Ask for **one block of prose** per step (easier to paste than scattered bullets).\n• Ask for **no markdown** if you want fewer formatting artifacts.\n• If output feels generic, add: “Use **concrete nouns** from [industry]. Avoid clichés like ‘innovative solutions’ or ‘cutting-edge.’ Name **real section topics** for this business.”\n• For backgrounds, always add: “**Do not** describe text, logos, or interface elements.”\n\nDraftly’s **homepage templates** are also valid seeds — use **Use This** to pre-fill both prompts, then refine.',
  },
  {
    id: 'bad-output',
    categoryId: 'tips',
    question: 'Why was my site generic or wrong?',
    answer:
      '**Common causes:**\n\n• **Vague Step 1** — “make a premium site” gives nothing to anchor nav, hero, or sections.\n• **UI language in Step 2** — background models may ignore or blend UI requests awkwardly with the frame pipeline.\n• **Internal contradictions** — e.g. “ultra minimal” plus five different visual directions in one sentence.\n• **No iteration** — the first pass is a **draft**. Follow up in chat: “Change hero to …”, “Rename second nav link to …”, “Remove pricing and add FAQ.”\n\n**Strong prompts** name the **category**, **audience**, and **proof** (metrics, logos, outcomes). Use this guide’s examples as a **pattern**, not a single magic phrase.',
  },
  {
    id: 'iterate',
    categoryId: 'tips',
    question: 'How do I improve the site after the first build?',
    answer:
      'After HTML exists in the builder, treat chat like **tickets** — one change per message works best.\n\n**Good requests:** exact headline text, swap two sections, “make nav sticky and smaller”, “add three pricing tiers named … with prices …”, “tone more formal in the hero only”.\n\n**Weaker requests:** “make it better” or “redesign everything” — the model has to guess. **Reference structure** when you can: “second section”, “footer”, “hero subline”.\n\nIf your plan supports **assets**, upload images and say **where** they go (hero, card 2, etc.). Small iterations compound into a polished page faster than one giant prompt.',
  },
  {
    id: 'credits-brief',
    categoryId: 'pipeline',
    question: 'Where do credits show up?',
    answer:
      'Credits reflect your **subscription** and **metered usage** in the builder (image generation, video, site generation, etc.). While signed in, check the **3D Builder** dashboard for **remaining balance** and activity. **Plans and limits** are documented on the **Pricing** page.\n\nIf numbers look wrong after a payment or upgrade, contact support with the **email on the account** and approximate time of the run.',
  },
  {
    id: 'preview-troubleshoot',
    categoryId: 'pipeline',
    question: 'The live preview looks wrong — what can I try?',
    answer:
      '**Quick checks:**\n\n• After a **full build**, expect **“Preparing preview”** on the workspace for **10–50s** while **many scroll frames** decode — wait before judging motion.\n• **Fullscreen** is delayed until warmup ends; don’t click it until the overlay clears.\n• **Open fullscreen** and **close** it — that re-mounts the preview surface.\n• **Hard refresh** the app (Ctrl+Shift+R) if the dev server was mid-compile.\n\n**Expected behavior:** scroll-driven sites show **motion in the background** with **type and sections on top**. If you only see flat black after warmup, the generated CSS may have painted over `#bgCanvas` — ask in chat to **keep backgrounds transparent over the canvas**.\n\n**ZIP download** is the ground truth for local testing.',
  },
];
