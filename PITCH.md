# Draftly — Visual AI Studio for Creators

**Website:** [draftly.space](https://www.draftly.space)
**Category:** AI-native Creative Tools / Developer Infrastructure
**Stage:** Live product, revenue-generating, seeking seed funding

---

## One-Liner

Draftly is a node-based visual AI studio where creators build image and video generation workflows by connecting AI models on a drag-and-drop canvas — replacing the chatbot prompt box with a programmable, visual pipeline.

---

## The Problem

The AI image and video generation market is exploding, but the user experience is stuck in 2022:

1. **Chatbot interfaces are a bottleneck.** Midjourney, DALL-E, and Runway all use single-prompt, single-output chat boxes. If a photographer wants 50 product shots with different backgrounds, angles, and styles — they type 50 separate prompts, one by one, manually downloading each result. This is tedious, slow, and doesn't scale.

2. **Model lock-in.** Every tool locks you into one model. Midjourney uses Midjourney. DALL-E uses DALL-E. There's no way to compare outputs across models, mix providers, or switch without switching platforms entirely. Creators are forced to maintain subscriptions to 3-4 different tools.

3. **No workflow automation.** The real-world creative pipeline is: upload a product photo → generate variations → upscale the best ones → remove backgrounds → create a video from the top pick → export everything. Today, this requires 4-5 separate tools, manual file transfers between them, and no way to save or repeat the pipeline.

4. **Enterprise pricing doesn't scale.** A brand producing 10,000 images/month pays per-generation across multiple platforms with no volume economics, no batching, and no pipeline orchestration.

---

## The Solution

Draftly replaces the chatbot prompt box with a **visual node canvas** — think Figma meets ComfyUI, but cloud-native and accessible to non-technical creators.

### How it works:

1. **Drag nodes onto a canvas** — Upload, Text Prompt, Image Gen, Video Gen, Upscale, Remove BG, Preview
2. **Connect them with edges** — Data flows from node to node. A photo upload connects to a text prompt, which connects to an image generation node, which connects to a video node.
3. **Pick your models** — Each generation node lets you choose which AI model to use. Gemini, Flux, Veo, Kling, Luma, SDXL, and 12+ others — all in one place.
4. **Hit Generate** — The entire pipeline executes. 50 images, 10 videos, all upscaled and background-removed, in one click.
5. **Save and revisit** — Workflows persist. Come back days later, load your project, tweak a prompt, regenerate.

### What makes this different:

| Feature | Chatbot Tools (Midjourney, DALL-E) | Draftly |
|---------|-----------------------------------|---------|
| Interface | Text chat box | Visual node canvas |
| Batch generation | 1 at a time | 50+ simultaneously |
| Models available | 1 per platform | 18+ across providers |
| Image → Video pipeline | Not possible | Built-in, automated |
| Background removal | Separate tool | Built-in node |
| Upscaling | Separate tool | Built-in node |
| Workflow saving | Copy-paste prompts | Full project persistence |
| Self-hosted option | No | Yes — unlimited, free |

---

## Product Deep Dive

### The Studio

The core product is a **node-based visual canvas** built on React Flow. Users construct AI workflows by connecting nodes:

**Input Nodes:**
- **Text Prompt** — Natural language descriptions with style presets (Cinematic, Product, Editorial, etc.). Includes an "Enhance with AI" button that uses Gemini to upgrade prompts automatically. A "Lock to Image" toggle keeps the product/subject fixed while varying backgrounds and angles — critical for e-commerce and product photography.
- **Image Upload** — Drag-and-drop or click to upload reference images. Supports direct image URLs.

**Generation Nodes:**
- **Image Generation** — Choose from 12+ models. Configure aspect ratio (16:9, 4:3, 1:1, 9:16, 3:4, or Auto — which detects the uploaded image's ratio), resolution (1K standard, 4K premium), guidance scale, and number of outputs.
- **Image Variation** — Feed an existing image and get creative variations with configurable strength. Changes angles, lighting, backgrounds while preserving the subject.
- **Video Generation** — Text-to-video or image-to-video. Choose from 8 models including Google Veo 3.0, Kling 1.6, WAN, Luma Dream Machine. Configure duration (2-10 seconds), aspect ratio, resolution.

**Processing Nodes:**
- **Upscale** — 2x or 4x resolution enhancement powered by Gemini. Takes a 1K image to 4K quality.
- **Remove Background** — Clean background extraction for product shots, powered by Gemini.

**Output Nodes:**
- **Preview** — View and download final outputs. All generated media appears in a Gallery panel for bulk download.

### Agentic Architecture

The node system is **agentic** — nodes are aware of their upstream connections. When you connect a Text Prompt → Image Gen → Video Gen chain, the video node automatically receives the prompt and the generated image. Chain 100 nodes together and data propagates through the entire graph recursively.

This means users can build complex, multi-step pipelines:
- Upload product photo → Lock prompt to image → Generate 10 angle variations → Upscale best 3 → Remove backgrounds → Generate product videos → Export all

The entire chain executes with one click.

### Templates

7 pre-built workflow templates so users can start generating immediately:
1. **Quick Image** — 1 prompt → 1 image (fastest start)
2. **Quick Image 5** — 1 upload + 5 prompts → 5 images (product photography)
3. **Variation Explorer** — Image → 5 variations (A/B testing)
4. **Image to Video** — Image → Video generation
5. **Full Pipeline** — Upload → Generate → Upscale → Remove BG → Video
6. **Batch Production** — 10 prompts → 10 images (content at scale)
7. **Style Transfer** — Image → Multiple style variations

### Self-Hosted / Local Mode

Users can run the entire studio on their own PC for **free, unlimited generations**:
- Bundled Python FastAPI server with Stable Diffusion 1.5 and AnimateDiff
- Supports SDXL, Flux.1 Dev, CogVideoX, Hunyuan Video, Open-Sora, Wan 2.1
- Studio auto-detects the local server and routes generations locally
- Zero API cost, zero rate limits, complete privacy

This serves two purposes:
1. **Top-of-funnel acquisition** — Users try the tool locally for free, hit GPU/quality limitations, convert to cloud plans.
2. **Enterprise value prop** — Companies with GPU clusters can run everything on-premises while still using Draftly's workflow engine.

---

## AI Models (18+ Integrated)

### Image Models (12)

| Model | Provider | Why It's Included |
|-------|----------|-------------------|
| **Nano Banana Pro** (Gemini 3 Pro) | Google | Best quality-to-cost ratio. Primary model. |
| Flux Schnell | Black Forest Labs | Fastest generation. Sub-2-second. |
| Flux Dev | Black Forest Labs | Higher quality Flux variant. |
| Flux Pro 1.1 | Black Forest Labs | Best Flux quality, HD output. |
| Stable Cascade | Stability AI | Unique architecture, different aesthetics. |
| Fooocus | Community (fal.ai) | Creative/artistic style. |
| SDXL Turbo | Stability AI | Ultra-fast, good for drafts. |
| Playground v2.5 | Playground AI | Community favorite, versatile. |
| Juggernaut XL | RunDiffusion | Photorealistic specialty. |
| RealVisXL v4 | SG161222 | Photorealistic portraits. |
| DreamShaper XL | Lykon | Versatile creative model. |
| Local SD 1.5 | Open source | Free local generation. |

### Video Models (8)

| Model | Provider | Why It's Included |
|-------|----------|-------------------|
| **Veo 3.0 Fast** | Google DeepMind | Best quality fast video. Primary model. |
| Veo 3.0 | Google DeepMind | Highest quality video, 8 seconds. |
| Kling 1.6 / 1.6 Pro | Kuaishou | Strong on motion and human subjects. |
| WAN Video | Alibaba | Good at landscapes and abstract motion. |
| Luma Dream Machine | Luma AI | Cinematic look, dreamlike quality. |
| Minimax Video | Minimax | Fast, consistent style. |
| Hunyuan Video | Tencent | Strong on Asian aesthetics and scenes. |
| Local AnimateDiff | Open source | Free local video generation. |

### Multi-Model Router

The backend includes a **model router** (`lib/model-router.ts`) that:
- Maps model IDs to provider APIs (Gemini, fal.ai, Replicate, local)
- Enforces plan-based access (free users → Nano Banana Pro only, Pro users → all standard models)
- Calculates credit costs per generation
- Clamps resolutions based on plan tier
- Falls back gracefully if a model is unavailable

---

## Business Model

### Credit-Based SaaS Pricing

| Plan | Price | Credits/Month | Approx. Images | Approx. Videos | Models |
|------|-------|---------------|-----------------|----------------|--------|
| **Free** | $0 | 10 | 2 | 0 | 1 (Nano Banana Pro) |
| **Basic** | $25/mo | 1,500 | ~300 | ~20 | 2 (+ Veo 3.0 Fast) |
| **Pro** | $60/mo | 3,600 | ~750 | ~45 | All standard (13) |
| **Premium** | $200/mo | 12,000 | ~2,400 | ~120 | All models (18+) |

Annual plans available at 20% discount.

### Unit Economics (50% Target Margin)

| Model | Real API Cost | Credits Charged | Effective Sell Price | Margin |
|-------|---------------|-----------------|---------------------|--------|
| Nano Banana Pro (image) | ~$0.045 | 5 credits | ~$0.083 | 46% |
| Flux Schnell (image) | ~$0.01 | 3 credits | ~$0.05 | 80% |
| Veo 3.0 Fast (8s video) | ~$0.50 | 64 credits | ~$1.07 | 53% |

**Key insight:** Different models have different margins. The credit system provides pricing flexibility — users see a simple credit number, while the backend ensures every generation is profitable regardless of model choice.

**Margin boosters:**
- Default model selection biases toward Nano Banana Pro (highest margin image model)
- Users must actively switch to more expensive models
- 4K resolution costs 2x credits (premium upsell)
- Self-hosted mode has zero COGS (user pays their own compute)

### Payment Infrastructure

Subscription billing through **Dodo Payments**:
- Hosted checkout (no PCI compliance needed)
- Webhook-driven subscription lifecycle management
- Instant plan activation via Firebase Admin SDK
- Handles renewals, cancellations, plan changes, and failed payments automatically

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript | SSR + SPA hybrid, fast page loads, API routes in one codebase |
| **Styling** | Tailwind CSS, Framer Motion | Rapid UI iteration, smooth animations |
| **Canvas** | React Flow (@xyflow/react) | Best-in-class node graph library, handles 100+ nodes smoothly |
| **State** | Zustand | Lightweight, performant, works great with React Flow |
| **3D/Visual** | Three.js, @react-three/fiber | Interactive 3D elements on marketing pages |
| **Auth & DB** | Firebase (Auth, Firestore, Storage) | Google sign-in, real-time DB, CDN-backed file storage |
| **Admin** | Firebase Admin SDK | Server-side subscription management, credit deduction |
| **Payments** | Dodo Payments SDK + webhooks | Global payments, subscription management |
| **AI APIs** | Google Gemini, fal.ai, Replicate | Multi-provider model access |
| **Local AI** | Python FastAPI, Stable Diffusion, AnimateDiff | Self-hosted inference server |
| **Hosting** | Vercel | Edge network, serverless functions, zero-config deploys |

### How a Generation Request Flows

```
User clicks "Generate" on an ImageGenNode
    ↓
Client reads upstream data (prompt, style, image) from Zustand store
    ↓
POST /api/studio/generate-image { model, prompt, aspectRatio, resolution, userId }
    ↓
enforceStudioLimits() → Checks plan, credits, rate limits via Firebase
    ↓
resolveImageModel() → Maps model ID to provider, enforces plan tier
    ↓
Route to provider:
  • Gemini → generateGeminiImage() → returns base64
  • fal.ai → runFalModel() → returns URL
  • Local → POST to localhost:8000 → returns base64
    ↓
incrementStudioUsage() → Deducts credits atomically in Firestore
    ↓
Response → Client updates node data → Image appears in node → Gallery updates
```

### Video Generation (Async Pipeline)

```
POST /api/studio/generate-video → startVeoVideoGeneration()
    ↓
Returns operationName (job ID) → Client starts polling
    ↓
GET /api/studio/poll-status?jobId=xxx&provider=gemini
    ↓
pollVeoOperation() → Checks Google's long-running operation status
    ↓
When done: downloadVeoVideo() → Upload to Firebase Storage → Return public URL
    ↓
Client receives outputUrl → Video plays in node → Available in Gallery
```

### Data Persistence

- **Workflows** saved to Firestore (`users/{uid}/studioWorkflows/{workflowId}`)
- **Auto-save** every 30 seconds while working
- **Save on close** via `navigator.sendBeacon()` — no data loss on tab close
- **Auto-load** — Opening the studio loads the most recent project automatically
- **Generated media** — Images stored as base64 in node data, videos uploaded to Firebase Storage

### Security

- All API keys stored in `.env.local` (gitignored, never in client bundle)
- Firebase Admin SDK for server-side subscription management
- Dodo webhook signatures verified via HMAC-SHA256
- Production source maps disabled
- Console output suppressed in production (ConsoleGuard component)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

---

## Market Opportunity

### The AI Image Generation Market

- **$1.2B in 2024**, projected to reach **$10B+ by 2028** (30% CAGR)
- Midjourney alone reportedly generates **$200M+ ARR** with ~16M users
- Runway ML raised **$240M** at a $4B valuation for AI video
- The market is massive, growing fast, and still dominated by single-model chatbot UIs

### Why Now

1. **Model commoditization.** There are now 50+ competitive image models and 10+ competitive video models. No single model wins at everything. Creators need a way to access and compare multiple models — not be locked into one.

2. **API cost collapse.** Google Gemini 3 Pro generates images at ~$0.045/image. Flux Schnell at ~$0.01/image. A year ago, these would have cost 10x more. Credits-based aggregation is now economically viable at scale.

3. **Workflow complexity is growing.** Creators don't just want one image — they want a pipeline. Upload → Variations → Upscale → Remove BG → Video → Export. This pipeline doesn't exist in any single tool today.

4. **Self-hosted AI is mainstream.** ComfyUI has 500K+ downloads. Stable Diffusion has 100M+ generations. There's a massive community that runs models locally — but no clean, visual tool that works both locally AND in the cloud.

### Target Users

**Primary: Professional Creators (Photographers, Designers, Social Media Managers)**
- Pain: Spending 2-3 hours manually generating, editing, and exporting across multiple tools
- Value: 10x faster workflow with batch generation and pipeline automation
- Willingness to pay: $25-60/month (comparable to Adobe Creative Cloud add-ons)

**Secondary: E-Commerce Brands & Agencies**
- Pain: Need 100s of product images with different backgrounds, angles, and styles
- Value: "Lock to Image" feature preserves the product while varying everything else
- Willingness to pay: $200/month (Premium plan)

**Tertiary: AI Hobbyists & Open-Source Community**
- Pain: ComfyUI is powerful but complex and desktop-only
- Value: Cloud-native, no setup, beautiful UI — or self-hosted for free
- Acquisition: Free tier + self-hosted mode as top-of-funnel

### Competitive Landscape

| Company | What They Do | Draftly's Edge |
|---------|-------------|----------------|
| **Midjourney** ($200M+ ARR) | Single-model chat interface | Multi-model visual canvas, batch generation, pipelines |
| **DALL-E / ChatGPT** | OpenAI's image gen via chat | Same as above + self-hosted, no lock-in |
| **Runway ML** ($4B val.) | AI video, single model | 8 video models, visual workflows, cheaper |
| **ComfyUI** (open source) | Node-based, desktop only | Cloud-native, no setup, payment/user system, mobile-friendly |
| **Canva AI** | Design tool with AI features | AI-first, deeper model access, programmable workflows |
| **Leonardo.ai** | Image gen platform | Multi-model, visual workflows, video pipeline |

**Draftly occupies a unique position:** The visual workflow of ComfyUI, the cloud convenience of Midjourney, the multi-model access of an aggregator, and the self-hosted option of open source.

---

## Go-to-Market Strategy

### Phase 1: Creator Community (Now)

- **Product-led growth** via free tier (2 free images) and self-hosted mode
- Instagram, Twitter/X, and YouTube demonstrations of the visual workflow
- SEO targeting "AI image generator workflow", "batch AI images", "multi-model AI studio"
- The self-hosted angle is a strong hook for the open-source/AI community

### Phase 2: Creator Economy Integrations (Q2 2026)

- Shopify plugin: Generate product images directly from product listings
- Social media scheduling: Generate → Schedule → Post pipeline
- API access for developers building on top of Draftly

### Phase 3: Enterprise & Agencies (Q3 2026)

- Team workspaces with shared workflows and templates
- Custom model fine-tuning (bring your own LoRA/model)
- White-label option for agencies
- On-premise deployment for enterprise security requirements
- Volume pricing with SLA guarantees

---

## Traction & Metrics

- **Live product** at [draftly.space](https://www.draftly.space) — fully functional, revenue-ready
- **18+ AI models** integrated across 3 providers + local inference
- **8 node types** enabling infinite workflow combinations
- **7 pre-built templates** for immediate time-to-value
- **4 pricing tiers** with automated billing via Dodo Payments
- **Full persistence layer** — projects save automatically, accessible across sessions
- **Mobile-optimized** — responsive design with dedicated mobile homepage experience
- **Production-hardened** — security headers, console suppression, webhook verification, atomic credit deduction

---

## The Ask

Seeking **seed funding** to:

1. **Scale infrastructure** — Move to dedicated GPU clusters for lower latency and higher margins
2. **Expand model library** — Integrate 30+ models including emerging ones (Sora, Ideogram, Recraft)
3. **Build team features** — Shared workspaces, collaboration, team billing
4. **Invest in growth** — Creator partnerships, content marketing, community building
5. **Develop API product** — Let developers build on Draftly's multi-model routing and workflow engine

---

## Team

*(Add your team information here)*

---

## Key Links

- **Live Product:** [https://www.draftly.space](https://www.draftly.space)
- **Studio:** [https://www.draftly.space/studio](https://www.draftly.space/studio)
- **GitHub:** [https://github.com/piyushxt43/draftly-yc](https://github.com/piyushxt43/draftly-yc)

---

## Appendix: Technical Differentiators

### Why a Node Canvas (Not a Chat Box)

1. **Composability.** Nodes can be connected in any order. Text → Image → Upscale → Video. Or Image → Remove BG → Variation → Upscale. The user designs the pipeline, not us.

2. **Parallelism.** A single workflow can generate 50 images simultaneously. A chat box generates one at a time.

3. **Reproducibility.** Save a workflow, share it, reload it months later. Change one prompt, regenerate everything. This is impossible with chat history.

4. **Multi-model A/B testing.** Connect one prompt to three different image models side by side. Compare Gemini vs. Flux vs. SDXL in real time.

5. **Progressive refinement.** Feed the output of one model into another. Generate with Flux, upscale with Gemini, remove background, create video with Veo — all in one connected flow.

### Why Multi-Model Matters

No single AI model is best at everything:
- **Gemini (Nano Banana Pro):** Best general quality, best at following complex prompts
- **Flux Schnell:** Fastest generation (<2s), good for rapid iteration
- **SDXL variants:** Best for specific aesthetics (photorealism, dreamscapes, portraits)
- **Veo 3.0:** Best video quality from text
- **Kling 1.6:** Best at human motion and action scenes

By aggregating 18+ models, Draftly ensures creators always have the right tool for the job — without maintaining separate subscriptions or switching platforms.

### Why Self-Hosted Is a Moat

Offering a self-hosted option seems counterintuitive ("why would you give it away for free?"), but it's strategically powerful:

1. **Massive TAM expansion.** The self-hosted AI community (ComfyUI, Automatic1111) has millions of users who would never pay for a cloud tool. Draftly captures them with a better UI and converts a percentage to paid plans.

2. **Network effect.** Self-hosted users create and share workflows. These workflows become templates that drive adoption.

3. **Enterprise selling point.** Companies with GPU infrastructure want to run on-premises. Self-hosted mode proves Draftly works without cloud dependency.

4. **Conversion funnel.** Local models hit quality and speed ceilings. Users discover that cloud models (Gemini, Veo) are dramatically better → natural upgrade path.

---

*This document is intended as a pitch reference for investor conversations. The product is live, functional, and continuously improving. All metrics and pricing are current as of February 2026.*
