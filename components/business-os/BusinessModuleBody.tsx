'use client';

import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isTestingCreditsEmail } from '@/lib/testing-credits-emails';
import { planHasBusinessOs } from '@/lib/business-os/access';
import BusinessUpgradeGate from '@/components/business-os/BusinessUpgradeGate';

export default function BusinessModuleBody({
  requiresBusinessOs,
  gateTitle,
  children,
}: {
  requiresBusinessOs: boolean;
  gateTitle: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { subscription, isOwner } = useSubscription();
  const unlocked = planHasBusinessOs(subscription.plan, isOwner, isTestingCreditsEmail(user?.email));

  if (requiresBusinessOs && !unlocked) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <BusinessUpgradeGate title={gateTitle} />
      </div>
    );
  }

  return <>{children}</>;
}
