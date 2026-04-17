'use client';

import Link from 'next/link';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import { useIntegrationData } from '@/hooks/useIntegrationData';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  target: string;
}

interface VercelProject {
  id: string;
  name: string;
  framework: string;
  updatedAt: number;
}

interface VercelDomain {
  name: string;
  verified: boolean;
  configured: boolean;
}

interface VercelData {
  deployments: VercelDeployment[];
  projects: VercelProject[];
  domains: VercelDomain[];
}

interface DomainData {
  domainName: string;
  registrar: string;
  configured: boolean;
  dnsRecords: { type: string; host: string; value: string }[];
  sslStatus: string;
}

function ts(epoch: number) {
  if (!epoch) return '';
  const d = epoch > 1e12 ? new Date(epoch) : new Date(epoch * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StateBadge({ state }: { state: string }) {
  const s = String(state).toLowerCase();
  const ok = s === 'ready' || s === 'live';
  const err = s === 'error' || s === 'canceled';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${ok ? 'bg-teal-500/15 text-teal-200' : err ? 'bg-rose-500/15 text-rose-200' : 'bg-amber-500/10 text-amber-200'}`}>
      {state}
    </span>
  );
}

export default function BusinessHostingPage() {
  const vercel = useIntegrationData<VercelData>('vercel');
  const domain = useIntegrationData<DomainData>('custom_domain');

  const anyLoading = vercel.loading || domain.loading;

  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="Deploy & hosting">
      <div className="p-4 md:p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Hosting & Deployment</h1>
            <p className="mt-1 text-[13px] text-white/45">Deploy via Vercel or point your own domain to Draftly.</p>
          </div>
        </div>

        {anyLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          </div>
        )}

        {!anyLoading && (
          <div className="space-y-6">
            {/* Vercel */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="vercel" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Vercel</h2>
                    {vercel.connected ? (
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-200">Connected</span>
                    ) : (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">Not connected</span>
                    )}
                  </div>
                </div>
                <Link href="/business/integrations?connect=vercel" className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors shrink-0">
                  {vercel.connected ? 'Update' : 'Connect'}
                </Link>
              </div>

              {vercel.connected && vercel.data && (
                <div className="space-y-4 pt-2">
                  {vercel.data.deployments.length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-semibold text-white/60 mb-2">Recent Deployments</h3>
                      <div className="space-y-1.5">
                        {vercel.data.deployments.map((d) => (
                          <div key={d.uid} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-white/80 truncate">{d.name}</p>
                              <p className="text-[10px] text-white/35">{ts(d.created)} · {d.target || 'production'}</p>
                            </div>
                            <StateBadge state={d.state} />
                            {d.url && (
                              <a href={`https://${d.url}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-300 hover:text-violet-200 shrink-0">
                                Visit
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {vercel.data.projects.length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-semibold text-white/60 mb-2">Projects</h3>
                      <div className="flex flex-wrap gap-2">
                        {vercel.data.projects.map((p) => (
                          <div key={p.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                            <p className="text-[12px] font-semibold text-white/80">{p.name}</p>
                            <p className="text-[10px] text-white/35">{p.framework || 'Static'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {vercel.data.domains.length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-semibold text-white/60 mb-2">Domains</h3>
                      <div className="flex flex-wrap gap-2">
                        {vercel.data.domains.map((d) => (
                          <div key={d.name} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                            <span className="text-[12px] font-mono text-white/70">{d.name}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${d.verified ? 'bg-teal-400' : 'bg-amber-400'}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!vercel.connected && (
                <p className="text-[12px] text-white/40 pl-[60px]">Connect Vercel to deploy your site with automatic SSL and global CDN.</p>
              )}
            </div>

            {/* Custom Domain */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="custom_domain" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Custom Domain</h2>
                    {domain.connected ? (
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-200">Configured</span>
                    ) : (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">Not set</span>
                    )}
                  </div>
                </div>
                <Link href="/business/integrations?connect=custom_domain" className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors shrink-0">
                  {domain.connected ? 'Update' : 'Add domain'}
                </Link>
              </div>

              {domain.connected && domain.data && (
                <div className="space-y-3 pt-2">
                  <p className="text-[13px] font-mono text-white/80">{domain.data.domainName}</p>
                  {domain.data.registrar && <p className="text-[11px] text-white/40">Registrar: {domain.data.registrar}</p>}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] font-semibold text-white/60 mb-2">DNS Records to configure:</p>
                    <div className="font-mono text-[11px] text-teal-200/80 space-y-1">
                      {domain.data.dnsRecords.map((r, i) => (
                        <p key={i}>{r.type.padEnd(6)} {r.host.padEnd(5)} → {r.value}</p>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-white/35">SSL auto-provisions once DNS propagates (5–30 min).</p>
                  </div>
                </div>
              )}

              {!domain.connected && (
                <p className="text-[12px] text-white/40 pl-[60px]">Point your own domain (GoDaddy, Namecheap, Cloudflare, etc.) to Draftly hosting.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </BusinessModuleBody>
  );
}
