/**
 * Plan Enforcement and Generation Tracking System
 * 
 * This module handles:
 * - User subscription validation
 * - Generation limit enforcement
 * - Monthly cycle reset logic
 * - Project-specific iteration tracking
 */

import { getAdminDb } from './firebase-admin';
import { ensureUserDocument } from './ensure-user-doc';
import { FieldValue } from 'firebase-admin/firestore';

export interface Subscription {
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'inactive' | 'expired';
  paymentId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  generationsUsed: number;
  generationsLimit: number;
}

export interface ProjectReference {
  projectId: string;
  projectName: string;
  createdAt: string;
  lastModified: string;
  iterationCount: number;
  framework: string;
  status: 'active' | 'archived';
}

export interface GenerationTracking {
  fullAppsGenerated: number;
  sites3DGenerated?: number;
  uiPreviewsGenerated: number;
  chatsUsed?: number;
  lastResetDate: string;
  projects: { [projectId: string]: ProjectReference };
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  subscription: Subscription;
  generationTracking: GenerationTracking;
  onboardingCompleted: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  subscription: Subscription;
  generationTracking: GenerationTracking;
  error?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
}

/**
 * Checks if monthly cycle reset is needed based on lastResetDate
 * Returns true if more than one month has passed
 */
export function needsMonthlyReset(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  
  // Calculate the difference in months
  const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 
    + (now.getMonth() - lastReset.getMonth());
  
  return monthsDiff >= 1;
}

/**
 * Resets monthly generation counts while preserving project iteration counters
 */
export async function resetMonthlyCountsIfNeeded(userId: string): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new Error('User document not found');
  }
  
  const userData = userDoc.data() as UserDocument;
  const tracking = userData.generationTracking;
  
  if (!tracking || !needsMonthlyReset(tracking.lastResetDate)) {
    return; // No reset needed
  }
  
  // Reset generation counts but preserve project iteration counters
  await userRef.update({
    'generationTracking.fullAppsGenerated': 0,
    'generationTracking.sites3DGenerated': 0,
    'generationTracking.uiPreviewsGenerated': 0,
    'generationTracking.lastResetDate': new Date().toISOString(),
    // Note: projects object is NOT reset, preserving iteration counters
  });
}

/**
 * Validates user subscription and returns subscription data
 */
export async function validateSubscription(userId: string): Promise<ValidationResult> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await ensureUserDocument(userId);

  const userData = userDoc.data() as UserDocument;
  
  // Ensure generationTracking exists
  if (!userData.generationTracking) {
    await userRef.update({
      generationTracking: {
        fullAppsGenerated: 0,
        sites3DGenerated: 0,
        uiPreviewsGenerated: 0,
        chatsUsed: 0,
        lastResetDate: new Date().toISOString(),
        projects: {},
      },
    });
    userData.generationTracking = {
      fullAppsGenerated: 0,
      sites3DGenerated: 0,
      uiPreviewsGenerated: 0,
      chatsUsed: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };
  }
  
  // Check if monthly reset is needed
  await resetMonthlyCountsIfNeeded(userId);
  
  // Fetch updated data after potential reset
  const updatedDoc = await userRef.get();
  const updatedData = updatedDoc.data() as UserDocument;
  
  return {
    isValid: true,
    subscription: updatedData.subscription,
    generationTracking: updatedData.generationTracking,
  };
}

/**
 * Checks if user can generate a full project
 * Requirements: 1.3 (free users blocked), 2.3 (premium limit enforcement)
 */
export async function checkFullProjectLimit(userId: string): Promise<LimitCheckResult> {
  const validation = await validateSubscription(userId);
  
  if (!validation.isValid) {
    return {
      allowed: false,
      reason: validation.error || 'Invalid subscription',
      remaining: 0,
    };
  }
  
  const { subscription, generationTracking } = validation;
  
  // Free users cannot generate full projects (Requirement 1.3)
  if (subscription.plan === 'free') {
    return {
      allowed: false,
      reason: 'Full project generation requires a premium subscription. Please upgrade to continue.',
      remaining: 0,
    };
  }
  
  // Determine limit based on plan
  const limit = subscription.plan === 'premium' ? 5 : 1; // premium: 5, pro: 1
  const remaining = limit - generationTracking.fullAppsGenerated;
  
  // Check if limit exceeded (Requirement 2.3)
  if (generationTracking.fullAppsGenerated >= limit) {
    return {
      allowed: false,
      reason: `You have reached your monthly limit of ${limit} full project generation${limit > 1 ? 's' : ''}. Your limit will reset next month.`,
      remaining: 0,
    };
  }
  
  return {
    allowed: true,
    remaining,
  };
}

/**
 * Checks if user can generate a UI preview
 * Requirements: 1.5 (free users limited to 10 per month)
 */
export async function checkUIPreviewLimit(userId: string): Promise<LimitCheckResult> {
  const validation = await validateSubscription(userId);
  
  if (!validation.isValid) {
    return {
      allowed: false,
      reason: validation.error || 'Invalid subscription',
      remaining: 0,
    };
  }
  
  const { subscription, generationTracking } = validation;
  
  // Free users limited to 10 UI previews per month
  if (subscription.plan === 'free') {
    const limit = 10;
    const remaining = limit - generationTracking.uiPreviewsGenerated;
    
    if (generationTracking.uiPreviewsGenerated >= limit) {
      return {
        allowed: false,
        reason: `You have reached your monthly limit of ${limit} UI previews. Please upgrade for unlimited access.`,
        remaining: 0,
      };
    }
    
    return {
      allowed: true,
      remaining,
    };
  }
  
  // Premium users have unlimited UI previews
  return {
    allowed: true,
    remaining: -1, // -1 indicates unlimited
  };
}

/**
 * Checks if a project can be iterated
 * Requirements: 3.3 (5 iterations per project limit)
 */
export async function checkIterationLimit(
  userId: string,
  projectId: string
): Promise<LimitCheckResult> {
  const validation = await validateSubscription(userId);
  
  if (!validation.isValid) {
    return {
      allowed: false,
      reason: validation.error || 'Invalid subscription',
      remaining: 0,
    };
  }
  
  const { generationTracking } = validation;
  const project = generationTracking.projects[projectId];
  
  if (!project) {
    return {
      allowed: false,
      reason: 'Project not found',
      remaining: 0,
    };
  }
  
  const limit = 5;
  const remaining = limit - project.iterationCount;
  
  // Check if iteration limit reached (Requirement 3.3)
  if (project.iterationCount >= limit) {
    return {
      allowed: false,
      reason: `This project has reached its iteration limit of ${limit}. Create a new project to continue.`,
      remaining: 0,
    };
  }
  
  return {
    allowed: true,
    remaining,
  };
}

/**
 * Increments full app generation counter
 * Requirements: 2.2
 */
export async function incrementFullAppGeneration(userId: string): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  
  await userRef.update({
    'generationTracking.fullAppsGenerated': FieldValue.increment(1),
  });
}

/**
 * Increments UI preview generation counter
 * Requirements: 1.4
 */
export async function incrementUIPreviewGeneration(userId: string): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  
  await userRef.update({
    'generationTracking.uiPreviewsGenerated': FieldValue.increment(1),
  });
}

/**
 * Increments project iteration counter
 * Requirements: 3.2 (iteration does not consume generation credits)
 */
export async function incrementProjectIteration(
  userId: string,
  projectId: string
): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  
  // Only increment the project-specific iteration counter
  // Does NOT increment fullAppsGenerated (Requirement 3.2)
  await userRef.update({
    [`generationTracking.projects.${projectId}.iterationCount`]: FieldValue.increment(1),
    [`generationTracking.projects.${projectId}.lastModified`]: new Date().toISOString(),
  });
}

/**
 * Adds a new project to user's generation tracking
 * Requirements: 4.4 (project-specific iteration tracking)
 */
export async function addProjectToTracking(
  userId: string,
  projectId: string,
  projectName: string,
  framework: string
): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  
  const projectRef: ProjectReference = {
    projectId,
    projectName,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    iterationCount: 0,
    framework,
    status: 'active',
  };
  
  await userRef.update({
    [`generationTracking.projects.${projectId}`]: projectRef,
  });
}
