'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Header() {
  const { user, signOut, signInWithGoogle } = useAuth();
  const { subscription } = useSubscription();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const pathname = usePathname();

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const signedInUser = await signInWithGoogle({ skipNavigation: true });
      if (signedInUser && db) {
        const snap = await getDoc(doc(db, 'users', signedInUser.uid));
        if (snap.exists() && snap.data()?.onboardingComplete === true) {
          router.push('/');
        } else {
          router.push('/onboarding');
        }
      }
    } finally {
      setLoggingIn(false);
    }
  };
  const isStudioPage = pathname?.startsWith('/studio');
  const isBusinessOsPage = pathname?.startsWith('/business') || pathname?.startsWith('/internal');
  const isHome = pathname === '/';

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    // Ensure no stale mobile overlay blocks clicks after route changes.
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const goOnboarding = () => router.push('/onboarding');
    window.addEventListener('open-sign-in', goOnboarding);
    return () => window.removeEventListener('open-sign-in', goOnboarding);
  }, [router]);

  if (isStudioPage || isBusinessOsPage) return null;

  const nav = [
    { label: 'Features', href: isHome ? '#features' : '/#features' },
    { label: '3D Builder', href: '/3d-builder' },
    { label: 'Business OS', href: '/business' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];
  const showTierBadge =
    subscription.status === 'active' &&
    ['basic', 'pro', 'premium', 'agency', 'tester'].includes(subscription.plan);
  const tierLabel = subscription.plan.toUpperCase();
  const tierBadgeClass =
    subscription.plan === 'premium'
      ? 'text-fuchsia-300'
      : subscription.plan === 'pro'
      ? 'text-amber-300'
      : subscription.plan === 'basic'
      ? 'text-cyan-300'
      : 'text-emerald-300';

  const handleNav = (e: React.MouseEvent, href: string) => {
    if (isHome && href.startsWith('#')) {
      e.preventDefault();
      document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* ── Apple Dynamic Island Navbar ── */}
      <motion.nav
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 z-[60] flex justify-center w-full"
      >
        <div
          className={`
            flex items-center gap-1
            h-[52px] px-2 rounded-full
            transition-all duration-500
            ${scrolled
              ? 'bg-[#0c0c14]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'bg-[#0c0c14]/70 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
            }
          `}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 pl-2 sm:pl-3 pr-1 sm:pr-2 group flex-shrink-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.1] border border-white/[0.15] group-hover:bg-white/[0.18] transition-all duration-300">
              <div className="w-1.5 h-1.5 rounded-sm bg-white" />
            </div>
            <span className="font-display font-extrabold text-[14px] tracking-tight uppercase text-white/90 hidden sm:inline">
              Draftly
            </span>
          </Link>

          {/* Separator */}
          <div className="w-px h-5 bg-white/[0.08] mx-1 hidden lg:block" />

          {/* Nav links */}
          <div className="flex items-center gap-0 sm:gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNav(e, item.href)}
                className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-medium text-white/55 hover:text-white hover:bg-white/[0.08] transition-all duration-300 ${item.label === 'Features' ? 'hidden lg:block' : 'block'}`}
              >
                {item.label === '3D Builder' ? <><span className="sm:hidden">Builder</span><span className="hidden sm:inline">3D Builder</span></> : item.label}
              </Link>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-white/[0.08] mx-1 hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 pr-1 flex-shrink-0">
            {user ? (
              <>
                <Link
                  href="/profile"
                  title="Open profile"
                  className="w-8 h-8 rounded-full border border-white/[0.2] bg-white/[0.05] hover:bg-white/[0.12] transition-all inline-flex items-center justify-center overflow-hidden"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user text-[11px] text-white/80" />
                  )}
                </Link>
                {showTierBadge && <span className={`hidden md:inline text-[10px] font-semibold ${tierBadgeClass}`}>{tierLabel}</span>}
                <button
                  onClick={signOut}
                  className="hidden md:inline px-3 py-1.5 rounded-full text-[11px] font-medium text-white/35 hover:text-white/60 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleLogin()}
                  disabled={loggingIn}
                  className="hidden md:inline-flex px-4 py-2 rounded-full text-[12px] font-bold bg-transparent border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all items-center gap-2 disabled:opacity-50"
                >
                  {loggingIn ? <i className="fa-solid fa-spinner fa-spin text-[11px]" /> : <i className="fa-brands fa-google text-[11px]" />}
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/onboarding')}
                  className="hidden md:inline-flex px-4 py-2 rounded-full text-[12px] font-bold bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all items-center gap-2"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[11px] opacity-90" />
                  Get started
                </button>
              </>
            )}
            <button
              className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-white/50 bg-white/[0.06] hover:bg-white/[0.12] transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xs`} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pt-20 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-4 bg-[#0e0e18]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl overflow-hidden shadow-2xl">
              <div className="py-3 px-3">
                {nav.map((item) => (
                  <Link key={item.label} href={item.href}
                    onClick={(e) => { handleNav(e, item.href); setMobileMenuOpen(false); }}
                    className="block px-5 py-3.5 rounded-xl text-[15px] font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-all">
                    {item.label}
                  </Link>
                ))}
                <div className="h-px bg-white/[0.06] my-2 mx-4" />
                {user && (
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                    className="block mx-2 my-2 px-5 py-3.5 rounded-xl text-[15px] font-semibold text-center bg-white/[0.08] text-white/80 hover:bg-white/[0.12] transition-all">
                    <i className="fa-solid fa-user mr-2 text-sm" />
                    Profile
                  </Link>
                )}
                {user ? (
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-5 py-3 rounded-xl text-[14px] text-white/30 hover:text-white/50 transition-all">Sign Out</button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleLogin(); setMobileMenuOpen(false); }}
                      disabled={loggingIn}
                      className="w-full px-5 py-3.5 rounded-xl text-[14px] font-bold bg-white/[0.06] border border-white/20 text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loggingIn ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-brands fa-google" />}
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push('/onboarding');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-5 py-3.5 rounded-xl text-[14px] font-bold bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      Get started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
