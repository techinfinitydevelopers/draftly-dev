/**
 * Property-Based Tests for Plan Enforcement System
 * Feature: project-generation-system
 */

import * as fc from 'fast-check';
import {
  needsMonthlyReset,
  checkFullProjectLimit,
  checkUIPreviewLimit,
  checkIterationLimit,
  validateSubscription,
  resetMonthlyCountsIfNeeded,
  incrementProjectIteration,
  addProjectToTracking,
  Subscription,
  GenerationTracking,
  UserDocument,
  ProjectReference,
} from '../plan-enforcement';
import { getAdminDb } from '../firebase-admin';

// Mock Firebase Admin
jest.mock('../firebase-admin', () => ({
  getAdminDb: jest.fn(),
}));

// Mock Firestore
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getAdminDb as jest.Mock).mockReturnValue({
    collection: mockCollection,
  });
});

/**
 * Property 1: Free user generation restriction
 * Feature: project-generation-system, Property 1: Free user generation restriction
 * Validates: Requirements 1.3
 * 
 * For any free user attempting full project generation, 
 * the Plan Enforcement System should reject the request and return an upgrade prompt
 */
describe('Property 1: Free user generation restriction', () => {
  test('should reject full project generation for all free users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary free user data
        fc.record({
          userId: fc.uuid(),
          fullAppsGenerated: fc.nat({ max: 100 }),
          uiPreviewsGenerated: fc.nat({ max: 100 }),
        }),
        async ({ userId, fullAppsGenerated, uiPreviewsGenerated }) => {
          // Setup: Create a free user with any generation counts
          const userData: UserDocument = {
            uid: userId,
            email: `${userId}@test.com`,
            displayName: 'Test User',
            createdAt: new Date().toISOString(),
            subscription: {
              plan: 'free',
              status: 'inactive',
              generationsUsed: 0,
              generationsLimit: 0,
            },
            generationTracking: {
              fullAppsGenerated,
              uiPreviewsGenerated,
              lastResetDate: new Date().toISOString(),
              projects: {},
            },
            onboardingCompleted: true,
          };

          mockGet.mockResolvedValue({
            exists: true,
            data: () => userData,
          });

          // Execute: Check if free user can generate full project
          const result = await checkFullProjectLimit(userId);

          // Verify: Free users should always be rejected
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('premium subscription');
          expect(result.remaining).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
