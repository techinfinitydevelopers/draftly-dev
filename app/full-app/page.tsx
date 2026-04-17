'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useRouter } from 'next/navigation';

export default function FullAppRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the new Memory page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/memory');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-obsidian via-charcoal to-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[800px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
              <i className="fa-solid fa-brain text-white text-5xl"></i>
            </div>
            <h1 className="font-display text-5xl text-white mb-4 font-bold">Feature Upgraded!</h1>
            <p className="text-mist text-xl mb-8 leading-relaxed">
              The Full App feature has been replaced with something even better:
            </p>
            <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 rounded-2xl p-8 mb-8">
              <h2 className="font-display text-3xl text-white mb-4 font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Super Memory
              </h2>
              <p className="text-mist text-lg mb-6">
                Your AI-powered brand consistency engine that automatically stores your design preferences, 
                colors, themes, and styles to ensure every creation matches your brand identity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => router.push('/memory')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-display text-lg hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 shadow-xl shadow-purple-500/30"
                >
                  <i className="fa-solid fa-brain mr-2"></i>
                  Explore Super Memory
                </button>
                <p className="text-mist text-sm">
                  Redirecting automatically in 3 seconds...
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-gradient-to-br from-charcoal/80 to-obsidian border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <i className="fa-solid fa-palette text-purple-400 text-2xl"></i>
              </div>
              <h3 className="text-white font-display text-lg mb-2">Brand DNA</h3>
              <p className="text-mist text-sm">Stores colors, fonts, and themes automatically</p>
            </div>
            <div className="bg-gradient-to-br from-charcoal/80 to-obsidian border border-pink-500/30 rounded-xl p-6 hover:border-pink-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <i className="fa-solid fa-magic text-pink-400 text-2xl"></i>
              </div>
              <h3 className="text-white font-display text-lg mb-2">Smart Presets</h3>
              <p className="text-mist text-sm">AI generates presets from your history</p>
            </div>
            <div className="bg-gradient-to-br from-charcoal/80 to-obsidian border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <i className="fa-solid fa-arrows-rotate text-orange-400 text-2xl"></i>
              </div>
              <h3 className="text-white font-display text-lg mb-2">Auto-Consistency</h3>
              <p className="text-mist text-sm">Every creation matches your brand</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
