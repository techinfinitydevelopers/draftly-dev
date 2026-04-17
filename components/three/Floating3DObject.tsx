'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Floating3DObject — A rotating 3D shape (wireframe) for visual flair
 * Used alongside text sections on the homepage.
 */

function RotatingTorus({ color, speed = 0.3, size = 1.6 }: { color: string; speed?: number; size?: number }) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x = t * speed * 0.7;
        ref.current.rotation.y = t * speed;
        ref.current.rotation.z = t * speed * 0.3;
    });
    return (
        <mesh ref={ref}>
            <torusGeometry args={[size, size * 0.25, 20, 48]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
        </mesh>
    );
}

function RotatingOctahedron({ color, speed = 0.25, size = 1.8 }: { color: string; speed?: number; size?: number }) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x = t * speed;
        ref.current.rotation.y = t * speed * 0.6;
    });
    return (
        <mesh ref={ref}>
            <octahedronGeometry args={[size, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
        </mesh>
    );
}

function RotatingIcosahedron({ color, speed = 0.2, size = 1.6 }: { color: string; speed?: number; size?: number }) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x = t * speed * 0.5;
        ref.current.rotation.y = t * speed;
        ref.current.rotation.z = Math.sin(t * 0.3) * 0.2;
    });
    return (
        <mesh ref={ref}>
            <icosahedronGeometry args={[size, 1]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.08} />
        </mesh>
    );
}

function RotatingDodecahedron({ color, speed = 0.15, size = 1.5 }: { color: string; speed?: number; size?: number }) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x = t * speed;
        ref.current.rotation.y = t * speed * 1.2;
        ref.current.rotation.z = Math.cos(t * 0.2) * 0.15;
    });
    return (
        <mesh ref={ref}>
            <dodecahedronGeometry args={[size, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
        </mesh>
    );
}

function RotatingTorusKnot({ color, speed = 0.18, size = 1.2 }: { color: string; speed?: number; size?: number }) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x = t * speed * 0.4;
        ref.current.rotation.y = t * speed;
    });
    return (
        <mesh ref={ref}>
            <torusKnotGeometry args={[size, size * 0.3, 80, 12]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.08} />
        </mesh>
    );
}

type ShapeType = 'torus' | 'octahedron' | 'icosahedron' | 'dodecahedron' | 'torusKnot';

interface Floating3DProps {
    shape?: ShapeType;
    color?: string;
    speed?: number;
    size?: number;
    className?: string;
}

function ShapeRenderer({ shape, color, speed, size }: { shape: ShapeType; color: string; speed: number; size: number }) {
    switch (shape) {
        case 'torus': return <RotatingTorus color={color} speed={speed} size={size} />;
        case 'octahedron': return <RotatingOctahedron color={color} speed={speed} size={size} />;
        case 'icosahedron': return <RotatingIcosahedron color={color} speed={speed} size={size} />;
        case 'dodecahedron': return <RotatingDodecahedron color={color} speed={speed} size={size} />;
        case 'torusKnot': return <RotatingTorusKnot color={color} speed={speed} size={size} />;
    }
}

export default function Floating3DObject({
    shape = 'torus',
    color = '#a78bfa',
    speed = 0.25,
    size = 1.6,
    className = '',
}: Floating3DProps) {
    return (
        <div className={`pointer-events-none ${className}`} style={{ width: '100%', height: '100%' }}>
            <Canvas
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
                camera={{ fov: 45, near: 0.1, far: 50, position: [0, 0, 6] }}
            >
                <ShapeRenderer shape={shape} color={color} speed={speed} size={size} />
            </Canvas>
        </div>
    );
}
