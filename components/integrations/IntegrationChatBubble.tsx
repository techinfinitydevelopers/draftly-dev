'use client';

import Link from 'next/link';
import { getIntegrationDefinition } from '@/lib/integrations/registry';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';
import type { IntegrationId } from '@/lib/integrations/types';

export type IntegrationChatHint = {
  kind: 'connect' | 'suggest';
  integrationIds: string[];
};

export default function IntegrationChatBubble({ hint }: { hint: IntegrationChatHint }) {
  const primary = hint.integrationIds[0] as IntegrationId;
  const def = getIntegrationDefinition(primary);
  const title =
    hint.kind === 'connect'
      ? `Connect ${def?.name || 'service'}`
      : 'Suggested for you';
  const sub =
    hint.kind === 'connect' ? 'Encrypted keys · two taps' : 'Add what you need next';

  return (
    <div className="mt-3 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-violet-500/[0.12] to-transparent p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-3">
        {def ? <IntegrationBrandGlyph id={def.id as IntegrationId} className="h-12 w-12 flex-shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-semibold text-white leading-tight">{title}</p>
          <p className="mt-1 text-[12px] text-white/45 leading-snug">{sub}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {hint.integrationIds.map((id) => {
              const d = getIntegrationDefinition(id);
              return (
                <Link
                  key={id}
                  href={`/business/integrations?connect=${encodeURIComponent(id)}`}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors"
                >
                  Open {d?.name?.split(' ')[0] || id}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
