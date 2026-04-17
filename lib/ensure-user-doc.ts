/**
 * Ensure a Firestore user document exists for the given userId.
 * If the user signed in with Firebase Auth but never completed onboarding,
 * they won't have a users/{uid} doc — API calls then return "User not found".
 * This creates a default free-tier doc on first use so the app works.
 */

import { getAdminDb } from './firebase-admin';

const DEFAULT_GENERATION_TRACKING = {
  fullAppsGenerated: 0,
  sites3DGenerated: 0,
  uiPreviewsGenerated: 0,
  chatsUsed: 0,
  lastResetDate: new Date().toISOString(),
  projects: {} as Record<string, unknown>,
};

const DEFAULT_SUBSCRIPTION = {
  plan: 'free',
  status: 'active',
  generationsUsed: 0,
  generationsLimit: 5,
};

/**
 * Get the user document, creating it with free-tier defaults if it doesn't exist.
 * Returns the document snapshot (existing or newly created).
 */
export async function ensureUserDocument(userId: string) {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    return userDoc;
  }

  await userRef.set(
    {
      subscription: DEFAULT_SUBSCRIPTION,
      generationTracking: DEFAULT_GENERATION_TRACKING,
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return userRef.get();
}
