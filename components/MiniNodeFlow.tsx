'use client';

import { motion } from 'framer-motion';

/**
 * MiniNodeFlow — an animated inline mini diagram that looks like real studio nodes
 * connected with edges. Used throughout the homepage to replace text-only sections
 * with visual node workflows.
 */

interface MiniNode {
    id: string;
    label: string;
    icon: string;
    color: string;    // tailwind text color
    accent: string;   // hex accent for gradient
    x: number;
    y: number;
}

interface MiniEdge {
    from: string;
    to: string;
}

interface MiniNodeFlowProps {
    nodes: MiniNode[];
    edges: MiniEdge[];
    width?: number;
    height?: number;
    className?: string;
    animationDelay?: number;
}

function getCenter(node: MiniNode) {
    return { cx: node.x + 65, cy: node.y + 28 };
}

export default function MiniNodeFlow({ nodes, edges, width = 600, height = 300, className = '', animationDelay = 0 }: MiniNodeFlowProps) {
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

    return (
        <div className={`relative ${className}`} style={{ width: '100%', maxWidth: width, height }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Animated edges */}
                {edges.map((e, i) => {
                    const from = nodeMap[e.from];
                    const to = nodeMap[e.to];
                    if (!from || !to) return null;
                    const s = getCenter(from);
                    const t = getCenter(to);
                    const midX = (s.cx + t.cx) / 2;

                    const pathD = `M ${s.cx} ${s.cy} C ${midX} ${s.cy}, ${midX} ${t.cy}, ${t.cx} ${t.cy}`;

                    return (
                        <g key={`${e.from}-${e.to}`}>
                            {/* Edge glow */}
                            <motion.path
                                d={pathD}
                                fill="none"
                                stroke="rgba(255,255,255,0.04)"
                                strokeWidth={4}
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, delay: animationDelay + i * 0.1 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                            />
                            {/* Edge line */}
                            <motion.path
                                d={pathD}
                                fill="none"
                                stroke="rgba(255,255,255,0.12)"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                whileInView={{ pathLength: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, delay: animationDelay + i * 0.1 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                            />
                            {/* Travelling dot */}
                            <circle r="2.5" fill="rgba(255,255,255,0.4)">
                                <animateMotion dur="3s" repeatCount="indefinite" path={pathD} />
                            </circle>
                        </g>
                    );
                })}
            </svg>

            {/* Node boxes overlaid on top */}
            {nodes.map((node, i) => (
                <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: animationDelay + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute"
                    style={{ left: node.x, top: node.y }}
                >
                    <div className="bg-[#0e0e14] border border-white/[0.12] rounded-lg overflow-hidden shadow-xl w-[130px] hover:border-white/[0.25] transition-all duration-300">
                        {/* Header */}
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/[0.06]"
                            style={{ background: `linear-gradient(135deg, ${node.accent}18, transparent)` }}
                        >
                            <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: node.accent + '25' }}>
                                <i className={`fa-solid ${node.icon} text-[7px]`} style={{ color: node.accent }} />
                            </div>
                            <span className="text-[9px] font-bold text-white/80 truncate">{node.label}</span>
                        </div>
                        {/* Body — mini visual */}
                        <div className="px-2.5 py-2">
                            <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: node.accent }}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: '70%' }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, delay: animationDelay + i * 0.12 + 0.5, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                            {/* Handle dots */}
                            <div className="flex justify-between mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ── Pre-built flow diagrams for homepage sections ──

export function TextToImageFlow() {
    return (
        <MiniNodeFlow
            width={500}
            height={120}
            nodes={[
                { id: 'prompt', label: 'Text Prompt', icon: 'fa-keyboard', color: 'text-violet-400', accent: '#a78bfa', x: 0, y: 20 },
                { id: 'gen', label: 'Image Gen', icon: 'fa-image', color: 'text-blue-400', accent: '#60a5fa', x: 180, y: 20 },
                { id: 'preview', label: 'Preview', icon: 'fa-eye', color: 'text-white/60', accent: '#9ca3af', x: 360, y: 20 },
            ]}
            edges={[
                { from: 'prompt', to: 'gen' },
                { from: 'gen', to: 'preview' },
            ]}
        />
    );
}

export function UploadPipelineFlow() {
    return (
        <MiniNodeFlow
            width={520}
            height={200}
            nodes={[
                { id: 'upload', label: 'Upload', icon: 'fa-upload', color: 'text-emerald-400', accent: '#34d399', x: 0, y: 70 },
                { id: 'rmbg', label: 'Remove BG', icon: 'fa-eraser', color: 'text-lime-400', accent: '#a3e635', x: 170, y: 10 },
                { id: 'upscale', label: 'Upscale 4K', icon: 'fa-expand', color: 'text-cyan-400', accent: '#22d3ee', x: 170, y: 130 },
                { id: 'video', label: 'Video Gen', icon: 'fa-video', color: 'text-rose-400', accent: '#fb7185', x: 370, y: 70 },
            ]}
            edges={[
                { from: 'upload', to: 'rmbg' },
                { from: 'upload', to: 'upscale' },
                { from: 'rmbg', to: 'video' },
                { from: 'upscale', to: 'video' },
            ]}
            animationDelay={0.2}
        />
    );
}

export function BranchingWorkflow() {
    return (
        <MiniNodeFlow
            width={540}
            height={260}
            nodes={[
                { id: 'upload', label: 'Upload', icon: 'fa-upload', color: 'text-emerald-400', accent: '#34d399', x: 0, y: 100 },
                { id: 'tp1', label: 'Hero Shot', icon: 'fa-keyboard', color: 'text-violet-400', accent: '#a78bfa', x: 180, y: 0 },
                { id: 'tp2', label: '3/4 Angle', icon: 'fa-keyboard', color: 'text-violet-400', accent: '#a78bfa', x: 180, y: 80 },
                { id: 'tp3', label: 'Top Down', icon: 'fa-keyboard', color: 'text-violet-400', accent: '#a78bfa', x: 180, y: 160 },
                { id: 'gen1', label: 'Gen 1', icon: 'fa-image', color: 'text-blue-400', accent: '#60a5fa', x: 380, y: 0 },
                { id: 'gen2', label: 'Gen 2', icon: 'fa-image', color: 'text-blue-400', accent: '#60a5fa', x: 380, y: 80 },
                { id: 'gen3', label: 'Gen 3', icon: 'fa-image', color: 'text-blue-400', accent: '#60a5fa', x: 380, y: 160 },
            ]}
            edges={[
                { from: 'upload', to: 'gen1' },
                { from: 'upload', to: 'gen2' },
                { from: 'upload', to: 'gen3' },
                { from: 'tp1', to: 'gen1' },
                { from: 'tp2', to: 'gen2' },
                { from: 'tp3', to: 'gen3' },
            ]}
            animationDelay={0.15}
        />
    );
}
