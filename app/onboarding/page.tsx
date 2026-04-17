'use client';

import { useMemo, useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Float,
  Sparkles,
  OrbitControls,
  Stars,
  MeshDistortMaterial,
  Environment,
  Lightformer,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';

import {
  recommendDraftlyPlan,
  type OnboardingGoalId,
  type OnboardingRoleId,
  type OnboardingSiteVolumeId,
} from '@/lib/onboarding-recommend-plan';

const TOTAL_STEPS = 4;

const GOALS: { id: OnboardingGoalId; title: string; desc: string; icon: string }[] = [
  { id: 'immersive_landing', title: 'Immersive landing page', desc: 'One flagship page with scroll-driven 3D motion', icon: 'fa-bolt' },
  { id: 'portfolio', title: 'Creative portfolio', desc: 'Showcase work with cinematic depth and motion', icon: 'fa-palette' },
  { id: 'ecommerce', title: 'Product or brand story', desc: 'High-impact visuals for launches and campaigns', icon: 'fa-shopping-cart' },
  { id: 'campaign', title: 'Marketing campaign site', desc: 'A focused experience for a drop or promotion', icon: 'fa-bullhorn' },
  { id: 'client_sites', title: 'Sites for clients', desc: 'I build or sell websites for others', icon: 'fa-handshake' },
  { id: 'exploring', title: 'Just exploring', desc: 'Learning what Draftly can do before committing', icon: 'fa-compass' },
];

const ROLES: { id: OnboardingRoleId; title: string; icon: string }[] = [
  { id: 'solo', title: 'Solo creator / founder', icon: 'fa-user' },
  { id: 'freelancer', title: 'Freelancer', icon: 'fa-laptop-code' },
  { id: 'startup', title: 'Startup team', icon: 'fa-rocket' },
  { id: 'agency', title: 'Agency / studio', icon: 'fa-building' },
  { id: 'business', title: 'Business / in-house', icon: 'fa-briefcase' },
  { id: 'enterprise', title: 'Enterprise', icon: 'fa-globe' },
];

const SITE_VOLUMES: { id: OnboardingSiteVolumeId; label: string; hint: string }[] = [
  { id: '1', label: '1 site', hint: 'Single project or proof of concept' },
  { id: '2', label: '2 sites', hint: 'A couple of launches per month' },
  { id: '3-4', label: '3–4 sites', hint: 'Regular shipping cadence' },
  { id: '5-9', label: '5–9 sites', hint: 'Client work or multiple brands' },
  { id: '10+', label: '10+ sites', hint: 'High volume or team production' },
];

const ONBOARDING_SESSION_KEY = 'draftly_onboarding_answers';

const STEP_PALETTES = [
  { primary: '#38bdf8', secondary: '#0ea5e9', glow: '#7dd3fc', bg: '#0c4a6e' },
  { primary: '#a78bfa', secondary: '#8b5cf6', glow: '#c4b5fd', bg: '#4c1d95' },
  { primary: '#34d399', secondary: '#10b981', glow: '#6ee7b7', bg: '#064e3b' },
  { primary: '#fcd34d', secondary: '#f59e0b', glow: '#fde68a', bg: '#78350f' },
] as const;

function OnboardingScene({ step }: { step: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const palette = STEP_PALETTES[Math.min(step, STEP_PALETTES.length) - 1] ?? STEP_PALETTES[0];
  const color = palette.primary;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (0.22 + step * 0.06);
      const tx = pointer.x * 0.45;
      const ty = pointer.y * 0.35;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, ty, 0.06);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, tx * 0.4, 0.05);
      const targetScale = 1.05 + (step - 1) * 0.14;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.07);
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.85;
      innerRef.current.rotation.x += delta * 0.12;
    }
  });

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.bg, 8, 22]} />

      <ambientLight intensity={0.85} />
      <hemisphereLight intensity={0.55} color="#e0e7ff" groundColor={palette.secondary} />
      <directionalLight position={[8, 12, 6]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-6, 4, -8]} intensity={1.2} color={palette.glow} />
      <pointLight position={[0, -4, 4]} intensity={1.4} color={palette.primary} distance={12} />
      <spotLight
        position={[0, 8, 2]}
        angle={0.45}
        penumbra={0.85}
        intensity={2}
        color={palette.glow}
        castShadow
      />

      {/* Procedural studio map — no remote HDR (avoids fetch failures on strict networks) */}
      <Environment
        key={step}
        frames={1}
        resolution={512}
        background={false}
        environmentIntensity={0.9}
      >
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Lightformer
            form="ring"
            intensity={2.2}
            rotation-x={Math.PI / 2}
            position={[0, 0, 5]}
            scale={[12, 12, 1]}
            color={palette.glow}
          />
          <Lightformer
            form="rect"
            intensity={0.65}
            rotation-x={Math.PI / 2}
            position={[0, 0, -4.5]}
            scale={[14, 14, 1]}
            color={palette.secondary}
          />
          <Lightformer
            form="rect"
            intensity={1.35}
            rotation-y={Math.PI / 2}
            position={[-5.5, 1.5, 0]}
            scale={[12, 10, 1]}
            color="#f1f5f9"
          />
          <Lightformer
            form="rect"
            intensity={0.55}
            rotation-y={-Math.PI / 2}
            position={[5.5, 0.75, 0]}
            scale={[12, 9, 1]}
            color={palette.primary}
          />
        </group>
      </Environment>

      <group ref={groupRef}>
        <Float speed={2.8 + step * 0.4} rotationIntensity={0.8} floatIntensity={1.6}>
          <group ref={innerRef}>
            <mesh visible={step === 1} castShadow>
              <torusKnotGeometry args={[1, 0.32, 160, 36]} />
              <MeshDistortMaterial
                color={color}
                emissive={palette.glow}
                emissiveIntensity={0.35}
                metalness={0.65}
                roughness={0.18}
                distort={0.35}
                speed={3}
              />
            </mesh>
            <mesh visible={step === 2} castShadow>
              <boxGeometry args={[1.45, 1.45, 1.45]} />
              <meshPhysicalMaterial
                color={color}
                emissive={palette.glow}
                emissiveIntensity={0.25}
                metalness={0.25}
                roughness={0.08}
                transmission={0.72}
                thickness={1.2}
                ior={1.55}
                clearcoat={1}
                clearcoatRoughness={0.15}
              />
            </mesh>
            <mesh visible={step === 3} castShadow>
              <icosahedronGeometry args={[1.45, 1]} />
              <meshStandardMaterial
                color={color}
                emissive={palette.secondary}
                emissiveIntensity={0.55}
                metalness={0.75}
                roughness={0.2}
                flatShading
              />
            </mesh>
            <mesh visible={step === 4} castShadow>
              <dodecahedronGeometry args={[1.38, 0]} />
              <meshPhysicalMaterial
                color={color}
                emissive={palette.glow}
                emissiveIntensity={0.4}
                metalness={0.5}
                roughness={0.12}
                transmission={0.55}
                thickness={1.8}
                ior={1.45}
                clearcoat={0.9}
              />
            </mesh>
          </group>
        </Float>
        <mesh visible={step === 1} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <torusGeometry args={[1.55, 0.02, 16, 64]} />
          <meshBasicMaterial color={palette.glow} transparent opacity={0.5} />
        </mesh>
      </group>

      <ContactShadows
        position={[0, -1.85, 0]}
        opacity={0.55}
        scale={12}
        blur={2.8}
        far={5}
        color="#0f172a"
      />

      <Sparkles
        count={220 + step * 60}
        scale={14}
        size={2.2 + step * 0.35}
        speed={0.45}
        opacity={0.75}
        color={palette.glow}
      />
      <Stars radius={80} depth={40} count={2500} factor={3.2} saturation={0.35} fade speed={0.8} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.1 + step * 0.25}
        maxPolarAngle={Math.PI / 1.85}
        minPolarAngle={Math.PI / 4}
      />
    </>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<OnboardingGoalId | ''>('');
  const [role, setRole] = useState<OnboardingRoleId | ''>('');
  const [sites, setSites] = useState<OnboardingSiteVolumeId | ''>('');
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  // Returning users who already completed onboarding → skip straight to builder
  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists() && snap.data()?.onboardingComplete === true) {
        router.replace('/3d-builder');
      }
    }).catch(() => { /* ignore, let user proceed normally */ });
  }, [user, router]);

  const recommendation = useMemo(() => {
    if (!goal || !role || !sites) return null;
    return recommendDraftlyPlan(role, sites, goal);
  }, [goal, role, sites]);

  const persistSession = useCallback(() => {
    if (!recommendation || typeof window === 'undefined') return;
    const payload = {
      goal,
      role,
      sites,
      recommendedPlanId: recommendation.id,
      recommendedPlanName: recommendation.name,
      at: new Date().toISOString(),
    };
    sessionStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(payload));
    sessionStorage.setItem('draftly_onboarding_role', role);
    sessionStorage.setItem('draftly_onboarding_plan', recommendation.id);
  }, [goal, role, sites, recommendation]);

  useEffect(() => {
    if (step === 4 && recommendation) persistSession();
  }, [step, recommendation, persistSession]);

  const saveProfileAfterSignIn = useCallback(
    async (uid: string, email: string | null) => {
      if (!db) return;
      const userRef = doc(db, 'users', uid);
      const existingSnap = await getDoc(userRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      const hasPaidPlan = existingData?.subscription?.plan && existingData.subscription.plan !== 'free';

      const profileUpdate: Record<string, unknown> = {
        name: existingData?.name || email?.split('@')[0] || 'Creator',
        onboardingGoal: goal,
        onboardingRole: role,
        onboardingSitesBand: sites,
        recommendedPlanId: recommendation?.id,
        recommendedPlanName: recommendation?.name,
        email,
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      };

      if (!hasPaidPlan && (!existingData?.subscription || existingData.subscription.plan === 'free')) {
        if (!existingData?.createdAt) profileUpdate.createdAt = new Date();
        if (!existingData?.subscription) {
          profileUpdate.subscription = {
            plan: 'free',
            status: 'active',
            generationsUsed: 0,
            generationsLimit: 5,
          };
        }
        if (!existingData?.generationTracking) {
          profileUpdate.generationTracking = {
            fullAppsGenerated: 0,
            uiPreviewsGenerated: 0,
            chatsUsed: 0,
            lastResetDate: new Date().toISOString(),
            projects: {},
          };
        }
      }

      await setDoc(userRef, profileUpdate, { merge: true });
    },
    [goal, role, sites, recommendation],
  );

  const handleSignIn = async () => {
    if (!recommendation) return;
    persistSession();
    setSigningIn(true);
    try {
      const signedInUser = await signInWithGoogle({
        skipNavigation: true,
        redirectTo: '/pricing?from=onboarding',
      });
      if (signedInUser) {
        await saveProfileAfterSignIn(signedInUser.uid, signedInUser.email);
        router.push('/pricing?from=onboarding');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoalSelect = (g: OnboardingGoalId) => {
    setGoal(g);
    setTimeout(() => setStep(2), 150); // Small delay for visual feedback
  };

  const handleRoleSelect = (r: OnboardingRoleId) => {
    setRole(r);
    setTimeout(() => setStep(3), 150);
  };

  const handleSitesSelect = (s: OnboardingSiteVolumeId) => {
    setSites(s);
    setTimeout(() => setStep(4), 150);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#05050a] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* ── Left Side: 3D Immersive Canvas ── */}
      <div className="relative w-full md:w-1/2 h-[35vh] md:h-screen border-b md:border-b-0 md:border-r border-white/[0.05] bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-[#05050a] md:bg-gradient-to-r z-10 pointer-events-none" />
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <OnboardingScene step={step} />
          </Suspense>
        </Canvas>
        
        {/* Progress Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div 
              key={i} 
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                step === i + 1 
                  ? 'bg-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                  : step > i + 1 
                    ? 'bg-white/40' 
                    : 'bg-white/10'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* ── Right Side: Interactive Form ── */}
      <div className="relative w-full md:w-1/2 h-[65vh] md:h-screen flex flex-col pt-8 md:pt-16 pb-8 px-6 md:px-16 xl:px-24 bg-gradient-to-b from-[#0a0a14] to-[#05050a] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        
        <div className="flex justify-between items-center mb-8 shrink-0">
          {step > 1 ? (
            <button 
              onClick={goBack}
              className="text-white/40 hover:text-white text-[13px] font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />
              Back
            </button>
          ) : (
            <div />
          )}
          <Link
            href="/"
            className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all"
            title="Exit onboarding"
          >
            <i className="fa-solid fa-xmark text-[13px]" />
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[500px] w-full mx-auto pb-10">
          <AnimatePresence mode="wait" custom={step}>
            {/* STEP 1: GOAL */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <span className="text-blue-400 text-[11px] font-mono uppercase tracking-widest mb-3 block">Step 1</span>
                <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white mb-3 leading-[1.1]">
                  What do you want to build?
                </h1>
                <p className="text-white/50 text-[14px] md:text-[15px] mb-8 leading-relaxed">
                  We'll optimize the generative engine for your specific use case.
                </p>
                
                <div className="grid gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleGoalSelect(g.id)}
                      className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all duration-300 group flex items-start gap-4 ${
                        goal === g.id 
                          ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]' 
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.2]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        goal === g.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 group-hover:text-white/80'
                      }`}>
                        <i className={`fa-solid ${g.icon} text-[15px]`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-[15px] mb-1 transition-colors ${goal === g.id ? 'text-white' : 'text-white/90'}`}>{g.title}</h3>
                        <p className="text-white/40 text-[13px] leading-snug">{g.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: ROLE */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <span className="text-indigo-400 text-[11px] font-mono uppercase tracking-widest mb-3 block">Step 2</span>
                <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white mb-3 leading-[1.1]">
                  Who are you building for?
                </h1>
                <p className="text-white/50 text-[14px] md:text-[15px] mb-8 leading-relaxed">
                  This determines output resolution and compute resource allocation.
                </p>
                
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleRoleSelect(r.id)}
                      className={`flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl border transition-all duration-300 group ${
                        role === r.id 
                          ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.2]'
                      }`}
                    >
                      <i className={`fa-solid ${r.icon} text-3xl mb-4 transition-all duration-500 ${
                        role === r.id ? 'text-indigo-400 scale-110' : 'text-white/30 group-hover:text-white/70 group-hover:scale-110'
                      }`} />
                      <span className={`font-semibold text-[14px] text-center transition-colors ${
                        role === r.id ? 'text-white' : 'text-white/70 group-hover:text-white'
                      }`}>{r.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: VOLUME */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <span className="text-emerald-400 text-[11px] font-mono uppercase tracking-widest mb-3 block">Step 3</span>
                <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white mb-3 leading-[1.1]">
                  How many 3D sites per month?
                </h1>
                <p className="text-white/50 text-[14px] md:text-[15px] mb-8 leading-relaxed">
                  Roughly how many full scroll-driven sites do you expect to generate?
                </p>
                
                <div className="grid gap-3">
                  {SITE_VOLUMES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSitesSelect(v.id)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group flex items-center justify-between ${
                        sites === v.id 
                          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.15)]' 
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.2]'
                      }`}
                    >
                      <div>
                        <span className={`font-semibold text-[16px] block mb-1 transition-colors ${sites === v.id ? 'text-white' : 'text-white/90'}`}>{v.label}</span>
                        <span className="text-white/40 text-[13px]">{v.hint}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        sites === v.id ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-white/20 text-transparent'
                      }`}>
                        <i className="fa-solid fa-check text-[10px]" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 4: RECOMMENDATION & SIGN IN */}
            {step === 4 && recommendation && (
              <motion.div
                key="s4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col h-full"
              >
                <div className="flex-1">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6"
                  >
                    <span className={`w-2 h-2 rounded-full animate-pulse ${recommendation.panelBgClass.replace('/10', '')}`} />
                    <span className="text-white/70 text-[11px] font-mono uppercase tracking-widest">Plan Matched</span>
                  </motion.div>
                  
                  <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                    {recommendation.name}
                  </h1>
                  
                  <p className="text-white/60 text-[15px] mb-8">
                    {recommendation.price > 0 ? (
                      <>
                        Starting from <span className="text-white font-bold">${recommendation.price}/mo</span>.
                      </>
                    ) : (
                      <span className="text-white/80">Custom pricing — we'll scope this with you.</span>
                    )}
                  </p>

                  <div className={`relative p-6 md:p-8 border border-white/10 rounded-3xl mb-8 overflow-hidden bg-white/[0.02]`}>
                    <div className={`absolute top-0 right-0 w-64 h-64 ${recommendation.panelBgClass} blur-[100px] rounded-full pointer-events-none opacity-50`} />
                    
                    <p className="text-white/90 text-[15px] md:text-[16px] leading-relaxed relative z-10 font-medium mb-6">
                      {recommendation.tagline}
                    </p>
                    
                    <ul className="space-y-4 relative z-10">
                      {recommendation.bullets.map((line) => (
                        <li key={line} className="text-white/70 text-[14px] flex items-start gap-3">
                          <span className={`${recommendation.accentClass} mt-0.5`}><i className="fa-solid fa-circle-check" /></span>
                          <span className="leading-snug">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/0 rounded-2xl opacity-50 blur transition duration-500 group-hover:opacity-100" />
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={() => void handleSignIn()}
                      className="relative w-full py-4 md:py-5 rounded-2xl bg-white text-black hover:bg-white/90 transition-all font-bold text-[15px] flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      {signingIn ? (
                        <i className="fa-solid fa-spinner fa-spin text-lg" />
                      ) : (
                        <i className="fa-brands fa-google text-xl" />
                      )}
                      {signingIn ? 'Creating your account…' : 'Continue with Google'}
                    </button>
                  </div>
                  <p className="text-center text-white/30 text-[12px] mt-5">
                    By continuing, you agree to Draftly's Terms of Service and Privacy Policy.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}