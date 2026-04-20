'use client';

import { useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { devError } from '@/lib/client-log';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Always register onAuthStateChanged first so auth resolves even if
    // getRedirectResult hangs (common on mobile Safari / Firefox).
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });

    // Handle redirect return (mobile sign-in). Race against a 4s timeout
    // so a stuck getRedirectResult never blocks the page.
    const redirectTimeout = 4_000;
    Promise.race([
      getRedirectResult(auth),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), redirectTimeout)),
    ])
      .then((result) => {
        if (cancelled || !result) return;
        if ('user' in result && result.user) {
          setUser(result.user);
          let dest = '/pricing';
          if (typeof window !== 'undefined') {
            const custom = sessionStorage.getItem('draftly_post_signin_redirect');
            if (custom) {
              sessionStorage.removeItem('draftly_post_signin_redirect');
              dest = custom;
            }
          }
          router.replace(dest);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          devError('Redirect sign-in error', err);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  const signInWithGoogle = async (options?: { skipNavigation?: boolean; redirectTo?: string }) => {
    if (!auth) {
      alert('Firebase is not initialized. Please check your environment variables.');
      return null;
    }
    try {
      // Prefer popup everywhere (desktop + mobile). This avoids Safari/Firefox
      // third-party cookie issues with redirect flows.
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        setUser(result.user);
        if (!options?.skipNavigation) {
          router.replace(options?.redirectTo ?? '/pricing');
        }
        return result.user;
      }
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      devError('Error signing in', error);
      const err = error as { code?: string };
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        if (options?.redirectTo && typeof window !== 'undefined') {
          sessionStorage.setItem('draftly_post_signin_redirect', options.redirectTo);
        }
        // Fallback: redirect flow if popups are blocked. This still works on
        // most browsers when authDomain is same-origin and /__/auth is proxied.
        await signInWithRedirect(auth, googleProvider);
      } else {
        alert('Failed to sign in. Please try again.');
      }
    }
    return null;
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      devError('Error signing out', error);
    }
  };

  return { user, loading, signInWithGoogle, signOut };
}
