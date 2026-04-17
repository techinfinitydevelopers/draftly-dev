'use client';

import { useEffect, useRef, useState } from 'react';

const TRAIL_LENGTH = 8;
const TRAIL_SPRING = 0.25; // lower = more fluid/laggy
const MAIN_SPRING = 0.35;

interface Point {
    x: number;
    y: number;
}

export default function LiquidCursor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<Point>({ x: -100, y: -100 });
    const trailRef = useRef<Point[]>(Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 })));
    const mainRef = useRef<Point>({ x: -100, y: -100 });
    const rafRef = useRef<number>(0);
    const [isVisible, setIsVisible] = useState(false);
    const hoveringInteractive = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
            if (!isVisible) setIsVisible(true);

            // Check if hovering over interactive element
            const target = e.target as HTMLElement;
            const interactive = target.closest('a, button, input, textarea, select, [role="button"], .react-flow__node');
            hoveringInteractive.current = !!interactive;
        };

        const onMouseLeave = () => {
            mouseRef.current = { x: -200, y: -200 };
            setIsVisible(false);
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseleave', onMouseLeave);

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mouse = mouseRef.current;

            // Smoothly move main dot toward mouse
            mainRef.current.x += (mouse.x - mainRef.current.x) * MAIN_SPRING;
            mainRef.current.y += (mouse.y - mainRef.current.y) * MAIN_SPRING;

            // Each trail point follows the one before it
            const trail = trailRef.current;
            trail[0].x += (mainRef.current.x - trail[0].x) * TRAIL_SPRING;
            trail[0].y += (mainRef.current.y - trail[0].y) * TRAIL_SPRING;
            for (let i = 1; i < TRAIL_LENGTH; i++) {
                trail[i].x += (trail[i - 1].x - trail[i].x) * (TRAIL_SPRING * 0.85);
                trail[i].y += (trail[i - 1].y - trail[i].y) * (TRAIL_SPRING * 0.85);
            }

            const isHovering = hoveringInteractive.current;

            // Draw liquid trail (back to front)
            for (let i = TRAIL_LENGTH - 1; i >= 0; i--) {
                const t = 1 - i / TRAIL_LENGTH;
                const radius = isHovering
                    ? 3 + t * 8
                    : 4 + t * 14;
                const alpha = t * (isHovering ? 0.06 : 0.1);

                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
                ctx.fill();
            }

            // Draw connections between trail points (liquid bridges)
            if (mouse.x > 0 && mouse.y > 0) {
                ctx.beginPath();
                ctx.moveTo(mainRef.current.x, mainRef.current.y);
                for (let i = 0; i < TRAIL_LENGTH; i++) {
                    const t = 1 - i / TRAIL_LENGTH;
                    ctx.lineTo(trail[i].x, trail[i].y);
                    ctx.lineWidth = t * (isHovering ? 3 : 6);
                }
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.04)';
                ctx.stroke();
            }

            // Draw main cursor blob
            const mainSize = isHovering ? 20 : 12;

            // Outer glow
            const gradient = ctx.createRadialGradient(
                mainRef.current.x, mainRef.current.y, 0,
                mainRef.current.x, mainRef.current.y, mainSize * 2.5
            );
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
            gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.beginPath();
            ctx.arc(mainRef.current.x, mainRef.current.y, mainSize * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Inner blob
            ctx.beginPath();
            ctx.arc(mainRef.current.x, mainRef.current.y, mainSize, 0, Math.PI * 2);
            ctx.fillStyle = isHovering
                ? 'rgba(167, 139, 250, 0.15)'
                : 'rgba(167, 139, 250, 0.12)';
            ctx.fill();

            // Core dot
            ctx.beginPath();
            ctx.arc(mainRef.current.x, mainRef.current.y, isHovering ? 4 : 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();

            // Ring on hover
            if (isHovering) {
                ctx.beginPath();
                ctx.arc(mainRef.current.x, mainRef.current.y, mainSize + 4, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [isVisible]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[9999] pointer-events-none"
            style={{ cursor: 'none' }}
        />
    );
}
