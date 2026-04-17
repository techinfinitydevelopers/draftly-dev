'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/* Public pages that should NEVER show a loading gate */
const PUBLIC_PAGES = [
  '/',
  '/onboarding',
  '/pricing',
  '/about',
  '/ai-model',
  '/presets',
  '/env-check',
  '/memory',
  '/full-app',
  '/projects-dashboard',
  '/changelog',
  '/engine',
  '/builder',
  '/full-app-builder',
  '/publish-mobile',
  '/studio',
  '/3d-builder',
];

/* Pages that require login but not onboarding */
const USER_PAGES = ['/profile', '/projects', '/dashboard', '/onboarding', '/settings'];

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Public pages skip the check entirely — render immediately
  const isPublic = PUBLIC_PAGES.includes(pathname) || pathname.startsWith('/docs/') || pathname.startsWith('/api-reference/');
  const [checking, setChecking] = useState(!isPublic);

  useEffect(() => {
    // Public pages are already allowed, no check needed
    if (isPublic) {
      setChecking(false);
      return;
    }

    // For protected pages, wait for auth to load
    if (loading) return;

    // Allow logged-in users to access user pages
    if (user && (USER_PAGES.includes(pathname) || pathname.startsWith('/project/'))) {
      setChecking(false);
      return;
    }

    // Not logged in on a protected page → redirect to home
    if (!user) {
      router.push('/');
      setChecking(false);
      return;
    }

    // Default: allow
    setChecking(false);
  }, [user, loading, pathname, router, isPublic]);

  // No loading spinner for public pages — render instantly
  if (checking) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-white/30"></i>
      </div>
    );
  }

  return <>{children}</>;
}
