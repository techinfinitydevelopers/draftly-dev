'use client';

import Link from 'next/link';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import { useIntegrationData } from '@/hooks/useIntegrationData';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

interface GAData {
  measurementId: string;
  configured: boolean;
  injected: boolean;
  note: string;
  dashboardUrl: string;
}

interface PixelData {
  pixelId: string;
  configured: boolean;
  injected: boolean;
  note: string;
  dashboardUrl: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ok ? 'bg-teal-500/15 text-teal-200' : 'bg-white/[0.06] text-white/40'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-teal-400' : 'bg-white/30'}`} />
      {label}
    </span>
  );
}

export default function BusinessAnalyticsPage() {
  const ga = useIntegrationData<GAData>('google_analytics');
  const meta = useIntegrationData<PixelData>('meta_pixel');

  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="Analytics">
      <div className="p-4 md:p-8 max-w-6xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Analytics & Tracking</h1>
          <p className="mt-1 text-[13px] text-white/45">
            Connect Google Analytics and Meta Pixel — scripts are automatically injected into your generated site.
          </p>
        </div>

        {(ga.loading || meta.loading) && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          </div>
        )}

        {!ga.loading && !meta.loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Google Analytics Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="google_analytics" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Google Analytics 4</h2>
                    <StatusBadge ok={!!ga.data?.configured} label={ga.data?.configured ? 'Active' : 'Not connected'} />
                  </div>
                  {ga.data?.configured ? (
                    <>
                      <p className="mt-2 text-[12px] text-white/50">
                        Measurement ID: <span className="font-mono text-white/70">{ga.data.measurementId}</span>
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <StatusBadge ok={ga.data.injected} label="Injected into site" />
                      </div>
                      <p className="mt-3 text-[11px] text-white/40">{ga.data.note}</p>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <a href={ga.data.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors">
                          Open GA4 Dashboard
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M8 2H3M8 2v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                        <Link href="/business/integrations?connect=google_analytics" className="rounded-lg bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/60 hover:text-white/80 transition-colors">
                          Update ID
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-[12px] text-white/45">
                        Add your GA4 Measurement ID to automatically inject the tracking script into every site you build.
                      </p>
                      <Link href="/business/integrations?connect=google_analytics" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
                        Connect GA4
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Pixel Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="meta_pixel" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Meta Pixel</h2>
                    <StatusBadge ok={!!meta.data?.configured} label={meta.data?.configured ? 'Active' : 'Not connected'} />
                  </div>
                  {meta.data?.configured ? (
                    <>
                      <p className="mt-2 text-[12px] text-white/50">
                        Pixel ID: <span className="font-mono text-white/70">{meta.data.pixelId}</span>
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <StatusBadge ok={meta.data.injected} label="Injected into site" />
                      </div>
                      <p className="mt-3 text-[11px] text-white/40">{meta.data.note}</p>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <a href={meta.data.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors">
                          Open Events Manager
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M8 2H3M8 2v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                        <Link href="/business/integrations?connect=meta_pixel" className="rounded-lg bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/60 hover:text-white/80 transition-colors">
                          Update ID
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-[12px] text-white/45">
                        Add your Pixel ID to automatically inject the Meta tracking script and track conversions.
                      </p>
                      <Link href="/business/integrations?connect=meta_pixel" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
                        Connect Meta Pixel
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
          <p className="text-[12px] text-white/55">
            <span className="font-semibold text-white/70">How it works:</span> When you connect GA4 or Meta Pixel, Draftly automatically injects the official tracking scripts into every site you build (including ZIP exports). No manual code changes needed.
          </p>
        </div>
      </div>
    </BusinessModuleBody>
  );
}
