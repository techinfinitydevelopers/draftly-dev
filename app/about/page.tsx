'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NodeNetwork from '@/components/NodeNetwork';
import AboutSection from '@/components/landing/AboutSection';

export default function AboutPage() {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash === 'connect') {
      const el = document.getElementById('connect');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] relative">
      {/* Animated node network background */}
      <NodeNetwork />

      {/* Ambient glows */}
      <div className="fixed top-1/3 left-0 w-[500px] h-[500px] bg-emerald-500/[0.012] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-0 w-[400px] h-[400px] bg-cyan-500/[0.01] rounded-full blur-[100px] pointer-events-none" />

      <Header />
      <div className="relative z-10 pt-16">
        <AboutSection />
      </div>
      <Footer />
    </div>
  );
}
