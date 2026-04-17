'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 200;

// ===== PARTICLES SYSTEM — Brighter, more alive =====
function Particles({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.Group>(null!);

  const { positions, velocities, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];
    const sizes = new Float32Array(PARTICLE_COUNT);

    const palette = [
      [0.65, 0.55, 0.98],  // violet
      [0.37, 0.83, 0.93],  // cyan
      [0.20, 0.83, 0.60],  // emerald
      [0.98, 0.44, 0.52],  // rose
      [0.38, 0.65, 0.98],  // blue
      [1.0, 1.0, 1.0],     // white
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.002
        )
      );

      sizes[i] = Math.random() * 2.5 + 0.8;

      // Random color from palette
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    return { positions, velocities, sizes, colors };
  }, []);

  const MAX_LINES = 60;

  useEffect(() => {
    const group = linesRef.current;
    if (!group) return;

    const palette = [
      new THREE.Color(0.65, 0.55, 0.98),
      new THREE.Color(0.37, 0.83, 0.93),
      new THREE.Color(0.20, 0.83, 0.60),
      new THREE.Color(0.98, 0.44, 0.52),
    ];

    for (let i = 0; i < MAX_LINES; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const lineObj = new THREE.Line(geo, mat);
      lineObj.visible = false;
      group.add(lineObj);
    }

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Line;
        group.remove(child);
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const mx = mouse.current.x * 2;
    const my = mouse.current.y * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      posArray[ix] += velocities[i].x + Math.sin(t * 0.15 + i * 0.3) * 0.002;
      posArray[iy] += velocities[i].y + Math.cos(t * 0.12 + i * 0.5) * 0.002;
      posArray[iz] += velocities[i].z + Math.sin(t * 0.08 + i * 0.7) * 0.001;

      const dx = posArray[ix] - mx;
      const dy = posArray[iy] - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 6) {
        const force = (6 - dist) * 0.003;
        posArray[ix] += dx * force;
        posArray[iy] += dy * force;
      }

      if (posArray[ix] > 18) posArray[ix] = -18;
      if (posArray[ix] < -18) posArray[ix] = 18;
      if (posArray[iy] > 28) posArray[iy] = -28;
      if (posArray[iy] < -28) posArray[iy] = 28;
      if (posArray[iz] > 10) posArray[iz] = -10;
      if (posArray[iz] < -10) posArray[iz] = 10;
    }

    posAttr.needsUpdate = true;

    if (linesRef.current) {
      let lineIdx = 0;
      for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_LINES; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < MAX_LINES; j++) {
          const ax = posArray[i * 3], ay = posArray[i * 3 + 1], az = posArray[i * 3 + 2];
          const bx = posArray[j * 3], by = posArray[j * 3 + 1], bz = posArray[j * 3 + 2];
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);

          if (d < 4.5) {
            const child = linesRef.current.children[lineIdx] as THREE.Line;
            if (child) {
              const linePos = child.geometry.attributes.position.array as Float32Array;
              linePos[0] = ax; linePos[1] = ay; linePos[2] = az;
              linePos[3] = bx; linePos[4] = by; linePos[5] = bz;
              (child.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
              (child.material as THREE.LineBasicMaterial).opacity = (1 - d / 4.5) * 0.12;
              child.visible = true;
            }
            lineIdx++;
          }
        }
      }

      for (let k = lineIdx; k < MAX_LINES; k++) {
        const child = linesRef.current.children[k] as THREE.Line;
        if (child) child.visible = false;
      }
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={1.5}
          transparent
          opacity={0.18}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <group ref={linesRef} />
    </>
  );
}

// ===== FLOATING NEBULA ORB — Colorful softer glow =====
function FloatingOrb({ offset, radius, color }: { offset: number; radius: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.position.x = Math.sin(t * 0.06 + offset) * 10;
    meshRef.current.position.y = Math.cos(t * 0.04 + offset * 2) * 14;
    meshRef.current.position.z = Math.sin(t * 0.03 + offset * 0.5) * 4 - 6;
    const s = radius + Math.sin(t * 0.25 + offset) * 0.5;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.018}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ===== FLOWING GRID PLANE — adds depth and sci-fi feel =====
function FlowingGrid({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geoRef = useRef<THREE.PlaneGeometry>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!geoRef.current) return;

    const pos = geoRef.current.attributes.position;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < pos.count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      arr[i * 3 + 2] =
        Math.sin(x * 0.3 + t * 0.4) * 0.3 +
        Math.cos(y * 0.2 + t * 0.3) * 0.2 +
        Math.sin((x + y) * 0.15 + t * 0.2) * 0.15;
    }
    pos.needsUpdate = true;

    // Subtle mouse tilt
    meshRef.current.rotation.x = -Math.PI / 2.3 + mouse.current.y * 0.03;
    meshRef.current.rotation.z = mouse.current.x * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[0, -12, -8]}>
      <planeGeometry ref={geoRef} args={[60, 60, 50, 50]} />
      <meshBasicMaterial
        color="#6366f1"
        wireframe
        transparent
        opacity={0.025}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ===== SCENE =====
function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 16);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    camera.position.x += (mouse.current.x * 0.6 - camera.position.x) * 0.015;
    camera.position.y += (mouse.current.y * 0.4 - camera.position.y) * 0.015;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <Particles mouse={mouse} />
      <FlowingGrid mouse={mouse} />
      {/* Colorful nebula orbs */}
      <FloatingOrb offset={0} radius={3.5} color="#8b5cf6" />
      <FloatingOrb offset={1.5} radius={2.8} color="#22d3ee" />
      <FloatingOrb offset={3} radius={4} color="#34d399" />
      <FloatingOrb offset={4.5} radius={3} color="#fb7185" />
      <FloatingOrb offset={6} radius={2.5} color="#60a5fa" />
      <FloatingOrb offset={8} radius={3.2} color="#a78bfa" />
    </>
  );
}

// ===== EXPORTED COMPONENT =====
export default function FloatingParticles() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-[2] pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
        camera={{ fov: 60, near: 0.1, far: 100 }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
