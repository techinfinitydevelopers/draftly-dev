'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ===== FLOATING NODES =====
function Nodes({ count = 60, mouse }: { count?: number; mouse: React.MutableRefObject<[number, number]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 8 - 2;
      const speed = 0.2 + Math.random() * 0.4;
      const phase = Math.random() * Math.PI * 2;
      const size = 0.03 + Math.random() * 0.06;
      temp.push({ x, y, z, speed, phase, size, ox: x, oy: y });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const [mx, my] = mouse.current;

    particles.forEach((p, i) => {
      const floatX = p.ox + Math.sin(t * p.speed + p.phase) * 0.8;
      const floatY = p.oy + Math.cos(t * p.speed * 0.7 + p.phase) * 0.5;

      const dx = floatX - mx * 6;
      const dy = floatY - my * 4;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const push = dist < 3 ? (3 - dist) * 0.08 : 0;

      dummy.position.set(
        floatX + (dx / (dist || 1)) * push,
        floatY + (dy / (dist || 1)) * push,
        p.z + Math.sin(t * 0.3 + i) * 0.3
      );
      dummy.scale.setScalar(p.size * (1 + Math.sin(t * 2 + p.phase) * 0.3));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color="#7c8aff" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// ===== CONNECTION LINES (imperative approach to avoid TS conflict) =====
function Connections({ count = 40 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  const connections = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x1 = (Math.random() - 0.5) * 14;
      const y1 = (Math.random() - 0.5) * 9;
      const x2 = x1 + (Math.random() - 0.5) * 4;
      const y2 = y1 + (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 6 - 3;
      const speed = 0.15 + Math.random() * 0.3;
      const phase = Math.random() * Math.PI * 2;
      temp.push({ x1, y1, x2, y2, z, speed, phase });
    }
    return temp;
  }, [count]);

  // Create lines imperatively
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    connections.forEach((c) => {
      const p0 = new THREE.Vector3(c.x1, c.y1, c.z);
      const p1 = new THREE.Vector3((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2 + 0.5, c.z + 0.3);
      const p2 = new THREE.Vector3(c.x2, c.y2, c.z);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const points = curve.getPoints(20);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: '#6366f1', transparent: true, opacity: 0.08 });
      const lineObj = new THREE.Line(geometry, material);
      (lineObj as any)._speed = c.speed;
      (lineObj as any)._phase = c.phase;
      group.add(lineObj);
    });

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
        if ((child as THREE.Line).material) {
          const mat = (child as THREE.Line).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      }
    };
  }, [connections]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((child) => {
      const lineObj = child as THREE.Line;
      const mat = lineObj.material as THREE.LineBasicMaterial;
      const speed = (lineObj as any)._speed || 0.2;
      const phase = (lineObj as any)._phase || 0;
      mat.opacity = 0.04 + Math.sin(t * speed + phase) * 0.04;
    });
  });

  return <group ref={groupRef} />;
}

// ===== GLOWING ORBS =====
function GlowOrbs() {
  const ref = useRef<THREE.Group>(null!);

  const orbs = useMemo(() => [
    { x: -4, y: 2, z: -4, color: '#818cf8', size: 1.5, speed: 0.2 },
    { x: 3, y: -1, z: -5, color: '#a78bfa', size: 2, speed: 0.15 },
    { x: 0, y: 0, z: -6, color: '#6366f1', size: 2.5, speed: 0.1 },
    { x: 5, y: 3, z: -3, color: '#c084fc', size: 1, speed: 0.25 },
  ], []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    ref.current.children.forEach((mesh, i) => {
      const orb = orbs[i];
      if (!orb) return;
      mesh.position.y = orb.y + Math.sin(t * orb.speed) * 0.5;
      mesh.position.x = orb.x + Math.cos(t * orb.speed * 0.7) * 0.3;
    });
  });

  return (
    <group ref={ref}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={[orb.x, orb.y, orb.z]}>
          <sphereGeometry args={[orb.size, 32, 32]} />
          <meshBasicMaterial color={orb.color} transparent opacity={0.04} />
        </mesh>
      ))}
    </group>
  );
}

// ===== SCENE =====
function Scene({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  return (
    <>
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#050508', 5, 20]} />
      <Nodes count={50} mouse={mouse} />
      <Connections count={35} />
      <GlowOrbs />
    </>
  );
}

// ===== EXPORTED COMPONENT =====
export default function FlowingNodes() {
  const mouse = useRef<[number, number]>([0, 0]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouse.current = [
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    ];
  }, []);

  return (
    <div className="absolute inset-0" onMouseMove={handleMouseMove}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'transparent' }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
