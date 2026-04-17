'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ===== API DATA =====
interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ApiEndpoint {
  title: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  auth: boolean;
  params?: ApiParam[];
  bodyExample?: string;
  responseExample?: string;
  notes?: string;
}

interface ApiGroup {
  title: string;
  icon: string;
  endpoints: { slug: string; title: string; method: string }[];
}

const API_GROUPS: ApiGroup[] = [
  {
    title: 'Generation',
    icon: 'fa-wand-magic-sparkles',
    endpoints: [
      { slug: 'generate', title: 'Generate UI', method: 'POST' },
      { slug: 'enhance-prompt', title: 'Enhance Prompt', method: 'POST' },
      { slug: 'generate-full-app', title: 'Generate Full App', method: 'POST' },
      { slug: 'iterate-project', title: 'Iterate Project', method: 'POST' },
    ],
  },
  {
    title: '3D Website Builder',
    icon: 'fa-cube',
    endpoints: [
      { slug: 'builder-generate-bg', title: 'Generate background', method: 'POST' },
      { slug: 'builder-generate-video', title: 'Generate motion video', method: 'POST' },
      { slug: 'builder-generate-site', title: 'Generate site HTML', method: 'POST' },
      { slug: 'builder-bundle-zip', title: 'Bundle ZIP export', method: 'POST' },
    ],
  },
  {
    title: 'Analysis',
    icon: 'fa-magnifying-glass',
    endpoints: [
      { slug: 'analyze-file', title: 'Analyze File', method: 'POST' },
      { slug: 'analyze-image', title: 'Analyze Image', method: 'POST' },
    ],
  },
];

const ENDPOINTS: Record<string, ApiEndpoint> = {
  'generate': {
    title: 'Generate UI',
    description: 'Generate a production-ready website UI from a natural language prompt. Returns clean HTML with Tailwind CSS.',
    method: 'POST',
    path: '/api/generate',
    auth: true,
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Natural language description of the website to generate' },
      { name: 'preset', type: 'string', required: false, description: 'Design preset ID to use as a starting point' },
      { name: 'style', type: 'string', required: false, description: 'Visual style: futuristic, minimal, corporate, playful, etc.' },
    ],
    bodyExample: `{
  "prompt": "Create a modern SaaS landing page with dark theme, hero section, features grid, pricing table with 3 tiers, and testimonials",
  "preset": "futuristic-tech",
  "style": "cinematic"
}`,
    responseExample: `{
  "html": "<!DOCTYPE html>\\n<html>\\n<head>...",
  "css": "/* Generated Tailwind CSS */",
  "metadata": {
    "generationTime": "2.3s",
    "model": "gemini-2.5-flash",
    "tokensUsed": 4521
  }
}`,
  },
  'enhance-prompt': {
    title: 'Enhance Prompt',
    description: 'Use AI to enhance and improve a website generation prompt with specific design details, sections, and styling instructions.',
    method: 'POST',
    path: '/api/enhance-prompt',
    auth: true,
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'The original prompt to enhance' },
    ],
    bodyExample: `{
  "prompt": "Make a portfolio website"
}`,
    responseExample: `{
  "enhancedPrompt": "Create a modern, minimal portfolio website for a creative professional. Features: hero section with animated greeting text, project showcase grid with hover effects, skills section with progress bars, about section with timeline, contact form with validation. Style: dark background (#0a0a0a), white text, subtle gradients, smooth scroll animations."
}`,
  },
  'builder-generate-bg': {
    title: 'Generate background (3D Builder)',
    description: 'Creates the cinematic hero still for the 3D Website Builder. Uses the signed-in user’s plan and builder credits.',
    method: 'POST',
    path: '/api/3d-builder/generate-bg',
    auth: true,
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Creative direction for the background still' },
      { name: 'userId', type: 'string', required: true, description: 'Firebase user id' },
      { name: 'aspectRatio', type: 'string', required: false, description: 'e.g. 16:9, 9:16, 1:1' },
      { name: 'displayImageModelId', type: 'string', required: false, description: 'seedream-4.5, nano-banana-pro, nano-banana' },
      { name: 'resolutionTier', type: 'string', required: false, description: '1K | 2K | 4K (plan-gated)' },
    ],
    bodyExample: `{
  "prompt": "Cinematic neon city skyline at dusk, no text",
  "userId": "firebase_uid",
  "aspectRatio": "16:9",
  "displayImageModelId": "seedream-4.5",
  "resolutionTier": "1K"
}`,
    responseExample: `{
  "success": true,
  "imageUrl": "https://..."
}`,
    notes: 'Requires paid builder plan and configured provider keys (see .env.example).',
  },
  'builder-generate-video': {
    title: 'Generate motion video (3D Builder)',
    description: 'Runs the motion pass after a hero still: Veo (API-Easy) or LTX 2.3 Fast on fal.',
    method: 'POST',
    path: '/api/3d-builder/generate-video',
    auth: true,
    params: [
      { name: 'userId', type: 'string', required: true, description: 'Firebase user id' },
      { name: 'imageUrl', type: 'string', required: false, description: 'HTTPS URL of the hero still (single-frame mode)' },
      { name: 'firstFrameUrl', type: 'string', required: false, description: 'First keyframe for Veo FL mode' },
      { name: 'lastFrameUrl', type: 'string', required: false, description: 'Last keyframe for Veo FL mode' },
      { name: 'prompt', type: 'string', required: false, description: 'Motion / director notes' },
      { name: 'displayVideoModelId', type: 'string', required: false, description: 'veo-31-fast | ltx-23-fast-fal' },
      { name: 'resolution', type: 'string', required: false, description: '720p | 1080p | 2k | 4k' },
      { name: 'ltxDurationSec', type: 'number', required: false, description: 'Output seconds when using LTX on fal' },
      { name: 'ltxFps', type: 'number', required: false, description: 'FPS when using LTX on fal' },
    ],
    bodyExample: `{
  "userId": "firebase_uid",
  "imageUrl": "https://cdn.example/hero.png",
  "prompt": "Slow dolly, subtle parallax",
  "displayVideoModelId": "veo-31-fast",
  "resolution": "1080p"
}`,
    responseExample: `{
  "success": true,
  "videoBase64": "data:video/mp4;base64,...",
  "creditsUsed": 0
}`,
    notes: 'LTX on fal needs FAL_KEY; Veo needs API-Easy / Google configuration. First→last frame is Veo-only.',
  },
  'builder-generate-site': {
    title: 'Generate site HTML (3D Builder)',
    description: 'Produces scroll-synced HTML from chat context, frames, and builder state.',
    method: 'POST',
    path: '/api/3d-builder/generate-site',
    auth: true,
    params: [
      { name: 'userId', type: 'string', required: true, description: 'Firebase user id' },
      { name: 'messages', type: 'array', required: true, description: 'Conversation / site spec payload (see route for full shape)' },
    ],
    bodyExample: `{
  "userId": "firebase_uid",
  "messages": []
}`,
    responseExample: `{
  "success": true,
  "siteCode": "<!DOCTYPE html>..."
}`,
    notes: 'Request shape matches what the /3d-builder client sends; inspect the route for optional fields.',
  },
  'builder-bundle-zip': {
    title: 'Bundle ZIP (3D Builder)',
    description: 'Packages generated HTML and assets for download where the user’s plan allows ZIP export.',
    method: 'POST',
    path: '/api/3d-builder/bundle-zip',
    auth: true,
    params: [
      { name: 'userId', type: 'string', required: true, description: 'Firebase user id' },
    ],
    bodyExample: `{
  "userId": "firebase_uid"
}`,
    responseExample: `{
  "url": "https://..."
}`,
    notes: 'Premium-tier feature; see bundle-zip route for full body.',
  },
  'generate-full-app': {
    title: 'Generate Full App',
    description: 'Generate a complete multi-file project structure with frontend, backend, and configuration files. Premium plan required.',
    method: 'POST',
    path: '/api/generate-full-app',
    auth: true,
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Description of the full application' },
      { name: 'framework', type: 'string', required: false, description: 'Target framework: nextjs, react, html' },
    ],
    bodyExample: `{
  "prompt": "Create a task management app with user auth, dashboard, and kanban board",
  "framework": "nextjs"
}`,
    responseExample: `{
  "files": {
    "package.json": "...",
    "app/page.tsx": "...",
    "app/dashboard/page.tsx": "..."
  },
  "projectId": "proj_abc123"
}`,
  },
  'iterate-project': {
    title: 'Iterate Project',
    description: 'Iterate on an existing project using AI chat. Make changes, add features, or fix issues through natural language.',
    method: 'POST',
    path: '/api/iterate-project',
    auth: true,
    params: [
      { name: 'projectId', type: 'string', required: true, description: 'Project ID to iterate on' },
      { name: 'message', type: 'string', required: true, description: 'Instruction for the iteration' },
      { name: 'currentCode', type: 'string', required: true, description: 'Current code to iterate on' },
    ],
    bodyExample: `{
  "projectId": "proj_abc123",
  "message": "Add a dark mode toggle to the header",
  "currentCode": "<!DOCTYPE html>..."
}`,
    responseExample: `{
  "html": "<!DOCTYPE html>...",
  "changes": "Added dark mode toggle button in header with CSS variables for theme switching"
}`,
  },
  'analyze-file': {
    title: 'Analyze File',
    description: 'Upload a reference file (image, PDF, code) for AI analysis. Returns an enhanced prompt based on the file content.',
    method: 'POST',
    path: '/api/analyze-file',
    auth: true,
    params: [
      { name: 'file', type: 'File', required: true, description: 'File to analyze (multipart/form-data)' },
      { name: 'prompt', type: 'string', required: false, description: 'Optional existing prompt to enhance with file context' },
    ],
    responseExample: `{
  "enhancedPrompt": "Based on the uploaded design reference..."
}`,
    notes: 'Accepts .txt, .md, .html, .json, .css, .js, .ts, .jsx, .tsx, .pdf, .png, .jpg, .jpeg, .webp, .gif',
  },
  'analyze-image': {
    title: 'Analyze Image',
    description: 'Analyze an image using AI vision to extract design elements, colors, layout, and generate a recreation prompt.',
    method: 'POST',
    path: '/api/analyze-image',
    auth: true,
    params: [
      { name: 'imageUrl', type: 'string', required: true, description: 'Base64 or URL of the image to analyze' },
    ],
    responseExample: `{
  "analysis": {
    "colors": ["#000000", "#3B82F6", "#FFFFFF"],
    "layout": "Single column with hero section",
    "style": "Modern minimal",
    "prompt": "Recreate this design with..."
  }
}`,
  },
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'badge-get',
  POST: 'badge-post',
  PUT: 'badge-put',
  DELETE: 'badge-delete',
  PATCH: 'badge-patch',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-white/20 hover:text-white/50 transition-colors text-xs"
      title="Copy to clipboard"
    >
      <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`} />
    </button>
  );
}

export default function ApiReferencePage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'generate';
  const endpoint = ENDPOINTS[slug] || ENDPOINTS['generate'];

  // Find current group for sidebar highlighting
  const currentGroup = API_GROUPS.find((g) => g.endpoints.some((e) => e.slug === slug));

  return (
    <div className="min-h-screen bg-obsidian">
      <Header />

      <div className="pt-16">
        <div className="max-w-[1400px] mx-auto flex">
          {/* ===== LEFT SIDEBAR ===== */}
          <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-white/[0.04] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
            <div className="mb-6">
              <h3 className="text-xs font-mono uppercase tracking-wider text-white/20 px-2">API Reference</h3>
            </div>
            <nav className="space-y-6">
              {API_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-white/30">
                    <i className={`fa-solid ${group.icon} text-[10px] w-4 text-center`} />
                    <span>{group.title}</span>
                  </div>
                  <div className="mt-1 ml-2 space-y-0.5">
                    {group.endpoints.map((ep) => (
                      <Link
                        key={ep.slug}
                        href={`/api-reference/${ep.slug}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                          ep.slug === slug
                            ? 'text-white bg-accent/[0.08]'
                            : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${METHOD_COLORS[ep.method]} !border-0`}>
                          {ep.method}
                        </span>
                        <span className="truncate">{ep.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <main className="flex-1 min-w-0 px-6 lg:px-12 py-8 max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-white/25 mb-6">
              <Link href="/api-reference/generate" className="hover:text-white/40 transition-colors">API Reference</Link>
              {currentGroup && (
                <>
                  <i className="fa-solid fa-chevron-right text-[8px]" />
                  <span>{currentGroup.title}</span>
                </>
              )}
              <i className="fa-solid fa-chevron-right text-[8px]" />
              <span className="text-white/40">{endpoint.title}</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              key={slug}
            >
              {/* Title & Method */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${METHOD_COLORS[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                  {endpoint.title}
                </h1>
              </div>

              <p className="text-white/35 text-base mb-6">{endpoint.description}</p>

              {/* Endpoint URL */}
              <div className="code-block flex items-center gap-3 px-4 py-3 mb-8">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${METHOD_COLORS[endpoint.method]} !border-0`}>
                  {endpoint.method}
                </span>
                <code className="text-white/60 text-sm font-mono flex-1">{endpoint.path}</code>
                <CopyButton text={endpoint.path} />
              </div>

              {/* Auth info */}
              {endpoint.auth && (
                <div className="glass-card rounded-xl p-4 mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <i className="fa-solid fa-lock text-amber-400 text-xs" />
                  </div>
                  <div>
                    <span className="text-white/60 text-sm font-medium">Authentication Required</span>
                    <p className="text-white/25 text-xs">Pass Firebase auth token in the request. User must be signed in.</p>
                  </div>
                </div>
              )}

              {/* Parameters */}
              {endpoint.params && endpoint.params.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display text-lg font-semibold text-white mb-4">Parameters</h2>
                  <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-3 px-4 text-white/40 text-xs font-mono font-medium">Name</th>
                          <th className="text-left py-3 px-4 text-white/40 text-xs font-mono font-medium">Type</th>
                          <th className="text-left py-3 px-4 text-white/40 text-xs font-mono font-medium">Required</th>
                          <th className="text-left py-3 px-4 text-white/40 text-xs font-mono font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.params.map((param) => (
                          <tr key={param.name} className="border-b border-white/[0.03]">
                            <td className="py-3 px-4">
                              <code className="text-accent text-xs font-mono bg-accent/[0.06] px-1.5 py-0.5 rounded">{param.name}</code>
                            </td>
                            <td className="py-3 px-4 text-white/30 text-xs font-mono">{param.type}</td>
                            <td className="py-3 px-4">
                              {param.required ? (
                                <span className="text-amber-400 text-[10px] font-mono font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">Required</span>
                              ) : (
                                <span className="text-white/20 text-[10px] font-mono">Optional</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-white/40 text-xs">{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Example */}
              {endpoint.bodyExample && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-lg font-semibold text-white">Request Body</h2>
                    <CopyButton text={endpoint.bodyExample} />
                  </div>
                  <div className="code-block p-4 overflow-x-auto">
                    <div className="text-[10px] text-white/20 font-mono mb-2">JSON</div>
                    <pre className="text-white/50 text-sm font-mono leading-relaxed">{endpoint.bodyExample}</pre>
                  </div>
                </div>
              )}

              {/* Response Example */}
              {endpoint.responseExample && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-lg font-semibold text-white">Response</h2>
                    <CopyButton text={endpoint.responseExample} />
                  </div>
                  <div className="code-block p-4 overflow-x-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">200 OK</span>
                      <span className="text-[10px] text-white/20 font-mono">JSON</span>
                    </div>
                    <pre className="text-white/50 text-sm font-mono leading-relaxed">{endpoint.responseExample}</pre>
                  </div>
                </div>
              )}

              {/* Notes */}
              {endpoint.notes && (
                <div className="glass-card rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fa-solid fa-circle-info text-blue-400 text-xs" />
                  </div>
                  <div>
                    <span className="text-white/60 text-sm font-medium block mb-1">Note</span>
                    <p className="text-white/35 text-sm">{endpoint.notes}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/[0.04]">
              {(() => {
                const allEndpoints = API_GROUPS.flatMap((g) => g.endpoints);
                const currentIndex = allEndpoints.findIndex((ep) => ep.slug === slug);
                const prev = currentIndex > 0 ? allEndpoints[currentIndex - 1] : null;
                const next = currentIndex < allEndpoints.length - 1 ? allEndpoints[currentIndex + 1] : null;
                return (
                  <>
                    {prev ? (
                      <Link href={`/api-reference/${prev.slug}`} className="group text-left">
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">Previous</span>
                        <span className="block text-sm text-white/50 group-hover:text-white transition-colors">
                          <i className="fa-solid fa-arrow-left text-[10px] mr-2" />
                          {prev.title}
                        </span>
                      </Link>
                    ) : <div />}
                    {next ? (
                      <Link href={`/api-reference/${next.slug}`} className="group text-right">
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
        </div>
      </div>

      <Footer />
    </div>
  );
}
