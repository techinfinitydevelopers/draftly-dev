'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PricingSection from '@/components/landing/PricingSection';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [curatedRole, setCuratedRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = window.sessionStorage.getItem('draftly_onboarding_role');
      if (role) {
        setCuratedRole(role);
      }
    }
    const from = searchParams.get('from');
    if (from === 'signin' || from === 'onboarding') {
      setShowWelcome(true);
      window.history.replaceState({}, '', '/pricing');
    }
  }, [searchParams]);

  const getWelcomeMessage = () => {
    if (typeof window !== 'undefined') {
      const fromOnboarding = window.sessionStorage.getItem('draftly_onboarding_answers');
      const planHint = window.sessionStorage.getItem('draftly_onboarding_plan');
      if (fromOnboarding && planHint) {
        const labels: Record<string, string> = {
          basic: 'Basic ($25/mo)',
          'basic-plus': 'Basic Plus ($40/mo)',
          pro: 'Pro ($60/mo)',
          premium: 'Premium ($200/mo)',
          agency: 'Agency (legacy)',
          enterprise: 'Enterprise (custom)',
        };
        const label = labels[planHint] || 'the plan we matched for you';
        return `You're signed in. On onboarding you picked ${label} — scroll below to subscribe and unlock 3D Builder and Studio.`;
      }
    }
    if (curatedRole === 'agency') return "Based on your needs as an Agency, we've curated Premium ($200/mo) for ZIP export, Business OS, and high-volume 3D delivery.";
    if (curatedRole === 'business') return "Based on your needs as a Business/In-house team, we've curated the Premium plan for optimal scaling and collaboration.";
    if (curatedRole === 'startup') return "Based on your needs as a Startup, we've curated the Pro plan to help you ship fast with great value.";
    if (curatedRole === 'solo' || curatedRole === 'freelancer' || curatedRole === 'individual')
      return "Based on your profile, Basic Plus ($40/mo) is a strong starting point — see the full grid below to subscribe.";
    return "A paid plan (Basic and up) is required to build 3D websites and unlock Studio. Pick a tier below to subscribe.";
  };

  return (
    <div className="min-h-screen bg-[#050508] relative">
      <Header />
      <div className="relative z-10 pt-16">
        {showWelcome && (
          <div className="mx-auto max-w-[900px] px-5 md:px-6 mb-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-5 py-4 text-center">
              <p className="text-emerald-200 text-[14px] md:text-[15px] font-medium leading-relaxed">
                {getWelcomeMessage()}
              </p>
            </div>
          </div>
        )}
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
}
