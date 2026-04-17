'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ===== ANIMATED NODE NETWORK BACKGROUND =====
// Inspired by the Studio's agentic node system — floating nodes with
// travelling-dot connections, just like AnimatedEdge in the studio.

interface NodeDef {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  color: string;
}

const NODE_LABELS = [
  'Prompt', 'Image Gen', 'Video', 'Upscale', 'Remove BG',
  'Variation', 'Preview', 'Upload', 'Export', 'Filter',
  'Flux', 'Gemini', 'Kling', 'SDXL', 'Luma',
];

const NODE_COLORS = [
  'rgba(139,92,246,0.3)',   // violet
  'rgba(59,130,246,0.3)',   // blue
  'rgba(236,72,153,0.3)',   // pink
  'rgba(16,185,129,0.3)',   // emerald
  'rgba(245,158,11,0.3)',   // amber
  'rgba(6,182,212,0.3)',    // cyan
];

export default function NodeNetwork({ className = '' }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [dims, setDims] = useState({ w: 1200, h: 800 });

  // Create initial nodes
  const nodesRef = useRef<NodeDef[]>([]);

  useEffect(() => {
    const updateDims = () => {
      setDims({ w: window.innerWidth, h: window.innerHeight });
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  useEffect(() => {
    if (nodesRef.current.length > 0) return;
    const nodes: NodeDef[] = [];
    const count = Math.min(18, Math.max(10, Math.floor(dims.w / 100)));
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: i,
        x: Math.random() * dims.w,
        y: Math.random() * dims.h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 28 + Math.random() * 16,
        label: NODE_LABELS[i % NODE_LABELS.length],
        color: NODE_COLORS[i % NODE_COLORS.length],
      });
    }
    nodesRef.current = nodes;
  }, [dims]);

  // Mouse tracking
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Animation loop
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let frame: number;
    const animate = () => {
      const nodes = nodesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Move nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Mouse repulsion
        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) * 0.0003;
          node.vx += dx * force;
          node.vy += dy * force;
        }

        // Damping
        node.vx *= 0.998;
        node.vy *= 0.998;

        // Bounds
        if (node.x < -50) node.x = dims.w + 50;
        if (node.x > dims.w + 50) node.x = -50;
        if (node.y < -50) node.y = dims.h + 50;
        if (node.y > dims.h + 50) node.y = -50;
      }

      // Update SVG elements
      const nodeEls = svg.querySelectorAll('.node-g');
      nodeEls.forEach((el, i) => {
        if (nodes[i]) {
          (el as SVGGElement).setAttribute('transform', `translate(${nodes[i].x}, ${nodes[i].y})`);
        }
      });

      // Update connections
      const lineEls = svg.querySelectorAll('.conn-line');
      const dotEls = svg.querySelectorAll('.conn-dot');
      let li = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ddx = nodes[i].x - nodes[j].x;
          const ddy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 250 && li < lineEls.length) {
            const opacity = Math.max(0, (1 - d / 250) * 0.15);
            const line = lineEls[li] as SVGPathElement;
            const dot = dotEls[li] as SVGCircleElement;

            // Bezier curve (like studio edges)
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2 - d * 0.1;
            const path = `M${nodes[i].x},${nodes[i].y} Q${midX},${midY} ${nodes[j].x},${nodes[j].y}`;

            line.setAttribute('d', path);
            line.setAttribute('opacity', String(opacity));
            line.style.display = '';

            // Travelling dot animation
            if (dot) {
              const animMotion = dot.querySelector('animateMotion');
              if (animMotion) {
                animMotion.setAttribute('path', path);
              }
              dot.setAttribute('opacity', String(opacity * 2.5));
              dot.style.display = '';
            }

            li++;
          }
        }
      }
      // Hide unused
      for (let k = li; k < lineEls.length; k++) {
        (lineEls[k] as SVGPathElement).style.display = 'none';
        if (dotEls[k]) (dotEls[k] as SVGCircleElement).style.display = 'none';
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [dims]);

  const maxConnections = 50;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0"
      >
        {/* Connection lines (bezier curves with travelling dots, like AnimatedEdge) */}
        {Array.from({ length: maxConnections }).map((_, i) => (
          <g key={`conn-${i}`}>
            <path
              className="conn-line"
              d="M0,0 Q0,0 0,0"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              style={{ display: 'none' }}
            />
            <circle
              className="conn-dot"
              r="1.5"
              fill="rgba(255,255,255,0.4)"
              style={{ display: 'none' }}
            >
              <animateMotion dur="4s" repeatCount="indefinite" path="M0,0 Q0,0 0,0" />
            </circle>
          </g>
        ))}

        {/* Nodes (styled like studio node headers) */}
        {nodesRef.current.map((node) => (
          <g key={node.id} className="node-g" transform={`translate(${node.x}, ${node.y})`}>
            {/* Node body */}
            <rect
              x={-node.radius}
              y={-node.radius * 0.5}
              width={node.radius * 2}
              height={node.radius}
              rx="8"
              fill="rgba(20,20,20,0.6)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            {/* Color accent bar (like studio node headers) */}
            <rect
              x={-node.radius}
              y={-node.radius * 0.5}
              width={node.radius * 2}
              height="3"
              rx="8"
              fill={node.color}
            />
            {/* Label text */}
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fill="rgba(255,255,255,0.25)"
              fontSize="8"
              fontFamily="monospace"
            >
              {node.label}
            </text>
            {/* Input handle (left) */}
            <circle cx={-node.radius} cy="0" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Output handle (right) */}
            <circle cx={node.radius} cy="0" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </g>
        ))}
      </svg>
    </div>
  );
}
