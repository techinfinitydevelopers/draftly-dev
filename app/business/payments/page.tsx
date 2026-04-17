'use client';

import Link from 'next/link';
import BusinessModuleBody from '@/components/business-os/BusinessModuleBody';
import { useIntegrationData } from '@/hooks/useIntegrationData';
import { IntegrationBrandGlyph } from '@/components/integrations/integration-brand-icons';

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: number;
  paid: boolean;
}

interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
}

interface StripeData {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  totalRevenue: number;
  recentCharges: StripeCharge[];
  recentPayouts: StripePayout[];
  customerCount: number;
  hasMore: boolean;
}

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'usd' }).format(cents / 100);
}

function ts(epoch: number) {
  return new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BusinessPaymentsPage() {
  const { data, loading, error, connected, refresh } = useIntegrationData<StripeData>('stripe');

  return (
    <BusinessModuleBody requiresBusinessOs gateTitle="Payments & revenue">
      <div className="p-4 md:p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Payments</h1>
            <p className="mt-1 text-[13px] text-white/45">
              {connected ? 'Live data from your Stripe account' : 'Connect Stripe to see real payment data'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <button type="button" onClick={() => void refresh()} className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08] transition-colors">
                Refresh
              </button>
            )}
            <Link href="/business/integrations?connect=stripe" className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors">
              {connected ? 'Update keys' : 'Connect Stripe'}
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          </div>
        )}

        {!loading && !connected && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/90 p-8 text-center">
            <IntegrationBrandGlyph id="stripe" className="h-16 w-16 rounded-2xl mx-auto" />
            <h2 className="mt-4 font-display text-lg font-semibold text-white">Connect Stripe</h2>
            <p className="mt-2 text-[13px] text-white/45 max-w-md mx-auto">
              Add your Stripe API keys to see balance, transactions, payouts, and customer data — all live from your Stripe account.
            </p>
            <Link href="/business/integrations?connect=stripe" className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a0d14] hover:bg-white/90 transition-colors">
              Connect now
            </Link>
          </div>
        )}

        {!loading && connected && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Available', value: fmt(data.availableBalance, data.currency), sub: 'Ready for payout' },
                { label: 'Pending', value: fmt(data.pendingBalance, data.currency), sub: 'Processing' },
                { label: 'Revenue (recent)', value: fmt(data.totalRevenue, data.currency), sub: 'From last 10 charges' },
                { label: 'Customers', value: String(data.customerCount), sub: 'Recent' },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{c.label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">{c.value}</p>
                  <p className="mt-1 text-[11px] text-white/35">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5">
                <h2 className="text-[14px] font-semibold text-white mb-4">Recent Charges</h2>
                {data.recentCharges.length === 0 ? (
                  <p className="text-[12px] text-white/40">No charges yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentCharges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-white/80 truncate">{c.description}</p>
                          <p className="text-[10px] text-white/35">{ts(c.created)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold tabular-nums text-white">{fmt(c.amount, c.currency)}</p>
                          <p className={`text-[10px] font-semibold ${c.paid ? 'text-teal-300/80' : 'text-amber-300/80'}`}>
                            {c.paid ? 'Paid' : c.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-5">
                <h2 className="text-[14px] font-semibold text-white mb-4">Recent Payouts</h2>
                {data.recentPayouts.length === 0 ? (
                  <p className="text-[12px] text-white/40">No payouts yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentPayouts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-white/80">Payout</p>
                          <p className="text-[10px] text-white/35">Arriving {ts(p.arrival_date)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold tabular-nums text-white">{fmt(p.amount, p.currency)}</p>
                          <p className={`text-[10px] font-semibold ${p.status === 'paid' ? 'text-teal-300/80' : 'text-amber-300/80'}`}>
                            {p.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-white/30 text-center">
              Full Stripe dashboard at{' '}
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">dashboard.stripe.com</a>
            </p>
          </>
        )}
      </div>
    </BusinessModuleBody>
  );
}
