'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/*
  Studio Template Node Structure — exact replica:
  Node 1: Photo Upload
  Node 2: Text Prompt
  Node 3: Image Generation
  Node 4: Text Prompt (video)
  Node 5: Video Generation
  All connected with animated bezier edges + travelling data dots
*/

// ===== NODE DEFINITIONS — The 5-step pipeline + branching =====
const NODES = [
  // Row 1: Main pipeline
  { id: 'upload', type: 'imageUpload', label: 'Photo Upload', icon: 'fa-cloud-arrow-up', color: 'from-emerald-500/40 to-teal-500/40', accent: '#34d399', x: 0, y: 180 },
  { id: 'text-1', type: 'textPrompt', label: 'Style Prompt', icon: 'fa-keyboard', color: 'from-violet-500/40 to-purple-500/40', accent: '#a78bfa', x: 220, y: 60, prompt: 'Cinematic hero shot, dramatic studio lighting, 8K resolution' },
  { id: 'text-2', type: 'textPrompt', label: 'Angle Prompt', icon: 'fa-keyboard', color: 'from-violet-500/40 to-purple-500/40', accent: '#a78bfa', x: 220, y: 200, prompt: '3/4 angle view, golden hour, product photography' },
  { id: 'text-3', type: 'textPrompt', label: 'Mood Prompt', icon: 'fa-keyboard', color: 'from-violet-500/40 to-purple-500/40', accent: '#a78bfa', x: 220, y: 340, prompt: 'Minimal white backdrop, clean e-commerce style' },

  // Image Generation nodes
  { id: 'img-1', type: 'imageGen', label: 'Hero Image', icon: 'fa-image', color: 'from-blue-500/40 to-cyan-500/40', accent: '#60a5fa', x: 460, y: 0 },
  { id: 'img-2', type: 'imageGen', label: '3/4 Angle Shot', icon: 'fa-image', color: 'from-blue-500/40 to-cyan-500/40', accent: '#60a5fa', x: 460, y: 140 },
  { id: 'img-3', type: 'imageGen', label: 'Clean Product', icon: 'fa-image', color: 'from-blue-500/40 to-cyan-500/40', accent: '#60a5fa', x: 460, y: 280 },

  // Video prompt
  { id: 'text-vid', type: 'textPrompt', label: 'Video Prompt', icon: 'fa-keyboard', color: 'from-amber-500/40 to-orange-500/40', accent: '#fbbf24', x: 460, y: 420, prompt: 'Smooth 360° rotation, luxury reveal, 5s' },

  // Video Generation
  { id: 'video-1', type: 'videoGen', label: 'Promo Video', icon: 'fa-video', color: 'from-rose-500/40 to-pink-500/40', accent: '#fb7185', x: 700, y: 200 },
  { id: 'video-2', type: 'videoGen', label: 'Story Video', icon: 'fa-video', color: 'from-rose-500/40 to-pink-500/40', accent: '#fb7185', x: 700, y: 380 },
];

// ===== EDGE DEFINITIONS =====
const EDGES = [
  // Upload → each text prompt
  { from: 'upload', to: 'text-1' },
  { from: 'upload', to: 'text-2' },
  { from: 'upload', to: 'text-3' },
  // Text → Image Gen
  { from: 'text-1', to: 'img-1' },
  { from: 'text-2', to: 'img-2' },
  { from: 'text-3', to: 'img-3' },
  // Upload → Video prompt
  { from: 'upload', to: 'text-vid' },
  // Image Gens → Videos
  { from: 'img-1', to: 'video-1' },
  { from: 'img-2', to: 'video-1' },
  { from: 'text-vid', to: 'video-2' },
  { from: 'img-3', to: 'video-2' },
];

const NODE_W = 195;
const NODE_H = 90;

function getNodeCenter(id: string, side: 'left' | 'right') {
  const node = NODES.find(n => n.id === id);
  if (!node) return { x: 0, y: 0 };
  return {
    x: side === 'right' ? node.x + NODE_W : node.x,
    y: node.y + NODE_H / 2,
  };
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cx2 = x2 - (x2 - x1) * 0.5;
  return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
}

export default function WorkflowDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const edgePaths = EDGES.map((edge, i) => {
    const from = getNodeCenter(edge.from, 'right');
    const to = getNodeCenter(edge.to, 'left');
    return { path: bezier(from.x, from.y, to.x, to.y), key: `e-${i}`, from: edge.from, to: edge.to };
  });

  const svgW = 920;
  const svgH = 520;

  return (
    <div ref={ref} className="relative w-full overflow-x-auto overflow-y-visible pb-4" style={{ minHeight: svgH + 40 }}>
      <div className="relative mx-auto" style={{ width: svgW, height: svgH }}>
        {/* ===== SVG CONNECTIONS (behind nodes) ===== */}
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="absolute inset-0"
          style={{ zIndex: 0 }}
        >
          {/* Defs for gradient strokes and glow */}
          <defs>
            <linearGradient id="edge-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="edge-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edgePaths.map((edge, i) => {
            const isVideoEdge = edge.to.startsWith('video');
            return (
              <g key={edge.key}>
                {/* Glow layer */}
                <motion.path
                  d={edge.path}
                  fill="none"
                  stroke={isVideoEdge ? "url(#edge-gradient-2)" : "url(#edge-gradient-1)"}
                  strokeWidth={4}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 0.6 } : {}}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: 'easeInOut' }}
                  filter="url(#glow)"
                />
                {/* Main edge line */}
                <motion.path
                  d={edge.path}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeInOut' }}
                />
                {/* Travelling dot — data flow pulse */}
                {inView && (
                  <>
                    <circle r="3" fill="rgba(255,255,255,0.7)" opacity="0.8" filter="url(#glow)">
                      <animateMotion dur={`${2.5 + (i % 3) * 0.6}s`} repeatCount="indefinite" path={edge.path} begin={`${0.5 + i * 0.2}s`} />
                    </circle>
                    <circle r="1.5" fill="rgba(167,139,250,0.6)" opacity="0.5">
                      <animateMotion dur={`${3.5 + (i % 2) * 0.4}s`} repeatCount="indefinite" path={edge.path} begin={`${1.5 + i * 0.15}s`} />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* ===== NODES (styled exactly like studio nodes) ===== */}
        {NODES.map((node, i) => (
          <motion.div
            key={node.id}
            className="absolute"
            style={{ left: node.x, top: node.y, width: NODE_W, zIndex: 1 }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="rounded-xl overflow-hidden border border-white/[0.12] bg-[#141418] shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.2)' }}
              transition={{ duration: 0.2 }}
            >
              {/* Colored header — studio node headers */}
              <div className={`px-3 py-2.5 bg-gradient-to-r ${node.color} border-b border-white/[0.06] flex items-center gap-2`}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: node.accent + '25' }}>
                  <i className={`fa-solid ${node.icon} text-[10px]`} style={{ color: node.accent }} />
                </div>
                <span className="text-white/90 text-[11px] font-bold tracking-wide">{node.label}</span>
              </div>

              {/* Body — node-type specific content */}
              <div className="px-3 py-2.5">
                {node.type === 'imageUpload' && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-dashed border-white/[0.12] flex items-center justify-center">
                      <i className="fa-solid fa-plus text-[8px] text-white/20" />
                    </div>
                    <span className="text-white/30 text-[10px]">Drop image here</span>
                  </div>
                )}
                {node.type === 'textPrompt' && (
                  <div className="bg-black/50 rounded-lg px-2.5 py-1.5 border border-white/[0.06]">
                    <span className="text-white/30 text-[9px] font-mono leading-tight block truncate">
                      {(node as any).prompt || '...'}
                    </span>
                  </div>
                )}
                {node.type === 'imageGen' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-white/25 font-mono bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">Flux Pro</span>
                    <span className="text-[8px] text-white/25 font-mono bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">1024px</span>
                  </div>
                )}
                {node.type === 'videoGen' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-white/25 font-mono bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/15">Veo 3.0</span>
                    <span className="text-[8px] text-white/25 font-mono bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">5s</span>
                  </div>
                )}
              </div>

              {/* Handles (input/output dots) */}
              <div className="flex items-center justify-between px-3 pb-2">
                {node.type !== 'imageUpload' && (
                  <div className="flex items-center gap-1">
                    <div className="w-[7px] h-[7px] rounded-full bg-white/25 border border-white/15" />
                    <span className="text-[7px] font-mono text-white/20">in</span>
                  </div>
                )}
                {node.type === 'imageUpload' && <div />}
                <div className="flex items-center gap-1">
                  <span className="text-[7px] font-mono text-white/20">
                    {node.type === 'videoGen' || node.type === 'imageGen' ? 'output' : 'out'}
                  </span>
                  <div className="w-[7px] h-[7px] rounded-full border"
                    style={{
                      background: node.accent + '30',
                      borderColor: node.accent + '25',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}

        {/* Pipeline label overlays */}
        <motion.div
          className="absolute text-[10px] font-mono text-white/15 tracking-widest uppercase"
          style={{ left: 30, top: svgH - 20 }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
        >
          Upload → Prompt → Generate → Create Video
        </motion.div>
      </div>
    </div>
  );
}
