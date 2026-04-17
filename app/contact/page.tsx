'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Linkedin, Instagram, Twitter, Mail, MapPin, Globe2, Sparkles, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useRef } from 'react';

// Interactive 3D Background Element
function AnimatedGeometry() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={2} floatIntensity={3}>
      <mesh ref={meshRef} scale={1.8}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          metalness={0.6}
          roughness={0.2}
          transmission={0.8}
          thickness={2}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function FloatingShapes() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#e4e4e7" />
      <pointLight position={[10, -10, 5]} intensity={1} color="#a1a1aa" />
      
      <group position={[4, 1, -2]}>
        <AnimatedGeometry />
      </group>
      
      <group position={[-5, -2, -3]}>
        <Float speed={3} rotationIntensity={3} floatIntensity={4}>
          <mesh scale={0.8}>
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial 
              color="#ffffff" 
              transmission={0.9}
              opacity={1}
              roughness={0.1}
              metalness={0.5}
              ior={1.5}
            />
          </mesh>
        </Float>
      </group>

      <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
    </>
  );
}

const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  })
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col relative overflow-hidden">
      {/* 3D Background - Hidden on mobile for performance */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none hidden md:block">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <FloatingShapes />
        </Canvas>
      </div>

      {/* Decorative gradients */}
      <div className="absolute top-[0%] left-[20%] w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none z-0 hidden md:block" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[150px] pointer-events-none z-0 hidden md:block" />

      <Header />
      
      <main className="flex-1 pt-32 pb-24 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8">
          
          {/* Header Section */}
          <motion.div 
            initial="hidden"
            animate="visible"
            custom={0}
            variants={revealVariants}
            className="text-center mb-16 md:mb-24"
          >
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6">
              Let's build something <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">
                extraordinary
              </span>
            </h1>
            <p className="text-white/60 text-[16px] md:text-[18px] max-w-2xl mx-auto leading-relaxed font-sans">
              Whether you have a visionary project in mind, seek a strategic partnership, or just want to say hello — our inbox is always open.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Founder & Info */}
            <motion.div 
              initial="hidden"
              animate="visible"
              custom={2}
              variants={revealVariants}
              className="lg:col-span-5 space-y-6"
            >
              {/* Profile Card */}
              <div className="relative group overflow-hidden rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl p-8 hover:bg-white/[0.04] hover:border-blue-500/30 transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/20 to-transparent blur-2xl group-hover:from-blue-500/30 transition-all duration-500" />
                
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 relative shadow-xl">
                    <img 
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Piyush&backgroundColor=3b82f6" 
                      alt="Piyush Singh" 
                      className="w-full h-full object-cover bg-[#0a0a0f]"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Piyush Singh</h2>
                    <p className="text-blue-400 text-sm font-medium">Founder & CEO</p>
                  </div>
                </div>

                <p className="text-white/60 text-[14px] leading-relaxed mb-6 font-sans">
                  Draftly is built and operated from India. The goal is to make production-grade visual pipelines — product photos, videos, and 3D websites — accessible to solo creators and small teams, not just big studios.
                </p>

                <div className="space-y-4 pt-6 border-t border-white/[0.08]">
                  <div className="flex items-center gap-3 text-white/50 text-[14px]">
                    <MapPin className="w-4 h-4 text-white/30" />
                    <span>Based in India, working globally</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/50 text-[14px]">
                    <Globe2 className="w-4 h-4 text-white/30" />
                    <span>Serving 1,000+ creators worldwide</span>
                  </div>
                </div>
              </div>

              {/* Direct Email Card */}
              <a 
                href="mailto:piyush.glitch@draftly.business"
                className="block group rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 hover:bg-white/[0.04] hover:border-blue-500/30 transition-all duration-300 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/20 transition-transform duration-300">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-blue-400/60 text-[11px] uppercase tracking-[0.2em] font-mono mb-1">Direct Email</p>
                      <p className="text-white/90 font-medium text-[15px] group-hover:text-white transition-colors">piyush.glitch@draftly.business</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-blue-400/40 group-hover:text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
              </a>
            </motion.div>

            {/* Right Column: Social Grid */}
            <motion.div 
              initial="hidden"
              animate="visible"
              custom={3}
              variants={revealVariants}
              className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                {
                  key: 'linkedin',
                  icon: <Linkedin className="w-7 h-7" />,
                  label: 'LinkedIn',
                  value: 'Piyush Singh',
                  desc: 'Professional network & updates',
                  href: 'https://www.linkedin.com/in/piyush-singh-023507359',
                  accent: 'from-blue-500/10 to-transparent',
                  iconColor: 'text-blue-400',
                  borderColor: 'group-hover:border-blue-500/30',
                },
                {
                  key: 'twitter',
                  icon: <Twitter className="w-7 h-7" />,
                  label: 'X (Twitter)',
                  value: '@Piyush_Sxt',
                  desc: 'Quick thoughts & building in public',
                  href: 'https://x.com/Piyush_Sxt',
                  accent: 'from-blue-500/10 to-transparent',
                  iconColor: 'text-blue-400',
                  borderColor: 'group-hover:border-blue-500/30',
                },
                {
                  key: 'instagram',
                  icon: <Instagram className="w-7 h-7" />,
                  label: 'Instagram',
                  value: '@piyush.glitch',
                  desc: 'Behind the scenes visuals',
                  href: 'https://www.instagram.com/piyush.glitch',
                  accent: 'from-blue-600/10 to-transparent',
                  iconColor: 'text-blue-500',
                  borderColor: 'group-hover:border-blue-600/30',
                },
                {
                  key: 'office',
                  icon: <MapPin className="w-7 h-7" />,
                  label: 'Headquarters',
                  value: 'India',
                  desc: 'Remote-first, built globally.',
                  href: '#',
                  accent: 'from-indigo-500/10 to-transparent',
                  iconColor: 'text-indigo-400',
                  borderColor: 'group-hover:border-indigo-500/30',
                },
              ].map((c, i) => (
                <a
                  key={c.key}
                  href={c.href}
                  target={c.href === '#' ? undefined : '_blank'}
                  rel={c.href === '#' ? undefined : 'noopener noreferrer'}
                  className="block h-full"
                >
                  <div className={`relative overflow-hidden bg-white/[0.01] border border-white/[0.08] rounded-3xl p-8 h-full transition-all duration-500 group ${c.borderColor} hover:bg-white/[0.03] backdrop-blur-sm`}>
                    <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${c.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.1] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 ${c.iconColor}`}>
                        {c.icon}
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-white font-bold text-[20px] mb-1 tracking-tight">{c.label}</h3>
                      <p className="text-white/40 text-[13px] font-mono mb-4">{c.value}</p>
                      <p className="text-white/50 text-[14px] leading-relaxed font-sans">{c.desc}</p>
                    </div>
                  </div>
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
