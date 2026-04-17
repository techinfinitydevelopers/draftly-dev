# Changes in the Last 10 Hours (Before Email/Subscription Issues)

*Reconstructed from git history. I don't have access to prior chat prompts—this is derived from commits.*

---

## Commits (Last 10 Hours)

| Commit | Time | Description |
|--------|------|-------------|
| **bd35d31** | ~8h ago | Add getProjectSiteCodeForPreview, messages to Firebase 3D projects (fix build) |
| **dbf8f01** | ~8h ago | Add IntegrationLogos and logger modules (fix Vercel build) |
| **df6c551** | ~8h ago | 3D Builder: premium UI prompts, remove Build Full App from preview, fresh start on new chat |

---

## 1. Firebase 3D Projects (bd35d31)

### File: `lib/firebase-3d-projects.ts`

**Changes:**
- **`messages` field** — Added to `Firebase3DProjectMeta` for chat continuity
  - Type: `Array<{ role, text, imageUrl?, videoSrc?, videoFallbackSrc?, ts }>`
- **`saveProjectToFirebase`** — Now accepts and stores `payload.messages`
- **`loadProjectFromFirebase`** — Returns `messages` array (default `[]` if missing)
- **`getProjectSiteCodeForPreview`** — New function to fetch only site HTML for profile preview (no full project load)
- **`createdAt` preservation** — When merging updates, keeps original `createdAt` instead of overwriting
- **Logging** — Added `[firebase-3d-projects]` console logs for save, load, list

---

## 2. Vercel Build Fix (dbf8f01)

### Files: `lib/logger.ts`, IntegrationLogos module

**Changes:**
- **Logger** — Centralized logger that only outputs in `NODE_ENV === 'development'`
  - In production, all `logger.log`, `logger.warn`, `logger.error` etc. are suppressed
- **IntegrationLogos** — New module (fixes Vercel build)

---

## 3. 3D Builder Overhaul (df6c551)

### Files: `app/3d-builder/page.tsx`, `app/api/3d-builder/generate-site/route.ts`

### A. UX Changes
- **No auto-restore of last project** — Opening `/3d-builder` without `?projectId=` now starts fresh
  - Users must use project list or URL with `?projectId=xxx` to continue a project
- **Removed "Build Full Application" button** from preview overlay (was overlapping the website)

### B. Premium UI Prompts (generate-site/route.ts)

#### 1. **Update existing site** (iteration)
```
You are an expert web developer and premium brand designer. Update the EXISTING website code based on the user's request. AVOID generic AI slop—write copy specific to the user's prompt. Use distinctive typography, scroll-triggered animations, staggered reveals, and premium glassmorphism. Never use generic phrases like "Discover", "Learn more", "Get started", "Transform", "Unlock", "Streamline", "Scale", "Empower", "Cutting-edge", "Seamless", "Revolutionary", "World-class", "Best-in-class", "Leverage", "Synergy", "Holistic", "Robust".
```

#### 2. **Video-hero mode** (fullscreen video)
```
You are an expert web developer and premium brand designer. Create a premium website that uses a FULLSCREEN VIDEO HERO (not frame sequence). Avoid generic AI slop—write copy specific to the user's prompt.

DESIGN & COPY REQUIREMENTS:
- NEVER use generic phrases: "Welcome", "Discover", "Learn more", "Get started", "Transform", "Unlock", "Streamline", "Scale", "Empower", "Cutting-edge", "Seamless", "Next-level", "Revolutionary", "World-class", "Best-in-class", "Leverage", "Synergy", "Holistic", "Robust".
- Write copy SPECIFIC to the user's industry, niche, and tone. Match their vocabulary.
- Typography: Use distinctive fonts (Clash Display, Syne, Satoshi, General Sans)—NOT Inter, Roboto, Arial.
- Add scroll-triggered fade-in animations with staggered delays per section.
- Glassmorphism: backdrop-filter blur(20px), rgba(0,0,0,0.4), border rgba(255,255,255,0.12).
- Buttons: hover scale(1.02), subtle transitions. One bold accent color for CTAs.
```

#### 3. **Frame-scroll mode** (first frame → last frame)
```
You are an expert web developer and premium brand designer. Create a PREMIUM scroll-driven 3D animated website that feels handcrafted and distinctive—NOT generic AI slop.

DESIGN & COPY REQUIREMENTS (CRITICAL — avoid generic AI output):
- NEVER use generic phrases like "Welcome to our website", "Discover more", "Learn more", "Get started", "Transform your business", "Unlock potential", "Streamline workflows", "Scale effortlessly", "Empower your team", "Cutting-edge solutions", "Innovative approach", "Seamless experience", "Next-level", "Game-changing", "Revolutionary", "World-class", "Best-in-class", "Industry-leading", "State-of-the-art", "Leverage", "Synergy", "Holistic", "Robust", "Scalable", "Dynamic".
- Write copy that is SPECIFIC to the user's prompt: use their industry, niche, and tone.
- Typography: Clash Display or Syne for headlines, Satoshi or General Sans for body—NOT Inter, Roboto, Arial, or Space Grotesk.
- Add premium micro-interactions: scroll-triggered fade-in animations (opacity 0→1, translateY 24px→0) with staggered delays (100ms, 200ms, 300ms).
- Glassmorphism: backdrop-filter: blur(20px), background: rgba(0,0,0,0.4), border: 1px solid rgba(255,255,255,0.12).
- Section headings: letter-spacing: -0.02em, line-height: 1.2, font-weight: 700.
- Buttons: hover scale(1.02), transition 0.2s ease.
- Gradient overlays for hero readability.
- Color: rgba(255,255,255,0.95) for text, one bold accent (amber, emerald, cyan) for CTAs.
- Each section unique, on-brand. No generic "Features" / "Our Services" / "About Us".

The website uses a WebP image sequence as its background. The frame index MUST be mapped to page scroll progress:
- At top of page: first frame
- At bottom of page: last frame
- Scrolling up: frames reverse
```

#### 4. **UI overlay requirements** (shared)
```
- Use Google Fonts: Syne or Outfit for headlines, DM Sans or Plus Jakarta Sans for body. NEVER use Inter, Roboto, Arial, or Space Grotesk (too generic).
- UI sections fade in/out based on window.__currentFrame value
- Use glassmorphism: background rgba(0,0,0,0.45), backdrop-filter blur(20px), border 1px solid rgba(255,255,255,0.14)
- Page scroll controls frame advancement from first to last frame across full page
```

---

## 4. First Frame / Last Frame Generation (3D Builder)

### In `app/3d-builder/page.tsx`:
- **Video prompt (first+last frame mode):**  
  `"Smoothly transition between the first and last frame with cinematic camera movement and depth."`
- **System messages:**  
  - `"[ 02 ] Generating last frame image..."`
  - `"Generating video from first & last frames using VEO 3.1 FL model..."`
  - `"Add video N: Upload first frame (use last frame from previous video) and a new last frame to create a continuation."`
- **Button label:** `"Generate last frame with AI"`

### In `app/api/3d-builder/generate-video/route.ts`:
- **Video prompt (first/last frame):**  
  `"Smoothly transition from the first frame to the last frame with cinematic 3D camera movement, parallax depth, and subtle effects. Duration: 8 seconds. Aspect ratio: ${requestedAspect}. Keep motion smooth for a scroll-driven website background."`

### In `app/api/3d-builder/generate-site/route.ts`:
- **Scroll mapping:**  
  - `page top => frame 1` (first frame)  
  - `page bottom => last frame`  
  - `scrolling up rewinds frames`

---

## 5. GitHub Integration

*No direct GitHub integration changes were found in the last 10 hours of commits.*  
The repo uses standard git; deployment is via Vercel. If you meant something else (e.g. GitHub Actions, OAuth), that would be in a different part of the codebase.

---

## Summary Table

| Area | What Changed |
|------|--------------|
| **Firebase 3D** | `messages` for chat continuity, `getProjectSiteCodeForPreview`, preserve `createdAt` |
| **Logger** | Suppress all logs in production |
| **3D Builder UX** | No auto-restore, no Build Full App in preview |
| **3D Builder prompts** | Premium UI, anti–generic-AI copy, Syne/Outfit fonts, glassmorphism |
| **First/last frame** | Scroll maps first frame ↔ last frame; video prompt for cinematic transition |
| **Profile** | Uses `getProjectSiteCodeForPreview` for project card previews |
