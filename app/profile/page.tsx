'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { listProjectsFromFirebase, getProjectSiteCodeForPreview } from '@/lib/firebase-3d-projects';
import { devError, devWarn } from '@/lib/client-log';

const PLAN_CREDITS: Record<string, number> = {
  free: 0,
  tester: 200,
  basic: 1500,
  'basic-plus': 2500,
  pro: 6000,
  premium: 25000,
  agency: 125000,
};

interface UserProfile {
  name: string;
  businessType: string;
  referralSource: string;
  email: string;
  photoURL: string;
  onboardingComplete: boolean;
  createdAt: any;
}

interface ThreeDProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sitePrompt: string;
  bgPrompt: string;
  bgImageUrl: string | null;
  siteCode: string | null;
  siteCodePath?: string;
  messages: Array<{ role: string; text: string; ts: number }>;
}

/** Must match `app/3d-builder/page.tsx` — projects may live in global and/or user-scoped keys. */
const GLOBAL_3D_PROJECTS_KEY = 'draftly-3d-projects-v1';

function getThreeDProjectsStorageKey(userId?: string | null): string {
  return userId ? `${GLOBAL_3D_PROJECTS_KEY}:${userId}` : GLOBAL_3D_PROJECTS_KEY;
}

const MAX_PROFILE_3D_PROJECTS = 20;

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscription, generationTracking, isPro } = useSubscription();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentProjects, setRecentProjects] = useState<ThreeDProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectPreviews, setProjectPreviews] = useState<Record<string, string>>({});
  const fetchedPreviewsRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  // Lazy-load site code for Firebase-only projects (for profile card preview)
  useEffect(() => {
    if (!user?.uid || recentProjects.length === 0) return;
    const toFetch = recentProjects.filter(
      (p) => p.siteCodePath && !p.siteCode && !fetchedPreviewsRef.current.has(p.id)
    );
    if (toFetch.length === 0) return;
    let cancelled = false;
    toFetch.slice(0, 3).forEach((p) => {
      fetchedPreviewsRef.current.add(p.id);
      getProjectSiteCodeForPreview(user.uid, p.id)
        .then((code) => {
          if (!cancelled && code)
            setProjectPreviews((prev) => ({ ...prev, [p.id]: code }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [user?.uid, recentProjects]);

  const planLabel = subscription.plan === 'basic-plus' ? 'Basic Plus' : subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
  const isPaidPlan = ['tester', 'basic', 'basic-plus', 'pro', 'premium', 'agency'].includes(subscription.plan) && subscription.status === 'active';
  const planBadgeClass =
    subscription.plan === 'premium'
      ? 'from-fuchsia-400 to-purple-500'
      : subscription.plan === 'pro'
        ? 'from-yellow-400 to-orange-500'
        : subscription.plan === 'agency'
          ? 'from-amber-300 to-rose-400'
        : subscription.plan === 'basic-plus'
          ? 'from-emerald-400 to-teal-500'
          : subscription.plan === 'tester'
            ? 'from-gray-400 to-gray-500'
            : 'from-cyan-400 to-blue-500';
  const creditsUsed = generationTracking.creditsUsed || 0;
  const customCredits = (subscription as unknown as Record<string, unknown>).customStudioCredits;
  const creditsTotal = typeof customCredits === 'number' ? customCredits : (PLAN_CREDITS[subscription.plan] || 5);
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const usedPercent = creditsTotal > 0 ? Math.min((creditsUsed / creditsTotal) * 100, 100) : 0;

  const formatDate = (value?: string) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString();
  };

  const getMonthlyPrice = (plan: string) => {
    if (plan === 'tester') return '$4.99/mo';
    if (plan === 'basic') return '$25/mo';
    if (plan === 'pro') return '$60/mo';
    if (plan === 'premium') return '$200/mo';
    if (plan === 'agency') return '$1,000/mo';
    return 'Free';
  };

  const openProjectInBuilder = (projectId: string) => {
    router.push(`/3d-builder?projectId=${encodeURIComponent(projectId)}&view=workspace`);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    loadProfileData();
  }, [user, authLoading, router]);

  const loadProfileData = async () => {
    if (!user || !db) return;

    try {
      // Load user profile from localStorage
      const storedProfile = localStorage.getItem(`draftly_profile_${user.uid}`);
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile) as UserProfile);
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as Record<string, unknown>;
        setProfile((prev) => ({
          name: String(userData.displayName || prev?.name || user.displayName || 'User'),
          businessType: String(userData.businessType || prev?.businessType || 'Not set'),
          referralSource: String(userData.referralSource || prev?.referralSource || ''),
          email: String(userData.email || user.email || ''),
          photoURL: String(userData.photoURL || user.photoURL || ''),
          onboardingComplete: Boolean(userData.onboardingComplete),
          createdAt: userData.createdAt || null,
        }));
      }

      // Load 3D builder projects: merge global + user-scoped localStorage (same as 3D builder page), then Firebase.
      const userScopedKey = getThreeDProjectsStorageKey(user.uid);
      const rawGlobal = localStorage.getItem(GLOBAL_3D_PROJECTS_KEY);
      const rawUser = localStorage.getItem(userScopedKey);
      if (!rawUser && rawGlobal) {
        try {
          localStorage.setItem(userScopedKey, rawGlobal);
        } catch {
          /* quota */
        }
      }

      const localProjects: ThreeDProject[] = [];
      const pushParsed = (raw: string | null) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as ThreeDProject[];
          if (Array.isArray(parsed)) localProjects.push(...parsed);
        } catch {
          /* ignore */
        }
      };
      pushParsed(rawGlobal);
      if (userScopedKey !== GLOBAL_3D_PROJECTS_KEY) {
        pushParsed(rawUser);
      }
      const byIdLocal = new Map<string, ThreeDProject>();
      for (const p of localProjects) {
        if (!p?.id) continue;
        const existing = byIdLocal.get(p.id);
        const newer = !existing || (p.updatedAt || 0) >= (existing.updatedAt || 0);
        if (newer) byIdLocal.set(p.id, p);
      }
      const dedupedLocal = Array.from(byIdLocal.values());

      // Fetch from Firebase and merge (Firebase projects appear when user returns from different device)
      let firebaseProjects: ThreeDProject[] = [];
      try {
        const fbList = await listProjectsFromFirebase(user.uid);
        firebaseProjects = fbList.map((m) => ({
          id: m.id,
          name: m.name,
          createdAt: m.createdAt ?? 0,
          updatedAt: m.updatedAt ?? 0,
          sitePrompt: m.sitePrompt ?? '',
          bgPrompt: m.bgPrompt ?? '',
          bgImageUrl: m.bgImageUrl ?? null,
          siteCode: null,
          siteCodePath: m.siteCodePath,
          messages: Array.isArray(m.messages) ? m.messages : [],
        }));
      } catch (e) {
        devWarn('Profile: Firebase projects load failed', e);
      }

      const byId = new Map<string, ThreeDProject>();
      for (const p of [...dedupedLocal, ...firebaseProjects]) {
        if (!p?.id) continue;
        const existing = byId.get(p.id);
        const pUpdated = p.updatedAt ?? 0;
        const existingUpdated = existing?.updatedAt ?? 0;
        if (!existing || pUpdated >= existingUpdated) {
          byId.set(p.id, {
            ...p,
            siteCode: existing?.siteCode ?? p.siteCode ?? null,
            messages: existing?.messages ?? p.messages ?? [],
          });
        } else {
          byId.set(p.id, { ...existing, siteCode: existing.siteCode ?? null, messages: existing.messages ?? [] });
        }
      }
      const merged = Array.from(byId.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setRecentProjects(merged.slice(0, MAX_PROFILE_3D_PROJECTS));
    } catch (error) {
      devError('Error loading profile', error);
    } finally {
      setLoading(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-50">
          <Header />
        </div>
        <div className="pt-32 px-6 flex items-center justify-center relative z-10">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-mist"></i>
          <p className="text-white ml-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-50">
          <Header />
        </div>
        <div className="pt-32 px-6 text-center relative z-10">
          <h1 className="font-display text-4xl text-white mb-4">Sign in to view profile</h1>
          <p className="text-mist">Please sign in to access your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-50">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="font-display text-5xl text-white mb-2">Profile</h1>
            <p className="text-mist">Your workspace and quick actions</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Profile Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-stone bg-charcoal p-6"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-white mb-4 overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    {profile?.photoURL || user?.photoURL ? (
                      <img
                        src={profile?.photoURL || user?.photoURL || '/profilepic.png'}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/profilepic.png';
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-user text-4xl text-gray-400" />
                    )}
                  </div>
                  {isPaidPlan && (
                    <div className={`absolute -top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r ${planBadgeClass} text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
                      <i className="fa-solid fa-crown mr-1"></i>{planLabel.toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-white font-display text-xl mb-1 mt-1">{profile?.name || 'User'}</h2>
                <p className="text-mist text-xs font-mono break-all">{user.email}</p>
              </div>

              <div className="space-y-4 border-t border-stone pt-6">
                <div>
                  <p className="text-mist text-xs font-mono mb-1">PLAN</p>
                  <p className="text-white font-display text-lg uppercase">
                    {isPaidPlan ? (
                      <span className="text-yellow-400">
                        <i className="fa-solid fa-crown mr-1"></i>{planLabel}
                      </span>
                    ) : (
                      'Free'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-mist text-xs font-mono mb-1">CREDITS USED</p>
                  <p className="text-white font-display text-2xl">
                    {creditsUsed} <span className="text-sm text-mist">/ {creditsTotal}</span>
                  </p>
                  <div className="w-full bg-stone h-1 mt-2 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all"
                      style={{ width: `${Math.max(2, usedPercent)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-mist text-xs font-mono mb-1">INDUSTRY</p>
                  <p className="text-white font-mono text-sm">{profile?.businessType || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-mist text-xs font-mono mb-1">TOTAL PROJECTS</p>
                  <p className="text-white font-display text-3xl">{recentProjects.length}</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {!isPro && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-500 hover:to-orange-600 transition text-sm font-bold"
                  >
                    <i className="fa-solid fa-crown mr-2"></i>
                    Upgrade to Pro
                  </button>
                )}
                {isPro && (
                  <button
                    onClick={() => router.push('/settings')}
                    className="w-full py-3 bg-orange-500 text-white hover:bg-orange-600 transition text-sm font-bold"
                  >
                    <i className="fa-solid fa-key mr-2"></i>
                    Settings & Integrations
                  </button>
                )}
                <button
                  onClick={() => router.push('/3d-builder')}
                  className="w-full py-3 bg-white text-black hover:bg-mist transition text-sm font-mono"
                >
                  <i className="fa-solid fa-cube mr-2"></i>
                  Open 3D Builder
                </button>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="w-full py-3 border border-stone text-white hover:bg-graphite transition text-sm font-mono"
                >
                  <i className="fa-solid fa-edit mr-2"></i>
                  Edit Profile
                </button>
                <button
                  onClick={signOut}
                  className="w-full py-3 border border-stone text-mist hover:text-white hover:bg-graphite transition text-sm font-mono"
                >
                  <i className="fa-solid fa-sign-out-alt mr-2"></i>
                  Sign Out
                </button>
              </div>
            </motion.div>

            {/* 3D Builder Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border border-stone bg-charcoal p-6 md:p-8 lg:col-span-3"
            >
              <h2 className="font-display text-xl md:text-2xl text-white mb-2">3D Builder Workspace</h2>
              <p className="text-mist text-sm mb-4">
                Old template-based builder is removed. Continue every project directly in the 3D chat + live preview workflow.
              </p>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 mb-6">
                <p className="text-amber-100 text-sm font-medium">
                  Download the ZIP file from the builder to view your projects on your own computer. Run the included instructions in the terminal to install dependencies and run locally — works on Windows, Mac, and Linux.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">SAVED 3D PROJECTS</p>
                  <p className="text-white font-display text-3xl">{recentProjects.length}</p>
                </div>
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">TOTAL CHAT MESSAGES</p>
                  <p className="text-white font-display text-3xl">
                    {recentProjects.reduce((sum, project) => sum + (project.messages?.length || 0), 0)}
                  </p>
                </div>
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">LAST ACTIVITY</p>
                  <p className="text-white font-mono text-sm mt-2">
                    {recentProjects[0]?.updatedAt ? new Date(recentProjects[0].updatedAt).toLocaleString() : 'No activity yet'}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => router.push('/3d-builder')}
                  className="px-5 py-2.5 bg-white text-black hover:bg-mist transition text-sm font-semibold"
                >
                  <i className="fa-solid fa-diagram-project mr-2"></i>
                  Continue in 3D Builder
                </button>
              </div>
            </motion.div>

            {/* Recent 3D Projects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-stone bg-charcoal p-6 md:p-8 lg:col-span-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-white">Recent 3D Projects</h2>
                <button
                  onClick={() => router.push('/3d-builder')}
                  className="text-sm text-mist hover:text-white transition font-mono"
                >
                  Open Builder →
                </button>
              </div>

              {recentProjects.length === 0 ? (
                <div className="text-center py-12 border border-stone">
                  <i className="fa-solid fa-folder-open text-4xl text-mist mb-4"></i>
                  <p className="text-white font-mono text-sm mb-4">No 3D projects yet</p>
                  <button
                    onClick={() => router.push('/3d-builder')}
                    className="px-6 py-2 bg-white text-black hover:bg-mist transition font-mono text-sm"
                  >
                    Create First 3D Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentProjects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="border border-stone hover:border-mist transition group overflow-hidden"
                    >
                      <button
                        onClick={() => openProjectInBuilder(project.id)}
                        className="w-full text-left"
                      >
                        <div className="aspect-video bg-graphite border-b border-stone relative overflow-hidden">
                          {(project.siteCode || projectPreviews[project.id]) ? (
                            <iframe
                              srcDoc={(project.siteCode || projectPreviews[project.id] || '').replace('<head>', `<head><script>window.__FRAME_DATA_URLS = ["${project.bgImageUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}"]; window.__VIDEO_DATA_URL = "${project.bgImageUrl || ''}";</script>`)}
                              className="w-full h-full pointer-events-none scale-50 origin-top-left"
                              style={{ width: '200%', height: '200%' }}
                              title={`Preview ${project.id}`}
                              sandbox="allow-scripts allow-same-origin"
                            />
                          ) : project.bgImageUrl ? (
                            <img src={project.bgImageUrl} alt={project.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-mist">
                              <i className="fa-solid fa-cube text-2xl"></i>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <p className="text-white font-mono text-sm mb-2 line-clamp-2">
                            {project.name || project.sitePrompt || 'Untitled 3D Project'}
                          </p>
                          <p className="text-mist text-xs font-mono line-clamp-2 mb-2">
                            {project.sitePrompt || project.bgPrompt || 'No prompt saved yet'}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-mist font-mono">
                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                            <span>{project.messages?.length || 0} chats</span>
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => openProjectInBuilder(project.id)}
                          className="w-full opacity-90 group-hover:opacity-100 transition px-3 py-2 border border-stone text-white hover:bg-graphite text-xs font-mono"
                        >
                          <i className="fa-solid fa-arrow-right mr-1"></i>
                          Open in Chat + Preview
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Billing & Usage Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="border border-stone bg-charcoal p-6 md:p-8 lg:col-span-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-white">Billing & Usage</h2>
                <span className="text-xs font-mono text-mist">Plan: {planLabel}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">CREDITS USED</p>
                  <p className="text-white font-display text-2xl">{creditsUsed}</p>
                  <p className="text-mist text-xs mt-1">out of {creditsTotal}</p>
                </div>
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">STUDIO USAGE</p>
                  <p className="text-white font-display text-xl">
                    {(generationTracking.studioImageGenerations || 0)} img / {(generationTracking.studioVideoGenerations || 0)} vid
                  </p>
                  <p className="text-mist text-xs mt-1">Current cycle</p>
                </div>
                <div className="border border-stone p-4">
                  <p className="text-mist text-xs font-mono mb-1">3D BUILDER USAGE</p>
                  <p className="text-white font-display text-xl">
                    {generationTracking.fullAppsGenerated || 0} full apps
                  </p>
                  <p className="text-mist text-xs mt-1">
                    {(generationTracking.uiPreviewsGenerated || 0)} UI previews, {(generationTracking.chatsUsed || 0)} chats
                  </p>
                </div>
              </div>

              {/* Define a helper right before usage to inject frame data into siteCode for preview */}
              <div className="border border-stone p-5 mb-6">
                <h3 className="text-white font-display text-lg mb-3">Billing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p className="text-mist">
                    <span className="text-white">Current price:</span> {getMonthlyPrice(subscription.plan)}
                  </p>
                  <p className="text-mist">
                    <span className="text-white">Started on:</span> {formatDate(subscription.startDate)}
                  </p>
                  <p className="text-mist">
                    <span className="text-white">Next renewal:</span> {formatDate(subscription.endDate)}
                  </p>
                  <p className="text-mist">
                    <span className="text-white">Status:</span>{' '}
                    {subscription.status}
                  </p>
                </div>
              </div>

              {isPaidPlan && (
                <div className="border border-stone p-5">
                  <h3 className="text-white font-display text-lg mb-3">Retention Offers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-stone p-3">
                      <p className="text-white text-sm font-semibold mb-1">10% next-cycle discount</p>
                      <p className="text-mist text-xs">
                        Stay active into the next billing cycle and get 10% off your next Pro/Premium invoice.
                      </p>
                    </div>
                    <div className="border border-stone p-3">
                      <p className="text-white text-sm font-semibold mb-1">Loyalty credit bonus</p>
                      <p className="text-mist text-xs">
                        Complete 2 consecutive paid months and unlock a one-time +500 credits boost.
                      </p>
                    </div>
                    <div className="border border-stone p-3">
                      <p className="text-white text-sm font-semibold mb-1">Annual save upgrade</p>
                      <p className="text-mist text-xs">
                        Switch to annual anytime and lock a larger long-term discount with priority support.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-stone bg-obsidian">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <span className="font-display font-bold text-2xl tracking-tight text-white block mb-2">
              DRAFTLY
            </span>
            <p className="text-xs text-ash font-mono">© 2025 DRAFTLY INC. SYSTEM OPERATIONAL.</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="#" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-github"></i>
            </a>
            <a href="#" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-discord"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
