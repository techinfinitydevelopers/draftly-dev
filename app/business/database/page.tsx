'use client';

import Link from 'next/link';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import { useIntegrationData } from '@/hooks/useIntegrationData';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

interface FirebaseData {
  projectId: string;
  authDomain: string;
  storageBucket: string;
  configured: boolean;
  note: string;
}

interface SupabaseData {
  healthy: boolean;
  projectUrl: string;
  tableCount: number;
  tables: string[];
  hasServiceRole: boolean;
}

export default function BusinessDatabasePage() {
  const firebase = useIntegrationData<FirebaseData>('firebase');
  const supabase = useIntegrationData<SupabaseData>('supabase');

  const anyLoading = firebase.loading || supabase.loading;

  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="Managed data">
      <div className="p-4 md:p-8 max-w-6xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Database & Backend</h1>
          <p className="mt-1 text-[13px] text-white/45">Connect Firebase or Supabase — auth, database, and storage for your site.</p>
        </div>

        {anyLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          </div>
        )}

        {!anyLoading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Firebase */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="firebase" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Firebase</h2>
                    {firebase.connected && firebase.data?.configured ? (
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-200">Connected</span>
                    ) : (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">Not connected</span>
                    )}
                  </div>
                  {firebase.connected && firebase.data ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-1 gap-1 text-[11px]">
                        <div className="flex justify-between text-white/50"><span>Project ID</span><span className="font-mono text-white/70">{firebase.data.projectId}</span></div>
                        <div className="flex justify-between text-white/50"><span>Auth Domain</span><span className="font-mono text-white/70 truncate max-w-[180px]">{firebase.data.authDomain}</span></div>
                        <div className="flex justify-between text-white/50"><span>Storage</span><span className="font-mono text-white/70 truncate max-w-[180px]">{firebase.data.storageBucket}</span></div>
                      </div>
                      <p className="text-[10px] text-white/35 mt-2">{firebase.data.note}</p>
                      <div className="flex gap-2 flex-wrap mt-3">
                        <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08] transition-colors">
                          Firebase Console
                        </a>
                        <Link href="/business/integrations?connect=firebase" className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:text-white/80 transition-colors">
                          Update keys
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-[12px] text-white/45">Add Firebase for auth, Firestore, and Cloud Storage.</p>
                      <Link href="/business/integrations?connect=firebase" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
                        Connect Firebase
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supabase */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <IntegrationBrandGlyph id="supabase" className="h-12 w-12 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[16px] font-semibold text-white">Supabase</h2>
                    {supabase.connected && supabase.data?.healthy ? (
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-200">Healthy</span>
                    ) : supabase.connected ? (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Unreachable</span>
                    ) : (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">Not connected</span>
                    )}
                  </div>
                  {supabase.connected && supabase.data ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 gap-1 text-[11px]">
                        <div className="flex justify-between text-white/50"><span>Project URL</span><span className="font-mono text-white/70 truncate max-w-[180px]">{supabase.data.projectUrl}</span></div>
                        <div className="flex justify-between text-white/50"><span>Tables found</span><span className="text-white/70">{supabase.data.tableCount}</span></div>
                        <div className="flex justify-between text-white/50"><span>Service role key</span><span className="text-white/70">{supabase.data.hasServiceRole ? 'Stored' : 'Not provided'}</span></div>
                      </div>
                      {supabase.data.tables.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-white/50 mb-1">Tables</p>
                          <div className="flex flex-wrap gap-1">
                            {supabase.data.tables.map((t) => (
                              <span key={t} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-white/60">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08] transition-colors">
                          Supabase Dashboard
                        </a>
                        <Link href="/business/integrations?connect=supabase" className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:text-white/80 transition-colors">
                          Update keys
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-[12px] text-white/45">Add Supabase for Postgres, auth, and storage — all in one backend.</p>
                      <Link href="/business/integrations?connect=supabase" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
                        Connect Supabase
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessModuleBody>
  );
}
