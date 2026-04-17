'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { devError, devWarn } from '@/lib/client-log';

interface BrandMemory {
  colors: string[];
  fonts: string[];
  themes: string[];
  styles: string[];
  businessType: string;
  lastUsed: string;
}

export default function SuperMemory() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const router = useRouter();
  const [brandMemory, setBrandMemory] = useState<BrandMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationCount, setGenerationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBrandMemory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (!db) {
        devWarn('Firebase not initialized');
        setLoading(false);
        return;
      }

      try {
        const memoryRef = doc(db, 'users', user.uid, 'memory', 'brand');
        const memoryDoc = await getDoc(memoryRef);
        
        if (memoryDoc.exists()) {
          setBrandMemory(memoryDoc.data() as BrandMemory);
          
          // Count how many times this memory has been used
          const projectsRef = doc(db, 'users', user.uid, 'stats', 'memory');
          const statsDoc = await getDoc(projectsRef);
          if (statsDoc.exists()) {
            setGenerationCount(statsDoc.data().count || 0);
          }
        }
      } catch (error: any) {
        devError('Failed to load brand memory', error);
        setError(error.message || 'Failed to load brand memory');
      } finally {
        setLoading(false);
      }
    };

    loadBrandMemory();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-10">
          <Header />
        </div>
        <section className="pt-32 pb-24 px-6 relative z-10">
          <div className="max-w-[1200px] mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <div className="inline-block mb-6">
                <div className="w-24 h-24 bg-orange-500/20 border border-orange-500/30 rounded-3xl flex items-center justify-center mx-auto">
                  <i className="fa-solid fa-brain text-orange-500 text-5xl"></i>
                </div>
              </div>
              <h1 className="font-display text-6xl text-white mb-6 font-bold">
                Super Memory
              </h1>
              <p className="text-mist text-xl max-w-[700px] mx-auto leading-relaxed">
                Your AI-powered brand consistency engine. Create once, maintain forever.
              </p>
            </motion.div>

            {/* Sign In CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-[600px] mx-auto mb-16"
            >
              <div className="border border-stone bg-charcoal p-8">
                <h2 className="font-display text-2xl text-white mb-4 text-center">Sign in to Get Started</h2>
                <p className="text-mist mb-6 text-center">
                  Unlock Super Memory and let AI remember your brand identity across all your content.
                </p>
                <button
                  onClick={() => void signInWithGoogle()}
                  className="w-full py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105 flex items-center justify-center gap-3"
                >
                  <i className="fa-brands fa-google text-xl"></i>
                  <span>Sign in with Google</span>
                </button>
              </div>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
            >
              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-palette text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Brand DNA Storage</h3>
                <p className="text-mist text-sm leading-relaxed">
                  Automatically captures and stores your brand colors, fonts, themes, and design preferences from every creation.
                </p>
              </div>

              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-magic text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Smart Presets</h3>
                <p className="text-mist text-sm leading-relaxed">
                  AI automatically generates custom presets based on your past work, making future designs instant and consistent.
                </p>
              </div>

              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-arrows-rotate text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Auto-Consistency</h3>
                <p className="text-mist text-sm leading-relaxed">
                  Every new poster, video, or content piece automatically matches your established brand identity.
                </p>
              </div>

              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-clock-rotate-left text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Time Travel Memory</h3>
                <p className="text-mist text-sm leading-relaxed">
                  Access design choices from weeks or months ago. Your brand memory never forgets, always recalls.
                </p>
              </div>

              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-briefcase text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Business Context</h3>
                <p className="text-mist text-sm leading-relaxed">
                  Understands your business type and industry, applying appropriate tone, style, and messaging.
                </p>
              </div>

              <div className="border border-stone bg-charcoal p-6 hover:border-white transition">
                <div className="w-14 h-14 border border-stone flex items-center justify-center mb-4">
                  <i className="fa-solid fa-wand-magic-sparkles text-white text-2xl"></i>
                </div>
                <h3 className="text-white font-display text-xl mb-3 font-semibold">Cross-Platform Unity</h3>
                <p className="text-mist text-sm leading-relaxed">
                  Whether it's a poster, video, website, or social media content, everything stays on-brand automatically.
                </p>
              </div>
            </motion.div>

            {/* How It Works Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-16"
            >
              <h2 className="font-display text-4xl text-white mb-12 text-center font-bold">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center border border-stone bg-charcoal p-6">
                  <div className="w-16 h-16 border border-stone flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">1</span>
                  </div>
                  <h3 className="text-white font-display text-lg mb-2">Create Content</h3>
                  <p className="text-mist text-sm">Generate your first poster, video, or design with custom colors and fonts.</p>
                </div>

                <div className="text-center border border-stone bg-charcoal p-6">
                  <div className="w-16 h-16 border border-stone flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">2</span>
                  </div>
                  <h3 className="text-white font-display text-lg mb-2">AI Learns</h3>
                  <p className="text-mist text-sm">Super Memory captures your brand DNA: colors, themes, styles, and preferences.</p>
                </div>

                <div className="text-center border border-stone bg-charcoal p-6">
                  <div className="w-16 h-16 border border-stone flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">3</span>
                  </div>
                  <h3 className="text-white font-display text-lg mb-2">Auto Presets</h3>
                  <p className="text-mist text-sm">AI generates smart presets based on your history, ready to use instantly.</p>
                </div>

                <div className="text-center border border-stone bg-charcoal p-6">
                  <div className="w-16 h-16 border border-stone flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">4</span>
                  </div>
                  <h3 className="text-white font-display text-lg mb-2">Stay Consistent</h3>
                  <p className="text-mist text-sm">Every new creation automatically follows your brand guidelines without effort.</p>
                </div>
              </div>
            </motion.div>

            {/* Use Cases */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-16"
            >
              <h2 className="font-display text-4xl text-white mb-12 text-center font-bold">Perfect For</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-start gap-4">
                    <i className="fa-solid fa-building text-3xl text-white mt-1"></i>
                    <div>
                      <h3 className="text-white font-display text-lg mb-2 font-semibold">Businesses & Startups</h3>
                      <p className="text-mist text-sm">Maintain brand consistency across marketing materials, social media, and websites without hiring a full design team.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-start gap-4">
                    <i className="fa-solid fa-pen-fancy text-3xl text-white mt-1"></i>
                    <div>
                      <h3 className="text-white font-display text-lg mb-2 font-semibold">Content Creators</h3>
                      <p className="text-mist text-sm">Create thumbnails, banners, and graphics that instantly match your established style and brand identity.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-start gap-4">
                    <i className="fa-solid fa-chart-line text-3xl text-white mt-1"></i>
                    <div>
                      <h3 className="text-white font-display text-lg mb-2 font-semibold">Marketing Teams</h3>
                      <p className="text-mist text-sm">Generate campaign assets that automatically comply with brand guidelines and maintain visual coherence.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-start gap-4">
                    <i className="fa-solid fa-users text-3xl text-white mt-1"></i>
                    <div>
                      <h3 className="text-white font-display text-lg mb-2 font-semibold">Agencies</h3>
                      <p className="text-mist text-sm">Manage multiple client brands with AI-powered memory that keeps each brand's identity separate and consistent.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="text-center border border-stone bg-charcoal p-12"
            >
              <h2 className="font-display text-3xl text-white mb-4 font-bold">Ready to Build Your Brand Memory?</h2>
              <p className="text-mist text-lg mb-8 max-w-[600px] mx-auto">
                Sign in now and let Super Memory transform how you create consistent, professional content.
              </p>
              <button
                onClick={() => void signInWithGoogle()}
                className="px-8 py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105"
              >
                <i className="fa-solid fa-brain mr-2"></i>
                Get Started Free
              </button>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  // Authenticated User View
  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-brain text-orange-500 text-3xl"></i>
              </div>
              <div>
                <h1 className="font-display text-4xl text-white font-bold">Your Super Memory</h1>
                <p className="text-mist text-lg">AI-powered brand consistency at your fingertips</p>
              </div>
            </div>

            {!isPro && (
              <div className="border border-orange-500/30 bg-orange-500/10 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-crown text-orange-400 text-xl mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold mb-1">Upgrade to Pro for Advanced Memory Features</p>
                    <p className="text-white/70 text-xs mb-3">Unlock unlimited brand memory storage, smart presets, and cross-platform consistency.</p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-500 mb-4"></i>
                <p className="text-mist">Loading your brand memory...</p>
              </div>
            </div>
          ) : brandMemory ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <i className="fa-solid fa-palette text-white text-2xl"></i>
                    <h3 className="text-white font-display text-lg font-semibold">Brand Colors</h3>
                  </div>
                  <p className="text-mist text-sm mb-3">Your signature color palette</p>
                  <div className="flex gap-2 flex-wrap">
                    {brandMemory.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-lg border border-stone"
                        style={{ backgroundColor: color }}
                        title={color}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <i className="fa-solid fa-font text-white text-2xl"></i>
                    <h3 className="text-white font-display text-lg font-semibold">Typography</h3>
                  </div>
                  <p className="text-mist text-sm mb-3">Your preferred fonts</p>
                  <div className="space-y-2">
                    {brandMemory.fonts.slice(0, 3).map((font, i) => (
                      <div key={i} className="text-white text-sm font-medium bg-white/10 px-3 py-1.5 rounded-lg">
                        {font}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <i className="fa-solid fa-chart-line text-white text-2xl"></i>
                    <h3 className="text-white font-display text-lg font-semibold">Usage Stats</h3>
                  </div>
                  <p className="text-mist text-sm mb-3">Memory-powered generations</p>
                  <div className="text-white text-3xl font-bold">{generationCount}</div>
                  <p className="text-mist text-xs mt-1">designs created with your brand</p>
                </div>
              </div>

              {/* Brand Details */}
              <div className="border border-stone bg-charcoal p-6">
                <h3 className="text-white font-display text-xl mb-4 font-semibold">
                  <i className="fa-solid fa-briefcase text-white mr-2"></i>
                  Business Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-mist text-sm mb-2">Business Type</p>
                    <p className="text-white text-lg font-medium">{brandMemory.businessType || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-mist text-sm mb-2">Last Updated</p>
                    <p className="text-white text-lg font-medium">
                      {brandMemory.lastUsed ? new Date(brandMemory.lastUsed).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Themes & Styles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-stone bg-charcoal p-6">
                  <h3 className="text-white font-display text-xl mb-4 font-semibold">
                    <i className="fa-solid fa-paintbrush text-white mr-2"></i>
                    Design Themes
                  </h3>
                  <div className="space-y-2">
                    {brandMemory.themes.length > 0 ? (
                      brandMemory.themes.map((theme, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <i className="fa-solid fa-check text-white"></i>
                          <span className="text-white text-sm">{theme}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-mist text-sm">No themes saved yet. Create your first design!</p>
                    )}
                  </div>
                </div>

                <div className="border border-stone bg-charcoal p-6">
                  <h3 className="text-white font-display text-xl mb-4 font-semibold">
                    <i className="fa-solid fa-wand-magic-sparkles text-white mr-2"></i>
                    Style Preferences
                  </h3>
                  <div className="space-y-2">
                    {brandMemory.styles.length > 0 ? (
                      brandMemory.styles.map((style, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <i className="fa-solid fa-check text-white"></i>
                          <span className="text-white text-sm">{style}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-mist text-sm">No styles saved yet. Create your first design!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Create with Memory
                </button>
                <button
                  onClick={() => router.push('/presets')}
                  className="flex-1 py-4 bg-white/10 border border-stone text-white rounded-lg font-display text-lg hover:bg-white/20 transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-layer-group mr-2"></i>
                  View Presets
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 bg-orange-500/20 border border-orange-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-brain text-orange-500 text-5xl"></i>
              </div>
              <h2 className="font-display text-3xl text-white mb-4 font-bold">Start Building Your Brand Memory</h2>
              <p className="text-mist text-lg mb-8 max-w-[600px] mx-auto">
                Create your first design and Super Memory will automatically learn your brand preferences.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105"
              >
                <i className="fa-solid fa-rocket mr-2"></i>
                Create First Design
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

