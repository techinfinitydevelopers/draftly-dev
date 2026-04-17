'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom cursor — replaces the default arrow with a glowing dot + trailing ring.
 * The dot follows the mouse exactly while the ring trails slightly behind.
 */
export default function CustomCursor() {
    const dotRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const pos = useRef({ x: -100, y: -100 });
    const targetPos = useRef({ x: -100, y: -100 });

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            targetPos.current = { x: e.clientX, y: e.clientY };
        };

        const animate = () => {
            // Dot follows exactly
            pos.current.x += (targetPos.current.x - pos.current.x) * 0.35;
            pos.current.y += (targetPos.current.y - pos.current.y) * 0.35;

            if (dotRef.current) {
                dotRef.current.style.transform = `translate(${targetPos.current.x - 4}px, ${targetPos.current.y - 4}px)`;
            }
            if (ringRef.current) {
                ringRef.current.style.transform = `translate(${pos.current.x - 18}px, ${pos.current.y - 18}px)`;
            }
            requestAnimationFrame(animate);
        };

        // Hover effects — make ring bigger on interactive elements
        const handleMouseEnter = () => {
            if (ringRef.current) {
                ringRef.current.style.width = '52px';
                ringRef.current.style.height = '52px';
                ringRef.current.style.borderColor = 'rgba(255,255,255,0.4)';
                ringRef.current.style.transform = `translate(${pos.current.x - 26}px, ${pos.current.y - 26}px)`;
            }
            if (dotRef.current) {
                dotRef.current.style.opacity = '0.6';
            }
        };

        const handleMouseLeave = () => {
            if (ringRef.current) {
                ringRef.current.style.width = '36px';
                ringRef.current.style.height = '36px';
                ringRef.current.style.borderColor = 'rgba(255,255,255,0.15)';
            }
            if (dotRef.current) {
                dotRef.current.style.opacity = '1';
            }
        };

        window.addEventListener('mousemove', moveCursor, { passive: true });
        const raf = requestAnimationFrame(animate);

        // Add hover listeners to interactive elements
        const interactives = document.querySelectorAll('a, button, [role="button"], input, textarea, select, .glass-card, .react-flow__node');
        interactives.forEach((el) => {
            el.addEventListener('mouseenter', handleMouseEnter);
            el.addEventListener('mouseleave', handleMouseLeave);
        });

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            cancelAnimationFrame(raf);
            interactives.forEach((el) => {
                el.removeEventListener('mouseenter', handleMouseEnter);
                el.removeEventListener('mouseleave', handleMouseLeave);
            });
        };
    }, []);

    return (
        <>
            {/* Small glowing dot */}
            <div
                ref={dotRef}
                className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference"
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'opacity 0.2s',
                }}
            />
            {/* Trailing ring */}
            <div
                ref={ringRef}
                className="fixed top-0 left-0 z-[9998] pointer-events-none"
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1), height 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s',
                }}
            />
        </>
    );
}
