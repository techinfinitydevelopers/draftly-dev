'use client';

import { motion } from 'framer-motion';

/**
 * MobileNodeFlow — A lightweight, vertical node-flow diagram
 * designed specifically for mobile phones. Shows the agentic
 * workflow in a portrait orientation with animated edges and
 * staggered node reveals.
 */

interface MobileNode {
    id: string;
    label: string;
    icon: string;
    accent: string;
    description?: string;
}

interface MobileEdge {
    from: string;
    to: string;
}

const mobileNodes: MobileNode[] = [
    { id: 'upload', label: 'Upload Photo', icon: 'fa-cloud-arrow-up', accent: '#34d399', description: 'Drop your image' },
    { id: 'prompt1', label: 'Hero Shot', icon: 'fa-keyboard', accent: '#a78bfa', description: 'Front-facing style' },
    { id: 'prompt2', label: '3/4 Angle', icon: 'fa-keyboard', accent: '#a78bfa', description: 'Cinematic angle' },
    { id: 'gen1', label: 'Image Gen', icon: 'fa-image', accent: '#60a5fa', description: 'AI generation' },
    { id: 'gen2', label: 'Image Gen', icon: 'fa-image', accent: '#60a5fa', description: 'AI generation' },
    { id: 'upscale', label: 'Upscale 4K', icon: 'fa-expand', accent: '#22d3ee', description: 'Real-ESRGAN' },
    { id: 'video', label: 'Video Gen', icon: 'fa-video', accent: '#fb7185', description: 'Veo 3.0' },
];

// Position layout — vertical flow branching pattern
// Coordinates in viewBox units
const nodePositions: Record<string, { x: number; y: number }> = {
    upload: { x: 110, y: 20 },
    prompt1: { x: 30, y: 130 },
    prompt2: { x: 190, y: 130 },
    gen1: { x: 30, y: 240 },
    gen2: { x: 190, y: 240 },
    upscale: { x: 30, y: 350 },
    video: { x: 190, y: 350 },
};

const mobileEdges: MobileEdge[] = [
    { from: 'upload', to: 'prompt1' },
    { from: 'upload', to: 'prompt2' },
    { from: 'prompt1', to: 'gen1' },
    { from: 'prompt2', to: 'gen2' },
    { from: 'gen1', to: 'upscale' },
    { from: 'gen2', to: 'video' },
];

const NODE_W = 100;
const NODE_H = 54;

function getNodeCenter(id: string) {
    const pos = nodePositions[id];
    return { cx: pos.x + NODE_W / 2, cy: pos.y + NODE_H / 2 };
}

export default function MobileNodeFlow() {
    return (
        <div className="w-full max-w-[340px] mx-auto relative" style={{ aspectRatio: '340/440' }}>
            <svg
                viewBox="0 0 320 440"
                width="100%"
                height="100%"
                className="overflow-visible"
                style={{ filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.08))' }}
            >
                {/* Animated edges */}
                {mobileEdges.map((e, i) => {
                    const s = getNodeCenter(e.from);
                    const t = getNodeCenter(e.to);
                    const midY = (s.cy + t.cy) / 2;
                    const pathD = `M ${s.cx} ${s.cy} C ${s.cx} ${midY}, ${t.cx} ${midY}, ${t.cx} ${t.cy}`;

                    return (
                        <g key={`${e.from}-${e.to}`}>
                            {/* Glow path */}
                            <motion.path
                                d={pathD}
                                fill="none"
                                stroke="rgba(255,255,255,0.03)"
                                strokeWidth={6}
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                            />
                            {/* Line */}
                            <motion.path
                                d={pathD}
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                whileInView={{ pathLength: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                            />
                            {/* Travelling dot */}
                            <circle r="2" fill="rgba(255,255,255,0.35)">
                                <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
                            </circle>
                        </g>
                    );
                })}
            </svg>

            {/* Node cards overlaid */}
            {mobileNodes.map((node, i) => {
                const pos = nodePositions[node.id];
                return (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, scale: 0.7, y: 15 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                            duration: 0.6,
                            delay: 0.1 + i * 0.08,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        className="absolute"
                        style={{
                            left: `${(pos.x / 320) * 100}%`,
                            top: `${(pos.y / 440) * 100}%`,
                            width: `${(NODE_W / 320) * 100}%`,
                        }}
                    >
                        <div className="bg-[#0c0c14]/90 backdrop-blur-md border border-white/[0.12] rounded-lg overflow-hidden shadow-xl">
                            {/* Header */}
                            <div
                                className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06]"
                                style={{ background: `linear-gradient(135deg, ${node.accent}18, transparent)` }}
                            >
                                <div
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                    style={{ background: node.accent + '25' }}
                                >
                                    <i
                                        className={`fa-solid ${node.icon} text-[7px]`}
                                        style={{ color: node.accent }}
                                    />
                                </div>
                                <span className="text-[8px] font-bold text-white/80 truncate leading-none">
                                    {node.label}
                                </span>
                            </div>
                            {/* Body */}
                            <div className="px-2 py-1.5">
                                <div className="text-[7px] text-white/35 mb-1 truncate">{node.description}</div>
                                <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: node.accent + '60' }}
                                        initial={{ width: 0 }}
                                        whileInView={{ width: '65%' }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.2, delay: 0.5 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
