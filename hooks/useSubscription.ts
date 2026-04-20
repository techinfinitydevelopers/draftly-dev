'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { isOwnerEmail } from '@/lib/owner-emails';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { isComplimentaryBasicEmail } from '@/lib/complimentary-basic-emails';
import { PLAN_LIMITS } from '@/lib/subscription-plans';

export interface Subscription {
  plan: 'free' | 'tester' | 'testing' | 'basic' | 'basic-plus' | 'pro' | 'premium' | 'agency';
  status: 'active' | 'inactive' | 'expired' | 'on_hold';
  paymentId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  generationsUsed: number;
  generationsLimit: number;
  // Gumroad (legacy)
  gumroadSubscriptionId?: string;
  gumroadEmail?: string;
  // Optional per-user override for Studio credits (monthly)
  customStudioCredits?: number;
}

export interface GenerationTracking {
  fullAppsGenerated: number;
  sites3DGenerated?: number;
  uiPreviewsGenerated: number;
  chatsUsed?: number;
  creditsUsed?: number;
  studioImageGenerations?: number;
  studioVideoGenerations?: number;
  lastResetDate: string;
  projects: {
    [projectId: string]: {
      projectId: string;
      projectName: string;
      createdAt: string;
      lastModified: string;
      files: { [path: string]: string };
      framework: string;
      status: 'active' | 'archived';
    };
  };
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'free',
    status: 'active',
    generationsUsed: 0,
    generationsLimit: 5, // Free users get 5 UI designs per month
  });
  const [generationTracking, setGenerationTracking] = useState<GenerationTracking>({
    fullAppsGenerated: 0,
    sites3DGenerated: 0,
    uiPreviewsGenerated: 0,
    chatsUsed: 0,
    creditsUsed: 0,
    lastResetDate: new Date().toISOString(),
    projects: {},
  });
  const [loading, setLoading] = useState(true);

  const normalizePlan = (plan: unknown): Subscription['plan'] => {
    const v = String(plan || 'free').trim().toLowerCase().replace(/\s+/g, '-');
    if (v === 'basic' || v === 'basic-plus' || v === 'pro' || v === 'premium' || v === 'agency' || v === 'tester' || v === 'testing') return v;
    return 'free';
  };

  const normalizeStatus = (status: unknown): Subscription['status'] => {
    const v = String(status || 'active').trim().toLowerCase();
    if (v === 'active' || v === 'inactive' || v === 'expired' || v === 'on_hold') return v;
    return 'active';
  };

  useEffect(() => {
    if (!user || !db) {
      setSubscription({
        plan: 'free',
        status: 'active',
        generationsUsed: 0,
        generationsLimit: 5,
      });
      setLoading(false);
      return;
    }

    // Safari / strict privacy: Firestore listener can hang without first snapshot. Do not block UI forever.
    const loadingSafetyTimer = window.setTimeout(() => {
      setLoading(false);
    }, 10_000);

    // Real-time listener for subscription changes
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        window.clearTimeout(loadingSafetyTimer);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Ensure email is always stored (for webhook matching)
          const normalizedEmail = (user.email || '').trim().toLowerCase();
          if (normalizedEmail && (!data.email || String(data.email).trim().toLowerCase() !== normalizedEmail)) {
            setDoc(userRef, { email: normalizedEmail }, { merge: true }).catch(() => {});
          }

          // Read subscription data from Firestore snapshot.
          const sub = (data.subscription || {}) as Record<string, unknown>;
          const currentPlan = normalizePlan(sub.plan);
          const currentStatus = normalizeStatus(sub.status);

          // Complimentary Basic ($25 tier): list in lib/complimentary-basic-emails.ts — re-apply whenever
          // Firestore is free/testing so a missed first sync or manual reset still upgrades on next app load.
          if (
            normalizedEmail &&
            isComplimentaryBasicEmail(normalizedEmail) &&
            (currentPlan === 'free' || currentPlan === 'testing') &&
            currentStatus === 'active'
          ) {
            updateDoc(userRef, {
              complimentaryBasicSyncedAt: new Date().toISOString(),
              'subscription.plan': 'basic',
              'subscription.status': 'active',
              'subscription.generationsLimit': PLAN_LIMITS.basic.credits,
              'subscription.generationsUsed': Math.min(
                Number(sub.generationsUsed || 0),
                PLAN_LIMITS.basic.credits,
              ),
            }).catch(() => {});
          }

          if (data.subscription) {
            const raw = data.subscription as Record<string, unknown>;
            setSubscription({
              plan: normalizePlan(raw.plan),
              status: normalizeStatus(raw.status),
              generationsUsed: Number(raw.generationsUsed || 0),
              generationsLimit: Number(raw.generationsLimit || 5),
              paymentId: (raw.paymentId as string) || undefined,
              orderId: (raw.orderId as string) || undefined,
              startDate: (raw.startDate as string) || undefined,
              endDate: (raw.endDate as string) || undefined,
              gumroadSubscriptionId: (raw.gumroadSubscriptionId as string) || undefined,
              gumroadEmail: (raw.gumroadEmail as string) || undefined,
              customStudioCredits:
                typeof raw.customStudioCredits === 'number' ? raw.customStudioCredits : undefined,
            });
          } else {
            // No subscription data, set default free plan
            setSubscription({
              plan: 'free',
              status: 'active',
              generationsUsed: 0,
              generationsLimit: 5,
            });
          }

          if (data.generationTracking) {
            const gt = data.generationTracking as Partial<GenerationTracking>;
            setGenerationTracking({
              fullAppsGenerated: gt.fullAppsGenerated ?? 0,
              sites3DGenerated: gt.sites3DGenerated ?? 0,
              uiPreviewsGenerated: gt.uiPreviewsGenerated ?? 0,
              chatsUsed: gt.chatsUsed ?? 0,
              creditsUsed: gt.creditsUsed ?? 0,
              studioImageGenerations: gt.studioImageGenerations ?? 0,
              studioVideoGenerations: gt.studioVideoGenerations ?? 0,
              lastResetDate: gt.lastResetDate || new Date().toISOString(),
              projects: gt.projects || {},
            });
          }
        } else {
          // User document doesn't exist — create it so APIs and dashboard don't get "User not found"
          const emailLower = (user.email || '').trim().toLowerCase();
          const initialBasic = isComplimentaryBasicEmail(emailLower);
          setSubscription({
            plan: initialBasic ? 'basic' : 'free',
            status: 'active',
            generationsUsed: 0,
            generationsLimit: initialBasic ? PLAN_LIMITS.basic.credits : 5,
          });
          setDoc(userRef, {
            email: emailLower,
            ...(initialBasic ? { complimentaryBasicSyncedAt: new Date().toISOString() } : {}),
            subscription: {
              plan: initialBasic ? 'basic' : 'free',
              status: 'active',
              generationsUsed: 0,
              generationsLimit: initialBasic ? PLAN_LIMITS.basic.credits : 5,
            },
            generationTracking: {
              fullAppsGenerated: 0,
              sites3DGenerated: 0,
              uiPreviewsGenerated: 0,
              chatsUsed: 0,
              creditsUsed: 0,
              studioImageGenerations: 0,
              studioVideoGenerations: 0,
              lastResetDate: new Date().toISOString(),
              projects: {},
            },
            onboardingComplete: false,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
        setLoading(false);
      },
      () => {
        window.clearTimeout(loadingSafetyTimer);
        setSubscription({
          plan: 'free',
          status: 'active',
          generationsUsed: 0,
          generationsLimit: 5,
        });
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(loadingSafetyTimer);
      unsubscribe();
    };
  }, [user]);

  const isActive = subscription.status === 'active';
  const userEmail = user?.email || '';
  const isOwner = isOwnerEmail(userEmail);
  const isBasic =
    (subscription.plan === 'basic' ||
      subscription.plan === 'basic-plus' ||
      subscription.plan === 'pro' ||
      subscription.plan === 'premium' ||
      subscription.plan === 'agency' ||
      subscription.plan === 'tester' ||
      subscription.plan === 'testing') &&
      isActive ||
    isTestingCreditsEmail(userEmail);
  const isPro =
    (subscription.plan === 'pro' ||
      subscription.plan === 'premium' ||
      subscription.plan === 'agency' ||
      subscription.plan === 'tester' ||
      subscription.plan === 'testing') &&
      isActive ||
    isTestingCreditsEmail(userEmail);
  const isPremium = subscription.plan === 'premium' && isActive;
  const canGenerate = subscription.generationsUsed < subscription.generationsLimit;
  const generationsRemaining = subscription.generationsLimit - subscription.generationsUsed;

  // Calculate full app generations remaining
  const fullAppsLimitMap: Record<string, number> = {
    basic: 0,
    'basic-plus': 0,
    pro: 1,
    premium: 3,
    agency: 15,
    tester: 0,
    testing: 0,
  };
  const fullAppsLimit = isOwner ? 999999 : (fullAppsLimitMap[subscription.plan] || 0);
  const fullAppsRemaining = isOwner ? 999999 : Math.max(0, fullAppsLimit - (generationTracking.fullAppsGenerated || 0));


  return {
    subscription,
    generationTracking,
    loading,
    isBasic,
    isPro,
    isPremium,
    isOwner,
    canGenerate,
    generationsRemaining,
    fullAppsRemaining,
    fullAppsLimit,
  };
}
