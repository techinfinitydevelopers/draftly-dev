'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Template {
    id: string;
    name: string;
    category: string;
    thumbnail: string;
    accent: string;
    tags: string[];
    /** Step 1 prompt — website hero layout (nav, headline, CTA, fonts, colors) */
    sitePrompt: string;
    /** Step 2 prompt — background visual only (no UI text) */
    bgPrompt: string;
}

const TEMPLATES: Template[] = [
    {
        id: 'utility-scroll',
        name: 'Meridian — Cinematic scroll',
        category: 'Premium / Scroll',
        thumbnail: '/template-stackforge.jpeg',
        accent: '#60a5fa',
        tags: ['Scroll theatre', 'Values deck', 'Texture'],
        sitePrompt: `Premium scroll-driven landing page (utility / executive style). Step 1 hero overlay ONLY (frames show separately): floating centered nav pill — gradient #1a1a1a to #0d0d0d, 1px border rgba(255,255,255,0.1), rounded-full, max-width min(1040px,92vw). Brand wordmark "MERIDIAN" in Cinzel or similar, micro caps. Links: Services, Markets, Insights, Contact — uppercase, letter-spacing 0.22em, muted white/70. Primary CTA pill: "Book a call".

Hero: dark vignette gradient top-left for readability over video frames. Eyebrow row: thin gold OR cool blue accent line + uppercase micro label "Premium business setup services" (letter-spacing 0.3em, 0.65rem). H1 display serif (Cormorant Garamond): large editorial headline "Where vision meets global opportunity" — two lines, tight leading. Subparagraph 0.85rem, cream/60% opacity, max-width 28rem. CTAs: chamfer-style primary "Apply now" + text link "Cost calculator" with circle play icon. Bottom stats row: three columns — "15,000+" / "Business setups", "600+" / "Global programs", "30,000+" / "Concierge moments". Small scroll cue bottom center: "SCROLL" + vertical gold hairline.

CRITICAL — first section inside #pageRoot after the scroll theatre (min-height 110vh): id="section-who". Header row: left — eyebrow "Who we are" with accent rule; H2 two lines with second line italic accent word "opportunity"; right — narrow supporting paragraph (real copy about trust since 2019 style). Below: exactly FIVE chamfered cards in a row (horizontal scroll on mobile). Each card: unique dark gradient, dot-grid texture overlay, subtle SVG film grain, bottom-aligned content with index 01–05 in accent, title, one-line description. Card themes: Integrity, Unity, Innovation, Customer focus, Excellence. 3D tilt on hover (vanilla JS on .card-3d). Reveal with IntersectionObserver stagger when section enters viewport.

Then continue with long lower sections (features bento, proof, pricing, testimonials, contact) — min-height 120vh each, noise overlay on page, top scroll progress bar, bottom liquid white fill in last 10% scroll. No backdrop-filter on #bgWrap/#bgCanvas. Cream #F4EFE6 text on ink #141210 feel.`,
        bgPrompt: `Cinematic photoreal environment for a scroll-scrubbed frame sequence (no text, no logos). Scene: modern global business district at golden hour — glass towers, warm sun glancing off facades, subtle atmospheric haze, slow dolly-in feeling, premium executive mood. Color direction: deep charcoal shadows, warm amber highlights, restrained teal reflections in glass. Ultra clean composition, 16:9, high detail, filmic contrast — suitable as 200+ frame hero background with strong depth progression as if camera advances through the plaza.`,
    },
    {
        id: 'tripvault',
        name: 'TripVault — Travel App',
        category: 'Mobile App',
        thumbnail: '/template-tripvault.jpeg',
        accent: '#38bdf8',
        tags: ['Travel', 'SaaS', 'Blue Sky'],
        sitePrompt: `Modern travel planning app landing page hero. Navigation: Logo TripVault, Menu items: Features, Pricing, Company, Help, Button: Sign In. Centered layout. Headline: All Your Travel Plans. One Simple Place. Subtext: Store tickets, itineraries, bookings and documents — automatically organized for every trip. CTA button: Download App. Hero background: bright sky with floating travel UI cards including airline tickets, boarding pass and itinerary panels. Design style: playful SaaS interface with floating cards and soft shadows. Fonts: Inter / Poppins. Colors: sky blue background, white UI cards, soft gradient highlights.`,
        bgPrompt: `Bright modern travel-themed sky environment for a SaaS landing page background. Background: bright blue sky filled with soft fluffy clouds. Floating 3D travel UI-style cards representing travel information floating in space with subtle shadows: Card 1: airline ticket style card with countdown timer interface. Card 2: boarding pass style card. Card 3: travel itinerary style card. Cards floating in soft 3D perspective with smooth depth and gentle motion feeling. Design style: modern mobile-first SaaS aesthetic, soft UI shadows, floating interface elements, playful minimalism. Color palette: sky blue, white, soft gradients. Clean open composition suitable as a landing page hero background. Aspect ratio 16:9`,
    },
    {
        id: 'shopnest',
        name: 'Shopnest — Ecommerce',
        category: 'Ecommerce',
        thumbnail: '/template-shopnest.jpeg',
        accent: '#f472b6',
        tags: ['Ecommerce', 'Pastel', '3D Objects'],
        sitePrompt: `Modern ecommerce website builder SaaS hero. Navigation: Logo Shopnest, Menu: Features, Templates, Pricing, Resources, Login, Primary button: Start Selling. Layout: text left, illustration right. Headline: Launch Your Online Store in Minutes. Subtext: Create a beautiful storefront, manage orders, and start selling globally — all from one simple dashboard. Input field: Enter your store name. Button beside input: arrow button. Hero background: stylized 3D storefront building with floating packages and coins. Design style: Apple-style soft UI with clay style 3D illustration. Fonts: Inter / SF Pro style. Colors: white background, soft blue gradients, pink accent buttons.`,
        bgPrompt: `Modern SaaS landing page hero background illustration with clean UI aesthetic and soft pastel lighting. Right side visual concept expanded into full scene: stylized soft 3D miniature storefront building with glowing window lights, striped shop awning, small delivery boxes floating on a pathway, subtle coins and packages scattered around. Dreamy cloud environment surrounding the storefront with soft shadows and pastel gradients. Design style: Apple-style soft UI environment, smooth rounded clay-style 3D rendering, ultra clean composition, product-style hero illustration with subtle depth-of-field blur. Camera: slight isometric angle. Colors: white, soft blue, pink accent highlights. High-end startup design aesthetic background illustration. Aspect ratio 16:9`,
    },
    {
        id: 'orbitcrm',
        name: 'OrbitCRM — Agency CRM',
        category: 'SaaS / CRM',
        thumbnail: '/template-orbitcrm.jpeg',
        accent: '#60a5fa',
        tags: ['Agency', 'Glass UI', 'Nature BG'],
        sitePrompt: `Modern CRM SaaS landing page hero inside glass container. Navigation: Logo OrbitCRM, Menu: Features, Integrations, Pricing, Docs, Button: Start Free Trial. Centered hero layout. Headline: Run Your Agency Smarter. Word Smarter highlighted with blue gradient. Subheading: All your projects, clients, analytics and invoices — unified into one powerful platform. CTA: Try it Free for 14 Days. Hero background: hand painted countryside landscape with rolling hills, birds and soft sunlight. Design style: glass UI container with blur and shadows. Fonts: Inter / DM Sans. Colors: soft blues and greens, white container.`,
        bgPrompt: `Beautiful digital landscape background illustration designed for a modern SaaS landing hero environment. Scene: hand-painted countryside environment with rolling hills, soft clouds drifting across the sky, birds flying, trees gently swaying in the wind, peaceful natural scenery with warm sunlight glow. Soft atmospheric lighting and gentle depth across the landscape. Style: modern digital painting with smooth gradients and subtle lighting. Aesthetic: calm minimal environment suitable as a SaaS hero background. Aspect ratio 16:9`,
    },
    {
        id: 'syncbase',
        name: 'SyncBase — Team Collaboration',
        category: 'Productivity',
        thumbnail: '/template-syncbase.jpeg',
        accent: '#34d399',
        tags: ['Productivity', 'Kanban', 'Light UI'],
        sitePrompt: `Modern team collaboration SaaS landing page hero. Navigation: Logo SyncBase, Menu items: Product, Teams, Integrations, Pricing, Button: Sign Up. Centered hero. Headline: Where Teams Build Together. Subtext: Plan projects, track progress, and collaborate seamlessly. CTA button: Start Collaborating. Hero background: floating productivity workspace environment with kanban boards, chat windows, project timelines and avatars. Design style: clean productivity UI similar to modern collaboration tools. Fonts: Inter / Plus Jakarta Sans. Colors: white background, soft teal and pastel gradients.`,
        bgPrompt: `Modern digital collaboration workspace environment used as a landing page background. Scene: floating productivity interface elements such as kanban boards, chat windows, project timelines and avatar indicators suspended in a digital workspace environment. UI panels floating in layered depth with soft shadows and smooth spacing. Design style: clean productivity environment inspired by modern tools like Notion and Linear. Bright minimal color palette with soft gradients. Light futuristic workspace atmosphere. Aspect ratio 16:9`,
    },
    {
        id: 'stackforge',
        name: 'StackForge — Dev Platform',
        category: 'Developer Tool',
        thumbnail: '/template-stackforge.jpeg',
        accent: '#a78bfa',
        tags: ['Dev Tools', 'Dark', 'Grid World'],
        sitePrompt: `Minimal developer infrastructure platform landing page hero. Navigation bar: Logo StackForge, Menu items: Docs, SDK, Community, Pricing, Primary button: Start Building. Centered layout. Headline: Build Faster. Ship Smarter. Subtext: A powerful infrastructure platform for developers building modern applications. CTA button: Start Building for Free. Hero background: abstract digital grid landscape with floating terminal windows and code fragments. Design style: dark developer aesthetic similar to modern dev platforms. Fonts: IBM Plex Sans / Inter. Colors: deep navy background, neon blue and purple grid lines, white typography.`,
        bgPrompt: `Futuristic developer infrastructure environment used as a landing page hero background. Scene: abstract digital grid landscape stretching into the distance with glowing code fragments floating above the grid. Neon lights illuminating the grid lines with soft fog atmosphere. Floating terminal-style windows and code snippet panels suspended in space. Design style: dark futuristic developer aesthetic similar to modern developer platforms. Cinematic lighting with deep contrast and subtle glow effects. Aspect ratio 16:9`,
    },
    {
        id: 'visionforge',
        name: 'VisionForge — AI Video',
        category: 'AI Platform',
        thumbnail: '/template-visionforge.jpeg',
        accent: '#fb7185',
        tags: ['AI', 'Video', 'Cinematic'],
        sitePrompt: `Modern AI video generation SaaS landing page hero section. Top navigation bar: Logo VisionForge on left, Menu items: Product, Examples, Pricing, Community, Primary button: Generate Video. Hero layout: centered text with large cinematic illustration behind. Headline: Turn Ideas Into Cinematic Videos. Subtext: Generate professional videos instantly from simple prompts. CTA button: Generate Your First Video. Hero background: AI video editing timeline interface with floating clips, rendering nodes and cinematic scenes forming from prompts. Design style: modern AI creative tool interface, glowing accents, cinematic lighting. Fonts: Inter / Sora. Colors: dark gradient background, neon purple and cyan accents.`,
        bgPrompt: `AI video creation environment background illustration. Scene: floating cinematic video editing timeline environment with clips, rendering nodes, and visual blocks connected together in a futuristic creative workspace. Cinematic scenes forming visually from abstract prompt-like particles and energy streams. Floating UI-style panels and editing nodes suspended in space. Style: modern video production interface environment with glowing accents and soft lighting. Futuristic creative studio atmosphere. Aspect ratio 16:9`,
    },
];

function TemplateModal({ template, onClose }: { template: Template; onClose: () => void }) {
    const [copiedSite, setCopiedSite] = useState(false);
    const [copiedBg, setCopiedBg] = useState(false);
    const [activeTab, setActiveTab] = useState<'site' | 'bg'>('site');
    const router = useRouter();

    const handleUseThis = () => {
        const params = new URLSearchParams();
        params.set('sitePrompt', template.sitePrompt);
        params.set('bgPrompt', template.bgPrompt);
        router.push(`/3d-builder?${params.toString()}`);
    };

    const copyActive = () => {
        const text = activeTab === 'site' ? template.sitePrompt : template.bgPrompt;
        navigator.clipboard.writeText(text);
        if (activeTab === 'site') {
            setCopiedSite(true);
            setTimeout(() => setCopiedSite(false), 2500);
        } else {
            setCopiedBg(true);
            setTimeout(() => setCopiedBg(false), 2500);
        }
    };

    const isCopied = activeTab === 'site' ? copiedSite : copiedBg;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-3xl bg-[#0c0c18] border border-white/[0.12] rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video overflow-hidden">
                    <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c18] via-transparent to-transparent" />
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                        <i className="fa-solid fa-times text-sm" />
                    </button>
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold border" style={{ backgroundColor: template.accent + '25', color: template.accent, borderColor: template.accent + '40' }}>
                            {template.category}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start justify-between mb-5 gap-4">
                        <div>
                            <h3 className="text-white font-bold text-xl mb-1">{template.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                {template.tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-mono text-white/40 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.06]">{tag}</span>
                                ))}
                            </div>
                        </div>
                        {/* ── USE THIS button ── */}
                        <button
                            onClick={handleUseThis}
                            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-extrabold text-black transition-all duration-300 hover:brightness-110 hover:scale-[1.03] shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${template.accent}, ${template.accent}cc)` }}
                        >
                            <i className="fa-solid fa-cube text-[12px]" />
                            Use This
                            <i className="fa-solid fa-arrow-right text-[11px]" />
                        </button>
                    </div>

                    {/* How it works hint */}
                    <div className="mb-4 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-start gap-3">
                        <i className="fa-solid fa-info-circle text-[13px] mt-0.5 flex-shrink-0" style={{ color: template.accent }} />
                        <p className="text-[12px] text-white/60 leading-relaxed">
                            <strong className="text-white/90">Clicking "Use This"</strong> opens the 3D Builder with the <strong className="text-white/80">website prompt</strong> pre-loaded in Step 1. The <strong className="text-white/80">background prompt</strong> auto-fills in Step 2. Just press <strong className="text-white/80">Send</strong> at each step to confirm.
                        </p>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setActiveTab('site')}
                            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all duration-200 ${activeTab === 'site' ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'}`}
                        >
                            <i className="fa-solid fa-laptop mr-2 text-[10px]" />
                            Step 1 — Website Prompt
                        </button>
                        <button
                            onClick={() => setActiveTab('bg')}
                            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all duration-200 ${activeTab === 'bg' ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'}`}
                        >
                            <i className="fa-solid fa-image mr-2 text-[10px]" />
                            Step 2 — Background Prompt
                        </button>
                    </div>

                    {/* Prompt block */}
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                                {activeTab === 'site' ? 'Website hero layout prompt (Step 1)' : 'Background image prompt (Step 2)'}
                            </span>
                            <button
                                onClick={copyActive}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300"
                                style={{
                                    backgroundColor: isCopied ? '#34d39930' : 'rgba(255,255,255,0.06)',
                                    color: isCopied ? '#34d399' : 'rgba(255,255,255,0.6)',
                                    border: `1px solid ${isCopied ? '#34d39950' : 'rgba(255,255,255,0.08)'}`,
                                }}
                            >
                                <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                                {isCopied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-[#08080f] border border-white/[0.06] rounded-xl p-4 max-h-36 overflow-y-auto">
                            <p className="text-white/55 text-[12px] leading-relaxed font-mono">
                                {activeTab === 'site' ? template.sitePrompt : template.bgPrompt}
                            </p>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-5">
                        <button
                            onClick={handleUseThis}
                            className="w-full py-3.5 rounded-xl text-[14px] font-extrabold text-black transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-3 shadow-xl"
                            style={{ background: `linear-gradient(135deg, ${template.accent}, ${template.accent}bb)` }}
                        >
                            <i className="fa-solid fa-cube text-[13px]" />
                            Use This Template — Open in 3D Builder
                            <i className="fa-solid fa-arrow-right text-[12px]" />
                        </button>
                        <p className="mt-2 text-center text-[11px] text-white/30">Both prompts are pre-loaded — just press Send at each step</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function WebsiteTemplatesSection() {
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const router = useRouter();
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });

    const handleUseThis = (template: Template, e: React.MouseEvent) => {
        e.stopPropagation();
        const params = new URLSearchParams();
        params.set('sitePrompt', template.sitePrompt);
        params.set('bgPrompt', template.bgPrompt);
        router.push(`/3d-builder?${params.toString()}`);
    };

    return (
        <>
            <section id="3d-templates" className="relative z-10 py-12 md:py-20 scroll-mt-20 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none" style={{ background: 'rgba(96,165,250,0.05)' }} />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(167,139,250,0.04)' }} />

                <div className="max-w-[1400px] mx-auto px-5 md:px-6">
                    {/* Header */}
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, y: 40 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="text-center mb-12 md:mb-16"
                    >
                        <span className="tag mb-4 inline-flex">
                            <i className="fa-solid fa-cube text-[8px] text-violet-400" />
                            3D Website Templates
                        </span>
                        <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05]">
                            Start from a real design
                        </h2>
                        <p className="text-white/55 text-[14px] md:text-[16px] mt-5 max-w-2xl mx-auto leading-relaxed">
                            Click <strong className="text-white/80">"Use This"</strong> to open the 3D Builder with prompts pre-loaded — or click any card to preview both prompts first.
                        </p>
                    </motion.div>

                    {/* Template Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {TEMPLATES.map((template, i) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                                <div
                                    className="group relative w-full text-left rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/[0.22] transition-all duration-500 bg-[#0c0c16] cursor-pointer"
                                    style={{
                                        boxShadow: hoveredId === template.id ? `0 20px 60px ${template.accent}20, 0 0 0 1px ${template.accent}15` : 'none',
                                    }}
                                    onClick={() => setSelectedTemplate(template)}
                                    onMouseEnter={() => setHoveredId(template.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-full aspect-video overflow-hidden">
                                        <img
                                            src={template.thumbnail}
                                            alt={template.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500" />
                                        {/* Category badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
                                                style={{ backgroundColor: template.accent + '30', color: template.accent, border: `1px solid ${template.accent}40` }}>
                                                {template.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info + Use This row */}
                                    <div className="px-4 py-3.5">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-white font-semibold text-[13px] md:text-[14px] leading-tight truncate">{template.name}</h3>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {template.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-[9px] font-mono text-white/35 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Use This button — always visible */}
                                        <button
                                            onClick={(e) => handleUseThis(template, e)}
                                            className="w-full mt-1 py-2.5 rounded-xl text-[12px] font-extrabold text-black transition-all duration-300 hover:brightness-110 hover:scale-[1.02] flex items-center justify-center gap-2"
                                            style={{ background: `linear-gradient(135deg, ${template.accent}, ${template.accent}cc)` }}
                                        >
                                            <i className="fa-solid fa-cube text-[10px]" />
                                            Use This
                                            <i className="fa-solid fa-arrow-right text-[10px]" />
                                        </button>
                                        <p className="mt-1.5 text-center text-[10px] text-white/30">Click card to preview prompts</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="mt-10 md:mt-12 text-center"
                    >
                        <Link
                            href="/3d-builder"
                            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full text-[14px] font-bold bg-white text-black hover:bg-white/95 transition-all duration-300 shadow-[0_2px_20px_rgba(255,255,255,0.12)] hover:shadow-[0_4px_40px_rgba(255,255,255,0.22)]"
                        >
                            <i className="fa-solid fa-cube text-[12px] group-hover:rotate-12 transition-transform duration-300" />
                            Open 3D Website Builder
                            <i className="fa-solid fa-arrow-right text-[12px] group-hover:translate-x-0.5 transition-transform duration-300" />
                        </Link>
                        <p className="mt-3 text-white/30 text-[12px]">Use any template above — both prompts auto-load in the builder chat</p>
                    </motion.div>
                </div>
            </section>

            <AnimatePresence>
                {selectedTemplate && (
                    <TemplateModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
                )}
            </AnimatePresence>
        </>
    );
}
