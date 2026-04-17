'use client';

import { Suspense } from 'react';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import IntegrationsDashboard from '@/components/integrations/IntegrationsDashboard';

export default function BusinessIntegrationsPage() {
  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="Integrations">
      <div className="p-4 md:p-8 max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Integrations</h1>
          <p className="mt-2 text-[14px] text-white/50 leading-relaxed max-w-2xl">
            Connect Firebase, Supabase, Stripe, analytics, Meta Pixel, and email providers. Keys are encrypted on the
            server — you will not see them again after saving.
          </p>
        </div>
        <Suspense
          fallback={<div className="text-[13px] text-white/40 py-8">Loading integrations…</div>}
        >
          <IntegrationsDashboard />
        </Suspense>
      </div>
    </BusinessModuleBody>
  );
}
