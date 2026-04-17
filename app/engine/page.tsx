'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NodeNetwork from '@/components/NodeNetwork';
import EngineSection from '@/components/landing/EngineSection';

export default function EnginePage() {
  return (
    <div className="min-h-screen bg-[#050508] relative">
      {/* Animated node network background */}
      <NodeNetwork />

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-500/[0.012] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-rose-500/[0.008] rounded-full blur-[100px] pointer-events-none" />

      <Header />
      <div className="relative z-10 pt-16">
        <EngineSection />
      </div>
      <Footer />
    </div>
  );
}
