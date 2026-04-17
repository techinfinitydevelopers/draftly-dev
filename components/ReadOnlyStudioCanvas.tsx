'use client';

/**
 * ReadOnlyStudioCanvas — Full-screen, no box.
 * preventScrolling={false} allows page scroll to pass through.
 * Nodes are spread very wide to fill the entire screen.
 */

import { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    BackgroundVariant,
    type Node,
    type Edge,
    type OnNodesChange,
    applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TextPromptNode from '@/components/studio/nodes/TextPromptNode';
import ImageUploadNode from '@/components/studio/nodes/ImageUploadNode';
import ImageGenNode from '@/components/studio/nodes/ImageGenNode';
import ImageVariationNode from '@/components/studio/nodes/ImageVariationNode';
import VideoGenNode from '@/components/studio/nodes/VideoGenNode';
import UpscaleNode from '@/components/studio/nodes/UpscaleNode';
import RemoveBGNode from '@/components/studio/nodes/RemoveBGNode';
import PreviewNode from '@/components/studio/nodes/PreviewNode';
import AnimatedEdge from '@/components/studio/edges/AnimatedEdge';

const nodeTypes = {
    textPrompt: TextPromptNode,
    imageUpload: ImageUploadNode,
    imageGen: ImageGenNode,
    imageVariation: ImageVariationNode,
    videoGen: VideoGenNode,
    upscale: UpscaleNode,
    removeBG: RemoveBGNode,
    preview: PreviewNode,
};

const edgeTypes = {
    animatedEdge: AnimatedEdge,
};

function buildQuickImage5Template(): { nodes: Node[]; edges: Edge[] } {
    const angles = [
        { label: 'Hero Front', prompt: 'Front-facing hero shot, centered composition, studio lighting, clean background, product photography, 8K' },
        { label: '3/4 Angle', prompt: 'Three-quarter angle view, slight tilt, dramatic side lighting, cinematic depth of field, commercial photography' },
        { label: 'Top Down', prompt: 'Flat lay top-down overhead view, symmetrical composition, soft even lighting, catalog style' },
    ];

    // ── Full-screen centered: 3 rows, wide columns for 16:9 ──
    const COL_UPLOAD = -700;
    const COL_TP = 0;
    const COL_IMG = 700;
    const ROW = 320;

    const nodes: Node[] = [
        {
            id: 'demo-upload',
            type: 'imageUpload',
            position: { x: COL_UPLOAD, y: 1 * ROW },
            data: { label: 'Upload Product Image', imageUrl: null, fileName: null },
        },
    ];
    const edges: Edge[] = [];

    angles.forEach((a, i) => {
        const genId = `demo-img-${i}`;
        nodes.push({
            id: `demo-tp-${i}`,
            type: 'textPrompt',
            position: { x: COL_TP, y: i * ROW },
            data: { label: a.label, prompt: a.prompt, style: 'cinematic' },
        });
        nodes.push({
            id: genId,
            type: 'imageGen',
            position: { x: COL_IMG, y: i * ROW },
            data: {
                label: a.label,
                model: 'nano-banana-pro',
                provider: 'api-easy',
                aspectRatio: '1:1',
                numOutputs: 1,
                guidanceScale: 7.5,
                outputImages: [],
                isRunning: false,
                error: null,
            },
        });
        // Upload → Text Prompt → Image Gen (correct flow: photo → text → output)
        edges.push({ id: `demo-eu-${i}`, source: 'demo-upload', target: `demo-tp-${i}`, animated: true, type: 'animatedEdge' });
        edges.push({ id: `demo-ep-${i}`, source: `demo-tp-${i}`, target: genId, animated: true, type: 'animatedEdge' });
    });

    return { nodes, edges };
}

export default function ReadOnlyStudioCanvas() {
    const template = useMemo(() => buildQuickImage5Template(), []);
    const [nodes, setNodes] = useState<Node[]>(template.nodes);
    const edges = useMemo(() => template.edges, [template.edges]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            const posChanges = changes.filter((c) => c.type === 'position' || c.type === 'dimensions');
            if (posChanges.length > 0) {
                setNodes((nds) => applyNodeChanges(posChanges, nds));
            }
        },
        [],
    );

    return (
        <div
            className="w-full relative"
            style={{ height: '100vh', background: 'transparent' }}
            data-nosnippet
            aria-hidden="true"
        >
            {/* Top gradient bleed */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050508] to-transparent z-10 pointer-events-none" />
            {/* Bottom gradient bleed */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050508] to-transparent z-10 pointer-events-none" />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{ animated: true, type: 'animatedEdge' }}
                fitView
                fitViewOptions={{ padding: 0.05, minZoom: 0.5, maxZoom: 0.9 }}
                proOptions={{ hideAttribution: true }}
                className="studio-canvas"
                minZoom={0.3}
                maxZoom={1.5}
                nodesConnectable={false}
                edgesReconnectable={false}
                deleteKeyCode={null}
                nodesDraggable={true}
                panOnDrag={true}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                preventScrolling={false}
                selectionOnDrag={false}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={32}
                    size={1}
                    color="rgba(255,255,255,0.03)"
                />
                <Controls
                    className="!bg-black/60 !backdrop-blur-xl !border-white/10 !rounded-xl !shadow-xl [&>button]:!bg-black/40 [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10"
                    showInteractive={false}
                />
            </ReactFlow>

            {/* Overlay hint — bottom right, small */}
            <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
                <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/[0.08] text-[10px] text-white/40 font-mono">
                    <i className="fa-solid fa-hand mr-1.5" />
                    Drag to explore · Use controls to zoom
                </div>
            </div>
        </div>
    );
}
