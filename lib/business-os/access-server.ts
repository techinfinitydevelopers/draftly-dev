import { getAdminDb } from '@/lib/firebase-admin';
import { isOwnerEmail } from '@/lib/owner-emails';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { planHasBusinessOs, type DraftlyPlanId } from '@/lib/business-os/access';

export async function getBusinessOsAccessForUid(uid: string): Promise<{
  allowed: boolean;
  email?: string;
  plan: DraftlyPlanId;
}> {
  const db = getAdminDb();
  const snap = await db.collection('users').doc(uid).get();
  const data = snap.data();
  const email = typeof data?.email === 'string' ? data.email : undefined;
  const plan = (data?.subscription?.plan || 'free') as DraftlyPlanId;
  const owner = isOwnerEmail(email);
  const testing = isTestingCreditsEmail(email);
  return {
    allowed: planHasBusinessOs(plan, owner, testing),
    email,
    plan,
  };
}
