'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function boldify(s: string): string {
  return escHtml(s).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/60 font-medium">$1</strong>');
}

// ===== DOCUMENTATION DATA =====
interface DocSection {
  id: string;
  title: string;
  content: string;
}

interface DocPage {
  title: string;
  description: string;
  sections: DocSection[];
}

interface NavGroup {
  title: string;
  icon: string;
  items: { slug: string; title: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Getting Started',
    icon: 'fa-rocket',
    items: [
      { slug: 'getting-started', title: 'Introduction' },
      { slug: 'installation', title: 'Installation' },
      { slug: 'quick-start', title: 'Quick Start' },
    ],
  },
  {
    title: 'Core Concepts',
    icon: 'fa-cube',
    items: [
      { slug: 'prompt-guide', title: 'AI Prompt Guide' },
      { slug: 'design-system', title: 'Design System' },
      { slug: 'presets', title: 'Presets & Templates' },
    ],
  },
  {
    title: '3D Website Builder',
    icon: 'fa-cube',
    items: [
      { slug: '3d-builder', title: 'Overview' },
      { slug: '3d-builder-models', title: 'Motion & media' },
    ],
  },
  {
    title: 'Advanced',
    icon: 'fa-gear',
    items: [
      { slug: 'deployment', title: 'Deployment' },
      { slug: 'github-integration', title: 'GitHub Integration' },
      { slug: 'custom-api-key', title: 'Custom API Key' },
    ],
  },
];

const DOCS: Record<string, DocPage> = {
  'getting-started': {
    title: 'Introduction',
    description: 'Get started with Draftly — the AI-powered web design platform.',
    sections: [
      {
        id: 'what-is-draftly',
        title: 'What is Draftly?',
        content: 'Draftly is an AI-powered platform that generates production-ready websites from natural language descriptions. Our AI has been trained on 10,000+ world-class web designs, enabling it to produce layouts that are professional, modern, and beautifully balanced.\n\nUnlike generic AI tools, Draftly understands design patterns, typography, color theory, and spatial hierarchy. The result is clean, semantic HTML with Tailwind CSS — code that developers actually want to work with.',
      },
      {
        id: 'key-features',
        title: 'Key Features',
        content: '• **3D Website Builder** — One prompt → cinematic still, motion video, extracted frames, and scroll-synced HTML\n• **Motion** — Veo 3.1 Fast (Google) by default on paid plans; optional LTX 2.3 Fast via fal.ai with your `FAL_KEY`\n• **Hero imagery** — Seedream and optional Nano Banana models on higher tiers\n• **Export** — Production HTML and ZIP (by plan); optional GitHub push where enabled\n• **Design presets** — Industry templates to speed up the first draft\n• **Iteration** — Refine layout, copy, and motion through chat',
      },
      {
        id: 'how-it-works',
        title: 'How It Works',
        content: '1. **Describe** — Enter a natural language description of your website\n2. **Generate** — Our AI creates a production-ready interface\n3. **Iterate** — Chat with AI to refine colors, layout, content\n4. **Export** — Download HTML/CSS or deploy directly\n\nThe entire process takes seconds, not hours. Each generation produces clean, semantic code with proper accessibility attributes and responsive design.',
      },
      {
        id: 'system-requirements',
        title: 'System Requirements',
        content: 'Draftly runs entirely in the browser. No local installation is required for the core platform.\n\n**Browser Support:**\n- Chrome 90+ (recommended)\n- Firefox 88+\n- Safari 14+\n- Edge 90+\n\n**For Local AI Server (optional):**\n- Python 3.10+\n- NVIDIA GPU with 4GB+ VRAM\n- CUDA 11.7+',
      },
    ],
  },
  'installation': {
    title: 'Installation',
    description: 'Set up Draftly for local development.',
    sections: [
      {
        id: 'prerequisites',
        title: 'Prerequisites',
        content: 'Before getting started, ensure you have:\n\n- Node.js 18+ installed\n- npm or pnpm package manager\n- A Firebase project configured\n- (Optional) Google Gemini API key',
      },
      {
        id: 'clone-and-install',
        title: 'Clone & Install',
        content: '```bash\ngit clone https://github.com/your-repo/draftly.git\ncd draftly\nnpm install\n```\n\nCopy the environment variables:\n\n```bash\ncp .env.example .env.local\n```\n\nFill in your API keys and Firebase configuration.',
      },
      {
        id: 'environment-variables',
        title: 'Environment Variables',
        content: '| Variable | Description | Required |\n|----------|------------|----------|\n| `GOOGLE_AI_KEY` | Gemini API key | Yes |\n| `NEXT_PUBLIC_FIREBASE_*` | Firebase config | Yes |\n| `FAL_KEY` / `fal_key` | Fal.ai — Seedream hero stills, LTX 2.3 Fast motion, extend | For full builder media |\n| API-Easy / Google video vars | Veo motion in the builder | As in `.env.example` |',
      },
      {
        id: 'run-development',
        title: 'Run Development Server',
        content: '```bash\nnpm run dev\n```\n\nOpen [http://localhost:3000](http://localhost:3000) in your browser. You should see the Draftly homepage.',
      },
    ],
  },
  'prompt-guide': {
    title: 'AI Prompt Guide',
    description: 'Write effective prompts for better AI-generated websites.',
    sections: [
      {
        id: 'prompt-basics',
        title: 'Prompt Basics',
        content: 'The quality of your generated website depends heavily on your prompt. Here are the key elements of an effective prompt:\n\n1. **Website Type** — What kind of site? (landing page, portfolio, e-commerce)\n2. **Industry/Niche** — What sector? (tech, fashion, healthcare)\n3. **Style** — What aesthetic? (minimal, bold, corporate, playful)\n4. **Key Sections** — What content blocks? (hero, features, pricing)\n5. **Color Preferences** — Any specific palette? (dark, blue accents)',
      },
      {
        id: 'good-prompts',
        title: 'Examples of Good Prompts',
        content: '**Example 1:**\n"Create a modern SaaS landing page for an AI analytics product. Dark theme with blue accents, hero section with gradient text, feature grid, pricing table with 3 tiers, and testimonials section."\n\n**Example 2:**\n"Design a minimal portfolio for a photographer. White background, full-bleed images in a masonry grid, about section, and contact form. Clean typography with lots of whitespace."\n\n**Example 3:**\n"Build an e-commerce product page for premium headphones. Dark background, large product hero image, specs table, reviews section, and add-to-cart button with animation."',
      },
      {
        id: 'prompt-enhancement',
        title: 'AI Prompt Enhancement',
        content: 'Draftly includes a built-in prompt enhancer that uses AI to improve your descriptions. Click the sparkle icon (✨) next to the prompt input to automatically:\n\n- Add specific design details\n- Include relevant section suggestions\n- Specify color and typography preferences\n- Add responsive design instructions\n\nThis typically improves generation quality by 40-60%.',
      },
    ],
  },
  '3d-builder': {
    title: '3D Website Builder',
    description: 'End-to-end cinematic sites: still, motion, frames, and HTML from one workflow.',
    sections: [
      {
        id: 'overview',
        title: 'What you build here',
        content: 'The **3D Website Builder** is Draftly’s product surface: describe a site and background, generate a hero still, add motion video, extract frames, and ship scroll-driven HTML. Open **`/3d-builder`** from the app header after you sign in.\n\nLegacy `/studio` paths redirect here so old bookmarks keep working.',
      },
      {
        id: 'builder-flow',
        title: 'Typical pipeline',
        content: '1. **Describe** — Site prompt + background / creative direction.\n2. **Still** — Hero image at your chosen resolution (plan limits apply).\n3. **Motion** — Video pass (Veo or LTX on fal); optional first→last keyframes where your plan allows.\n4. **Frames & site** — WebP frames and generated HTML aligned to scroll.\n5. **Ship** — Download or deploy depending on your plan (ZIP and GitHub where enabled).',
      },
      {
        id: 'credits',
        title: 'Credits & plans',
        content: 'Image, video, frame extraction, and site generation use **builder credits** tied to your subscription. Exact allowances and tiers are on the **Pricing** page. Configure provider keys in `.env` / hosting (see Installation and **Motion & media**).',
      },
    ],
  },
  'quick-start': {
    title: 'Quick Start',
    description: 'Create your first website in under 2 minutes.',
    sections: [
      { id: 'step-1', title: 'Step 1: Sign In', content: 'Create an account or sign in with Google. This enables saving projects and using the 3D Website Builder.' },
      { id: 'step-2', title: 'Step 2: Enter a Prompt', content: 'On the homepage, describe the website you want to create. Be specific about the type, style, and key sections.' },
      { id: 'step-3', title: 'Step 3: Generate', content: 'Press Enter or click the arrow button. The AI will generate a complete website in seconds.' },
      { id: 'step-4', title: 'Step 4: Iterate', content: 'Use the chat feature to refine your design. Ask for color changes, new sections, or layout adjustments.' },
      { id: 'step-5', title: 'Step 5: Export', content: 'Download the HTML/CSS file or push directly to GitHub. Your website is production-ready.' },
    ],
  },
  'deployment': {
    title: 'Deployment',
    description: 'Deploy your generated projects to production.',
    sections: [
      { id: 'export-options', title: 'Export Options', content: 'Draftly supports multiple export formats:\n\n- **HTML + Tailwind CSS** — Single-file output\n- **Multi-file project** — Full project structure (Premium)\n- **ZIP download** — Complete project archive\n- **GitHub push** — Direct repository creation' },
      { id: 'vercel', title: 'Deploy to Vercel', content: 'After pushing to GitHub, you can deploy instantly on Vercel:\n\n1. Connect your GitHub repository to Vercel\n2. Vercel auto-detects the project configuration\n3. Deploy with one click\n\nFor Next.js projects, Vercel will handle server-side rendering automatically.' },
      { id: 'static-hosting', title: 'Static Hosting', content: 'Single-page exports can be hosted on any static hosting provider: Netlify, GitHub Pages, Cloudflare Pages, or your own server. Simply upload the HTML file.' },
    ],
  },
  'design-system': {
    title: 'Design System',
    description: 'Understanding Draftly\'s design generation approach.',
    sections: [
      { id: 'themes', title: 'Available Themes', content: 'Draftly supports multiple theme types: Professional, Cinematic, Gaming, Minimal, and Luxury. Each theme includes pre-configured color palettes, typography, and visual styles.' },
      { id: 'color-palettes', title: 'Color Palettes', content: 'Choose from Dark, Blue, Purple, Green, or Orange color palettes. Each palette is carefully balanced for readability and visual hierarchy.' },
      { id: 'typography', title: 'Typography System', content: 'Draftly generates responsive typography with proper hierarchy. Headings use display fonts, body text uses readable sans-serif, and code uses monospace.' },
    ],
  },
  '3d-builder-models': {
    title: 'Motion & media',
    description: 'Models and quality settings inside the 3D Website Builder.',
    sections: [
      {
        id: 'image-models',
        title: 'Hero stills',
        content: 'Default **Seedream 4.5** (fal) for cinematic backgrounds. **Nano Banana Pro** and **Nano Banana** (API-Easy / Gemini) unlock on **Premium ($200/mo)+** for higher-end stills. Image resolution tiers (1K / 2K / 4K) follow your plan — 2K/4K need Premium+.',
      },
      {
        id: 'video-models',
        title: 'Motion video',
        content: '**Veo 3.1 Fast (Google / API-Easy)** is the default motion engine on paid plans and supports **first→last frame** where enabled. **LTX 2.3 Fast (fal)** is optional for single-image image-to-video; set **`FAL_KEY`** or **`fal_key`** on the server. LTX on fal does not replace two-keyframe mode — use Veo for that.\n\n**2K/4K video** output requires **Premium+**. Match aspect ratio (16:9, 9:16, 1:1) to your layout.',
      },
      {
        id: 'site-ai',
        title: 'Site HTML (“Site AI”)',
        content: 'The **Site AI** picker chooses which Gemini profile bills and routes full-site HTML generation. It does not change how you write prompts in chat — it affects cost multipliers and backend routing.',
      },
      {
        id: 'resolution-limits',
        title: 'Quality summary',
        content: '**Video:** 720p/1080p on paid plans; 2K/4K on Premium+.\n**Image:** 1K on paid; 2K/4K on Premium+.\n**Extend clip** (continue a finished video) uses fal LTX extend on **Pro+** with the same `FAL_KEY`.',
      },
    ],
  },
  'presets': {
    title: 'Presets & Templates',
    description: 'Jump-start with industry-specific design templates.',
    sections: [
      { id: 'available-presets', title: 'Available Presets', content: 'Draftly includes design presets for various industries and styles: Futuristic Tech SaaS, Clean Minimalist, Creative Portfolio, Dark SaaS Waitlist, Professional Platform, and more.' },
      { id: 'using-presets', title: 'Using Presets', content: 'Navigate to the Presets page from the dashboard. Click any preset to see a preview, then customize with your own content. Presets serve as a starting point — you can iterate on them with AI chat.' },
    ],
  },
  'github-integration': {
    title: 'GitHub Integration',
    description: 'Push generated projects to GitHub repositories.',
    sections: [
      { id: 'setup', title: 'Setup', content: 'GitHub integration is available on Premium plans. Connect your GitHub account from the Settings page.' },
      { id: 'pushing-code', title: 'Pushing Code', content: 'After generating a project, click "Push to GitHub" to create a new repository with your generated code. Draftly creates proper project structure with README, package.json, and deployment configuration.' },
    ],
  },
  'custom-api-key': {
    title: 'Custom API Key',
    description: 'Use your own Gemini API key for generations.',
    sections: [
      { id: 'setup', title: 'Setup', content: 'Pro and Premium users can add their own Gemini API key in Settings. This allows using your own quota instead of Draftly credits.' },
      { id: 'benefits', title: 'Benefits', content: 'Using your own API key gives you:\n- No generation limits\n- Faster processing priority\n- Direct access to latest models' },
    ],
  },
};
export default function DocsPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'getting-started';
  const doc = DOCS[slug] || DOCS['getting-started'];
  const [activeSection, setActiveSection] = useState(doc.sections[0]?.id || '');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_GROUPS.map((g) => [g.title, true]))
  );

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = doc.sections.map((s) => document.getElementById(s.id));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(doc.sections[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [doc]);

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  // Find current nav group and item for breadcrumb
  const currentNavGroup = NAV_GROUPS.find((g) => g.items.some((item) => item.slug === slug));
  const currentNavItem = currentNavGroup?.items.find((item) => item.slug === slug);

  return (
    <div className="min-h-screen bg-obsidian">
      <Header />

      <div className="pt-16">
        <div className="max-w-[1400px] mx-auto flex">
          {/* ===== LEFT SIDEBAR ===== */}
          <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-white/[0.04] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
            <nav className="space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors"
                  >
                    <i className={`fa-solid ${group.icon} text-[10px] w-4 text-center`} />
                    <span className="flex-1 text-left">{group.title}</span>
                    <i className={`fa-solid fa-chevron-${expandedGroups[group.title] ? 'down' : 'right'} text-[8px]`} />
                  </button>
                  {expandedGroups[group.title] && (
                    <div className="mt-1 ml-6 space-y-0.5">
                      {group.items.map((item) => (
                        <Link
                          key={item.slug}
                          href={`/docs/${item.slug}`}
                          className={`block px-3 py-1.5 rounded-lg text-sm transition-all ${
                            item.slug === slug
                              ? 'text-white bg-accent/[0.08] border-l-2 border-accent'
                              : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                          }`}
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <main className="flex-1 min-w-0 px-6 lg:px-12 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-white/25 mb-6">
              <Link href="/docs/getting-started" className="hover:text-white/40 transition-colors">Docs</Link>
              {currentNavGroup && (
                <>
                  <i className="fa-solid fa-chevron-right text-[8px]" />
                  <span>{currentNavGroup.title}</span>
                </>
              )}
              {currentNavItem && (
                <>
                  <i className="fa-solid fa-chevron-right text-[8px]" />
                  <span className="text-white/40">{currentNavItem.title}</span>
                </>
              )}
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              key={slug}
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                {doc.title}
              </h1>
              <p className="text-white/35 text-lg mb-10">{doc.description}</p>
            </motion.div>

            {/* Sections */}
            <div className="space-y-12">
              {doc.sections.map((section, i) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="scroll-mt-24"
                >
                  <h2 className="font-display text-xl font-semibold text-white mb-4 tracking-tight">
                    {section.title}
                  </h2>
                  <div className="text-white/40 text-sm leading-relaxed space-y-3">
                    {section.content.split('\n\n').map((paragraph, j) => {
                      // Detect code blocks
                      if (paragraph.startsWith('```')) {
                        const lines = paragraph.split('\n');
                        const lang = lines[0].replace('```', '').trim();
                        const code = lines.slice(1, -1).join('\n');
                        return (
                          <div key={j} className="code-block p-4 my-4 overflow-x-auto">
                            {lang && <div className="text-[10px] text-white/20 font-mono mb-2 uppercase">{lang}</div>}
                            <pre className="text-white/60 text-sm font-mono">{code}</pre>
                          </div>
                        );
                      }
                      // Detect table
                      if (paragraph.includes('|') && paragraph.includes('---')) {
                        const rows = paragraph.split('\n').filter((r) => !r.includes('---'));
                        const headers = rows[0]?.split('|').map((h) => h.trim()).filter(Boolean);
                        const body = rows.slice(1).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));
                        return (
                          <div key={j} className="overflow-x-auto my-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  {headers?.map((h, k) => (
                                    <th key={k} className="text-left py-2 px-3 text-white/50 font-medium text-xs">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {body.map((row, k) => (
                                  <tr key={k} className="border-b border-white/[0.03]">
                                    {row.map((cell, l) => (
                                      <td key={l} className="py-2 px-3 text-white/40 font-mono text-xs">{cell.replace(/`/g, '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      // Detect list items
                      if (paragraph.startsWith('•') || paragraph.startsWith('- ') || /^\d+\./.test(paragraph)) {
                        return (
                          <div key={j} className="space-y-2">
                            {paragraph.split('\n').map((line, k) => (
                              <div key={k} className="flex items-start gap-2">
                                <span className="text-accent/60 mt-0.5">
                                  {/^\d+\./.test(line) ? line.match(/^\d+/)?.[0] + '.' : '•'}
                                </span>
                                <span dangerouslySetInnerHTML={{
                                  __html: boldify(line.replace(/^[•\-\d.]+\s*/, ''))
                                }} />
                              </div>
                            ))}
                          </div>
                        );
                      }
                      // Regular paragraph with bold
                      return (
                        <p key={j} dangerouslySetInnerHTML={{
                          __html: boldify(paragraph)
                        }} />
                      );
                    })}
                  </div>
                </motion.section>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/[0.04]">
              {(() => {
                const allItems = NAV_GROUPS.flatMap((g) => g.items);
                const currentIndex = allItems.findIndex((item) => item.slug === slug);
                const prev = currentIndex > 0 ? allItems[currentIndex - 1] : null;
                const next = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;
                return (
                  <>
                    {prev ? (
                      <Link href={`/docs/${prev.slug}`} className="group text-left">
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">Previous</span>
                        <span className="block text-sm text-white/50 group-hover:text-white transition-colors">
                          <i className="fa-solid fa-arrow-left text-[10px] mr-2" />
                          {prev.title}
                        </span>
                      </Link>
                    ) : <div />}
                    {next ? (
                      <Link href={`/docs/${next.slug}`} className="group text-right">
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">Next</span>
                        <span className="block text-sm text-white/50 group-hover:text-white transition-colors">
                          {next.title}
                          <i className="fa-solid fa-arrow-right text-[10px] ml-2" />
                        </span>
                      </Link>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </main>

          {/* ===== RIGHT SIDEBAR (Table of Contents) ===== */}
          <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">On this page</span>
            </div>
            <nav className="space-y-1">
              {doc.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`block pl-3 py-1 text-sm border-l-2 transition-all ${
                    activeSection === section.id
                      ? 'border-accent text-white'
                      : 'border-transparent text-white/25 hover:text-white/40'
                  }`}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
