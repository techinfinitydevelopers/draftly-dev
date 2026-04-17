'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/safe-web-storage';

const CONSENT_KEY = 'draftly_cookie_consent';
type ConsentValue = 'all' | 'essential' | null;

function getStoredConsent(): ConsentValue {
  const v = safeLocalStorageGetItem(CONSENT_KEY);
  if (v === 'all' || v === 'essential') return v;
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'all';
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = useCallback((level: 'all' | 'essential') => {
    safeLocalStorageSetItem(CONSENT_KEY, level);
    setVisible(false);
    if (level === 'all') {
      window.dispatchEvent(new CustomEvent('draftly:consent', { detail: { analytics: true } }));
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/[0.1] bg-[#0c0c14]/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] px-5 py-4 animate-[slideUp_0.4s_ease-out]">
        <p className="text-[13px] leading-relaxed text-white/75">
          We use cookies for authentication, analytics, and to improve your experience.{' '}
          <Link href="/legal/cookies" className="text-teal-300/90 underline underline-offset-2 hover:text-teal-200">
            Cookie Policy
          </Link>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => accept('all')}
            className="rounded-lg bg-white px-4 py-2 text-[12px] font-bold text-black hover:bg-white/90 transition-colors"
          >
            Accept all
          </button>
          <button
            onClick={() => accept('essential')}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/[0.1] transition-colors"
          >
            Essential only
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
