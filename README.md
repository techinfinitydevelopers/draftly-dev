# Draftly — 3D Website Builder

**Live site:** [draftly.space](https://draftly.space)

Draftly is an **AI 3D website builder**: describe your brand once, and the product generates a **cinematic background** (image → motion video), **extracts scroll frames**, and writes **production HTML** you can ship or host. Teams use it to build **scroll-driven, frame-scrubbed sites roughly 10× faster** than hand-coding the same motion pipeline.

Core flow: **prompt → hero visual → video → frame strip → generated site + ZIP export** (paid plans).

---

## Table of Contents

1. [What Draftly Does](#what-draftly-does)
2. [Tech Stack](#tech-stack)
3. [Pricing & Credit System](#pricing--credit-system)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Getting Started](#getting-started)
7. [Deployment (Vercel)](#deployment-vercel)

---

## What Draftly Does

### 3D Website Builder (`/3d-builder`)

- **Single-prompt websites** — Combined site copy + visual direction; AI returns full HTML with scroll-linked canvas frames.
- **Cinematic backgrounds** — Nano Banana Pro (API-Easy) stills, Veo-class video, WebP frame extraction at configurable FPS.
- **First / last frame video** — Optional clip generation from two keyframes for controlled motion.
- **ZIP export** — Download `index.html`, assets, and frames for self-hosting.

### Homepage & Marketing

- Full-screen hero and sections focused on the **3D builder** value proposition (not a node editor).
- Pricing, contact, docs, and Firebase auth.

### Additional Pages

- `/pricing` — Subscriptions and credits.
- `/3d-builder` — Main product workspace.
- `/changelog` — Updates.

> **Note:** `/studio` permanently redirects to `/3d-builder`. Older marketing or GitHub copy referring to a “node-based studio” is outdated.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Auth & DB | Firebase |
| 3D Builder media | API-Easy (Gemini-class image + Veo-class video), client-side frame extraction |
| Payments | Dodo Payments |

---

## Pricing & Credit System

Monthly plans include builder credits for image/video/site generation. See `/pricing` on the live site.

---

## Project Structure

Typical App Router layout: `app/` routes, `components/`, `lib/` for APIs and prompts, `app/api/3d-builder/*` for generation endpoints.

---

## Environment Variables

See `.env.example` for `NEXT_PUBLIC_*` Firebase keys, `GEMINI_API_KEY` / API-Easy keys, and payment secrets.

Recommended for SEO:

```bash
NEXT_PUBLIC_SITE_URL=https://draftly.space
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

Connect the repo, set environment variables to match `.env.example`, and deploy. Set `NEXT_PUBLIC_SITE_URL` to your canonical domain for correct Open Graph URLs.

---

*Legacy sections below may still mention older experiments; treat the sections above as the source of truth for the current product.*
