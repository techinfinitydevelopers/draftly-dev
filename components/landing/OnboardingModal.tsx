'use client';

/* Legacy modal (unused). Live flow: /onboarding → plan → sign-in → /pricing. */

import { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, OrbitControls, Stars } from '@react-three/drei';
import { useAuth } from '@/hooks/useAuth';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// 3D Scene component for the Onboarding Modal
function OnboardingScene({ step }: { step: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (0.1 + step * 0.05);
      groupRef.current.rotation.x += delta * (0.05 * step);
      
      const targetScale = 1 + (step - 1) * 0.2;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
    }
  });

  const colors = ["#ffffff", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b"];
  const color = colors[step - 1] || colors[0];

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={2} color={color} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
      
      <group ref={groupRef}>
        <Float speed={2 + step * 0.5} rotationIntensity={1.5} floatIntensity={2}>
          <mesh visible={step === 1}>
            <torusKnotGeometry args={[1, 0.3, 128, 32]} />
            <meshPhysicalMaterial color={color} metalness={0.8} roughness={0.2} wireframe />
          </mesh>
          <mesh visible={step === 2}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshPhysicalMaterial color={color} metalness={0.9} roughness={0.1} transmission={0.5} thickness={1} />
          </mesh>
          <mesh visible={step === 3}>
            <octahedronGeometry args={[1.5, 0]} />
            <meshPhysicalMaterial color={color} metalness={0.5} roughness={0.1} wireframe />
          </mesh>
          <mesh visible={step === 4}>
            <dodecahedronGeometry args={[1.4, 0]} />
            <meshPhysicalMaterial color={color} metalness={0.7} roughness={0.3} transmission={0.9} />
          </mesh>
          <mesh visible={step === 5}>
            <icosahedronGeometry args={[1.5, 1]} />
            <meshPhysicalMaterial color={color} metalness={0.9} roughness={0.1} wireframe />
          </mesh>
        </Float>
      </group>

      <Sparkles count={150 + step * 50} scale={10} size={1 + step * 0.5} speed={0.2} opacity={0.2} color={color} />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
      
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3 + step * 0.1} />
    </>
  );
}

export default function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [feature, setFeature] = useState<string | null>(null);
  
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  
  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGoal(null);
      setRole(null);
      setVibe(null);
      setFeature(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  
  const finishOnboarding = async () => {
    // Save their role to help curate the best pricing plan
    if (typeof window !== 'undefined' && role) {
      window.sessionStorage.setItem('draftly_onboarding_role', role);
      window.sessionStorage.setItem('draftly_onboarding_plan', plan.id);
    }
    // If they proceed, sign them in
    await signInWithGoogle();
    onClose();
    router.push('/pricing?from=signin');
  };

  const getRecommendedPlan = () => {
    if (role === 'enterprise') {
      return { 
        id: 'enterprise', name: 'Enterprise', price: 'Custom', color: 'text-pink-400', 
        gradient: 'from-pink-400 to-purple-300', bg: 'bg-pink-500/10',
        titlePrefix: 'Custom', titleHighlight: 'Builds',
        desc: 'For enterprise clients, we build your 3D website for you with custom branding and animations.',
        bullets: ['✓ Custom 3D sites', '✓ Dedicated support', '✓ Tailored to your brand']
      };
    }
    if (role === 'business' || role === 'agency' || role === 'startup') {
      return { 
        id: 'premium', name: 'Premium', price: 200, color: 'text-amber-400',
        gradient: 'from-amber-400 to-orange-300', bg: 'bg-amber-500/10',
        titlePrefix: 'Unlock', titleHighlight: '4K Quality',
        desc: 'For teams and scale, we highly recommend our Premium $200 Plan for massive compute scale.',
        bullets: ['✓ Generates 2K & 4K cinematic videos', '✓ Overall fidelity is 4x higher', '✓ Uncapped priority compute']
      };
    }
    if (role === 'creator') {
      return { 
        id: 'pro', name: 'Pro', price: 60, color: 'text-violet-400',
        gradient: 'from-violet-400 to-purple-300', bg: 'bg-violet-500/10',
        titlePrefix: 'Scale', titleHighlight: 'Faster',
        desc: 'For professional creators scaling up, the Pro Plan gives you enough compute to build 7 full 3D sites.',
        bullets: ['✓ 6,000 credits for high-end generation', '✓ Priority support included', '✓ Up to 7 complete 3D websites']
      };
    }
    return { 
      id: 'basic-plus', name: 'Basic Plus', price: 40, color: 'text-emerald-400',
      gradient: 'from-emerald-400 to-green-300', bg: 'bg-emerald-500/10',
      titlePrefix: 'Best', titleHighlight: 'Value',
      desc: 'The Basic Plus plan is perfect for solo creators needing resources to perfect their sites.',
      bullets: ['✓ 2,500 credits per month', '✓ 4 complete 3D websites', '✓ ZIP download & deploy']
    };
  };

  const plan = getRecommendedPlan();
  const totalSteps = 5;

  return (
    <div
      data-onboarding-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-5xl h-[650px] max-h-[90vh] bg-[#05050a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(56,189,248,0.1)] mx-4 flex flex-col md:flex-row"
      >
        {/* Left Side: 3D Canvas */}
        <div className="absolute inset-0 md:relative md:w-1/2 h-full z-0 border-r border-white/[0.05]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-[#05050a] md:hidden z-10 pointer-events-none" />
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <Suspense fallback={null}>
              <OnboardingScene step={step} />
            </Suspense>
          </Canvas>
          
          {/* Progress Indicators */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 bg-white/[0.1] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: step >= i + 1 ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive Content */}
        <div className="relative z-10 w-full md:w-1/2 h-full flex flex-col pt-10 pb-8 px-8 md:px-12 bg-black/60 md:bg-gradient-to-b md:from-[#0a0a14] md:to-[#05050a]">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors z-50"
          >
            ✕
          </button>

          <AnimatePresence mode="wait">
            {/* STEP 1: GOAL */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center"
              >
                <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 block">Step 1 of {totalSteps}</span>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight">What's your main<br/>objective?</h2>
                <p className="text-white/50 text-sm mb-8">We'll optimize the engine for your specific use case.</p>
                
                <div className="space-y-3">
                  {[
                    { id: 'landing', label: 'Immersive Landing Page', desc: 'Convert visitors with 3D scroll effects' },
                    { id: 'portfolio', label: 'Creative Portfolio', desc: 'Showcase work in a cinematic way' },
                    { id: 'ecommerce', label: 'Next-Gen E-Commerce', desc: 'Make products pop with 3D interactions' },
                    { id: 'campaign', label: 'Marketing Campaign', desc: 'High-impact standalone experience' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setGoal(opt.id); handleNext(); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                        goal === opt.id 
                          ? 'border-white/30 bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]'
                      }`}
                    >
                      <h3 className="text-white font-semibold text-[14px] group-hover:text-white/90 transition-colors">{opt.label}</h3>
                      <p className="text-white/40 text-[12px] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: ROLE */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center"
              >
                <button onClick={handleBack} className="text-white/40 hover:text-white text-xs flex items-center gap-2 w-fit mb-6 transition-colors">
                  ← Back
                </button>
                <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 block">Step 2 of {totalSteps}</span>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight">Who are you<br/>building for?</h2>
                <p className="text-white/50 text-sm mb-8">This determines output resolution and compute resources.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'solo_creator', label: 'Solo Creator', icon: 'fa-user' },
                    { id: 'creator', label: 'Creator', icon: 'fa-pencil' },
                    { id: 'startup', label: 'Startup', icon: 'fa-rocket' },
                    { id: 'agency', label: 'Agency', icon: 'fa-building' },
                    { id: 'business', label: 'Business', icon: 'fa-briefcase' },
                    { id: 'enterprise', label: 'Enterprise', icon: 'fa-globe' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setRole(opt.id); handleNext(); }}
                      className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all duration-300 group ${
                        role === opt.id 
                          ? 'border-white/30 bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]'
                      }`}
                    >
                      <i className={`fa-solid ${opt.icon} text-2xl mb-3 text-white/50 group-hover:text-white group-hover:scale-110 transition-all`} />
                      <h3 className="text-white font-semibold text-[13px] group-hover:text-white/90 transition-colors">{opt.label}</h3>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: VIBE */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center"
              >
                <button onClick={handleBack} className="text-white/40 hover:text-white text-xs flex items-center gap-2 w-fit mb-6 transition-colors">
                  ← Back
                </button>
                <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 block">Step 3 of {totalSteps}</span>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight">Choose your<br/>aesthetic</h2>
                <p className="text-white/50 text-sm mb-8">We'll prime the AI with these visual styles.</p>
                
                <div className="space-y-3">
                  {[
                    { id: 'minimalist', label: 'Clean & Minimalist', desc: 'Lots of white space, sleek typography' },
                    { id: 'cyberpunk', label: 'Dark Cyberpunk', desc: 'Neon glows, dark backgrounds, high tech' },
                    { id: 'cinematic', label: 'Cinematic 3D', desc: 'Photorealistic lighting and depth' },
                    { id: 'playful', label: 'Vibrant & Playful', desc: 'Bright colors, abstract shapes, fun motion' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setVibe(opt.id); handleNext(); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                        vibe === opt.id 
                          ? 'border-white/30 bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]'
                      }`}
                    >
                      <h3 className="text-white font-semibold text-[14px] group-hover:text-white/90 transition-colors">{opt.label}</h3>
                      <p className="text-white/40 text-[12px] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 4: FEATURE */}
            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center"
              >
                <button onClick={handleBack} className="text-white/40 hover:text-white text-xs flex items-center gap-2 w-fit mb-6 transition-colors">
                  ← Back
                </button>
                <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 block">Step 4 of {totalSteps}</span>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight">Must-have<br/>feature?</h2>
                <p className="text-white/50 text-sm mb-8">What is the most critical element for your project?</p>
                
                <div className="space-y-3">
                  {[
                    { id: 'scroll', label: 'Scroll-driven 3D animations', desc: 'Frames that scrub as the user scrolls' },
                    { id: 'assets', label: 'Custom 3D model import', desc: 'Bring your own .glb/.gltf assets' },
                    { id: 'speed', label: 'Ultra-fast load times', desc: 'Optimized webp sequences & code' },
                    { id: 'export', label: 'Full code export', desc: 'Download HTML/CSS/JS instantly' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setFeature(opt.id); handleNext(); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                        feature === opt.id 
                          ? 'border-white/30 bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]'
                      }`}
                    >
                      <h3 className="text-white font-semibold text-[14px] group-hover:text-white/90 transition-colors">{opt.label}</h3>
                      <p className="text-white/40 text-[12px] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 5: UPSELL / SIGN IN */}
            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center"
              >
                <button onClick={handleBack} className="text-white/40 hover:text-white text-xs flex items-center gap-2 w-fit mb-4 transition-colors">
                  ← Back
                </button>
                
                <>
                  <span className={`${plan.color} text-[10px] font-mono uppercase tracking-widest mb-3 block`}>Recommendation</span>
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
                    {plan.titlePrefix} <span className={`text-transparent bg-clip-text bg-gradient-to-r ${plan.gradient}`}>{plan.titleHighlight}</span>
                  </h2>
                  <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03] mb-6 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${plan.bg} blur-3xl rounded-full`} />
                    <p className="text-white/80 text-[14px] leading-relaxed relative z-10">
                      {plan.desc}
                    </p>
                    <ul className="mt-4 space-y-2 relative z-10">
                      {plan.bullets.map((bullet, i) => {
                        const [check, ...rest] = bullet.split(' ');
                        return (
                          <li key={i} className="flex items-center gap-2 text-[13px] text-white/70">
                            <span className={plan.color}>{check}</span> {rest.join(' ')}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>

                <div className="mt-auto">
                  <div className="relative group/btn">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/0 rounded-xl opacity-50 blur-sm group-hover/btn:opacity-100 transition duration-500" />
                    <button 
                      onClick={finishOnboarding}
                      className="relative w-full py-4 rounded-xl text-[14px] font-bold transition-all duration-300 flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90"
                    >
                      <i className="fa-brands fa-google text-[16px]" />
                      Sign In to Continue
                    </button>
                  </div>
                  <p className="text-center text-white/30 text-[11px] mt-4">
                    By signing in, you agree to our Terms of Service.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}