'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ===== ISOMETRIC BOX GRID (brighter, more dramatic) =====
function IsometricBoxes({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const edgesRef = useRef<THREE.Group>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const GRID = 18;
  const SPACING = 1.12;
  const count = GRID * GRID;

  // Generate height map - more dramatic peaks
  const heightMap = useMemo(() => {
    const map: number[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const cx = col - GRID / 2;
      const cy = row - GRID / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      // Multiple peaks for a richer terrain
      const peak1 = Math.max(0, 4 - dist * 0.35);
      const peak2 = Math.max(0, 2.5 - Math.sqrt((cx - 4) ** 2 + (cy - 3) ** 2) * 0.5);
      const peak3 = Math.max(0, 2 - Math.sqrt((cx + 3) ** 2 + (cy - 5) ** 2) * 0.5);
      const noise = Math.sin(col * 0.8) * Math.cos(row * 0.7) * 0.6;
      const fine = Math.sin(col * 2.1 + row * 1.7) * 0.2;
      map.push(Math.max(peak1, peak2, peak3) + noise + fine + Math.random() * 0.4);
    }
    return map;
  }, [count]);

  // Create wireframe edges
  useEffect(() => {
    const group = edgesRef.current;
    if (!group) return;

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const x = (col - GRID / 2) * SPACING;
      const z = (row - GRID / 2) * SPACING;
      const h = heightMap[i];

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
      });
      const lineSegments = new THREE.LineSegments(edgesGeo.clone(), edgeMat);
      lineSegments.position.set(x, h * 0.5, z);
      lineSegments.scale.set(1, Math.max(0.05, h), 1);
      (lineSegments as any)._col = col;
      (lineSegments as any)._row = row;
      (lineSegments as any)._baseH = h;
      group.add(lineSegments);
    }

    boxGeo.dispose();

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if ((child as THREE.LineSegments).geometry) (child as THREE.LineSegments).geometry.dispose();
        if ((child as THREE.LineSegments).material) ((child as THREE.LineSegments).material as THREE.Material).dispose();
      }
    };
  }, [count, heightMap]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = scrollProgress.current;

    // Update instanced mesh (solid faces)
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const x = (col - GRID / 2) * SPACING;
      const z = (row - GRID / 2) * SPACING;

      // More dramatic animate
      const baseH = heightMap[i];
      const wave = Math.sin(t * 0.4 + col * 0.25 + row * 0.25) * 0.3;
      const ripple = Math.sin(t * 0.7 + (col + row) * 0.15) * 0.15;
      const scrollBoost = scroll * 1.8;
      const h = Math.max(0.05, baseH * (0.35 + scrollBoost * 0.65) + wave + ripple);

      dummy.position.set(x, h * 0.5, z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update edges
    if (edgesRef.current) {
      edgesRef.current.children.forEach((child) => {
        const ls = child as THREE.LineSegments;
        const row = (ls as any)._row;
        const col = (ls as any)._col;
        const baseH = (ls as any)._baseH;

        const wave = Math.sin(t * 0.4 + col * 0.25 + row * 0.25) * 0.3;
        const ripple = Math.sin(t * 0.7 + (col + row) * 0.15) * 0.15;
        const scrollBoost = scroll * 1.8;
        const h = Math.max(0.05, baseH * (0.35 + scrollBoost * 0.65) + wave + ripple);

        ls.position.y = h * 0.5;
        ls.scale.y = h;

        // Brighter edges on taller columns
        const mat = ls.material as THREE.LineBasicMaterial;
        mat.opacity = 0.05 + (h / 5) * 0.2;
      });
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.02} />
      </instancedMesh>
      <group ref={edgesRef} />
    </>
  );
}

// ===== GROUND PLANE GRID (infinite feel) =====
function GroundGrid() {
  const gridRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    const group = gridRef.current;
    if (!group) return;

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.03,
    });

    const gridSize = 40;
    const step = 1.12;

    for (let i = -gridSize / 2; i <= gridSize / 2; i++) {
      const points1 = [
        new THREE.Vector3(i * step, 0, -gridSize / 2 * step),
        new THREE.Vector3(i * step, 0, gridSize / 2 * step),
      ];
      const geo1 = new THREE.BufferGeometry().setFromPoints(points1);
      const line1 = new THREE.Line(geo1, material.clone());
      group.add(line1);

      const points2 = [
        new THREE.Vector3(-gridSize / 2 * step, 0, i * step),
        new THREE.Vector3(gridSize / 2 * step, 0, i * step),
      ];
      const geo2 = new THREE.BufferGeometry().setFromPoints(points2);
      const line2 = new THREE.Line(geo2, material.clone());
      group.add(line2);
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

  return <group ref={gridRef} position={[0, -0.01, 0]} />;
}

// ===== SCENE =====
function Scene({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(10, 12, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Very subtle camera breathing
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const baseX = 10;
    const baseY = 12;
    const baseZ = 10;
    camera.position.x = baseX + Math.sin(t * 0.08) * 0.3;
    camera.position.y = baseY + Math.sin(t * 0.06) * 0.15;
    camera.position.z = baseZ + Math.cos(t * 0.07) * 0.2;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 15, 30]} />
      <GroundGrid />
      <IsometricBoxes scrollProgress={scrollProgress} />
    </>
  );
}

// ===== EXPORTED COMPONENT =====
export default function BoxGrid() {
  const scrollProgress = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const max = window.innerHeight * 1.5;
      scrollProgress.current = Math.min(1, window.scrollY / max);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000' }}
      >
        <Scene scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}
