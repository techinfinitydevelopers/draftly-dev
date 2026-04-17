/**
 * Dodo Payments — helpers for checkout sessions and product/plan mapping.
 *
 * Product IDs:
 *   Basic      ($25/mo)  → pdt_0NY6SdOv3utKIhk8Y0MVZ
 *   Basic Plus ($40/mo)  → pdt_0NaRuG92iNRzaEW0O45Cq
 *   Pro        ($60/mo)  → pdt_0NY6SoTpDf13kBLO10URn
 *   Premium    ($200/mo) → pdt_0NY6StK72XdPvSgxgcxRn
 *
 * Legacy (no longer sold): Agency product id still maps to plan `agency` for existing subscriptions.
 */
import DodoPayments from 'dodopayments';

/** Legacy $1,000/mo product — not in `DODO_PRODUCT_IDS` so new checkouts cannot select it. */
export const DODO_LEGACY_AGENCY_PRODUCT_ID = 'pdt_0Nb7FbZxDicUBQnIKG1gV';

// ── Product ID ↔ Plan mapping ──────────────────────────────────────

export const DODO_PRODUCT_IDS = {
  tester: 'pdt_0NZwjlbQYkgtVQ8Pv7qVV',
  basic: 'pdt_0NY6SdOv3utKIhk8Y0MVZ',
  'basic-plus': 'pdt_0NaRuG92iNRzaEW0O45Cq',
  pro: 'pdt_0NY6SoTpDf13kBLO10URn',
  premium: 'pdt_0NY6StK72XdPvSgxgcxRn',
} as const;

/** Sellable tiers in checkout; `agency` kept for legacy Firestore / webhooks only. */
export type PaidPlan = keyof typeof DODO_PRODUCT_IDS | 'agency';

/** Reverse lookup: product ID → plan name */
export function planFromProductId(
  productId: string,
): 'tester' | 'basic' | 'basic-plus' | 'pro' | 'premium' | 'agency' | null {
  if (productId === DODO_LEGACY_AGENCY_PRODUCT_ID) return 'agency';
  for (const [plan, pid] of Object.entries(DODO_PRODUCT_IDS)) {
    if (pid === productId) {
      return plan as 'tester' | 'basic' | 'basic-plus' | 'pro' | 'premium';
    }
  }
  return null;
}

export function normalizePlan(input?: string | null): PaidPlan | null {
  if (!input) return null;
  const value = input.toLowerCase().replace(/\s+/g, '-');
  if (
    value === 'tester' ||
    value === 'basic' ||
    value === 'basic-plus' ||
    value === 'pro' ||
    value === 'premium' ||
    value === 'agency'
  )
    return value;
  return null;
}

/** Same ordering as `planTierIndex` in sync-user-plan-from-dodo (higher index = higher plan). */
const PLAN_TIER_ORDER = ['free', 'tester', 'testing', 'basic', 'basic-plus', 'pro', 'premium', 'agency'] as const;

export function dodoSubscriptionPlanTier(sub: { product_id?: string; metadata?: Record<string, string> }): number {
  const livePlan =
    planFromProductId(String(sub?.product_id || '')) ||
    normalizePlan((sub?.metadata?.plan as string) || null);
  if (!livePlan) return 0;
  const i = (PLAN_TIER_ORDER as readonly string[]).indexOf(livePlan);
  return i >= 0 ? i : 0;
}

const USABLE_SUB_STATUSES = new Set(['active', 'on_hold', 'pending']);

/** Among Dodo subscription objects, pick the highest-tier usable (active / on_hold / pending) subscription. */
export function pickBestDodoSubscription(subs: unknown[]): any | null {
  const list = (subs || []).filter(Boolean) as any[];
  const usable = list.filter((s) => USABLE_SUB_STATUSES.has(String(s?.status || '').toLowerCase()));
  if (!usable.length) return null;
  return usable.reduce((best, cur) =>
    dodoSubscriptionPlanTier(cur) > dodoSubscriptionPlanTier(best) ? cur : best,
  );
}

function dedupeSubscriptionsById(subs: any[]): any[] {
  const map = new Map<string, any>();
  for (const s of subs) {
    const id = s?.subscription_id;
    if (!id) continue;
    const prev = map.get(id);
    if (!prev || dodoSubscriptionPlanTier(s) >= dodoSubscriptionPlanTier(prev)) map.set(id, s);
  }
  return Array.from(map.values());
}

// ── API base URL ───────────────────────────────────────────────────

export function getDodoBaseUrl(): string {
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT || 'live_mode';
  return env === 'test_mode'
    ? 'https://test.dodopayments.com'
    : 'https://live.dodopayments.com';
}

function getDodoClient(): DodoPayments {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY is not set');

  const env = process.env.DODO_PAYMENTS_ENVIRONMENT === 'test_mode' ? 'test_mode' : 'live_mode';
  return new DodoPayments({
    bearerToken: apiKey,
    environment: env,
  });
}

export async function retrieveDodoSubscription(subscriptionId: string) {
  const client = getDodoClient();
  return client.subscriptions.retrieve(subscriptionId);
}

export async function cancelDodoSubscriptionAtPeriodEnd(subscriptionId: string) {
  const client = getDodoClient();
  const updated = await client.subscriptions.update(subscriptionId, {
    cancel_at_next_billing_date: true,
  });
  return updated;
}

export type DodoSubscriptionListStatus =
  | 'pending'
  | 'active'
  | 'on_hold'
  | 'cancelled'
  | 'failed'
  | 'expired';

/**
 * Paginates Dodo `subscriptions.list` (100 per page). Default maxPages supports 5000+ rows.
 */
export async function listDodoSubscriptions(
  query: {
    status?: DodoSubscriptionListStatus;
    customer_id?: string;
  } = {},
  options?: { maxPages?: number },
): Promise<any[]> {
  const client = getDodoClient();
  const pageSize = 100;
  const maxPages = options?.maxPages ?? 50;
  const items: any[] = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const page = await client.subscriptions.list({
      ...query,
      page_size: pageSize,
      page_number: pageNumber,
    });
    const current = page.items || [];
    if (!current.length) break;
    items.push(...current);
    if (current.length < pageSize) break;
  }

  return items;
}

async function collectSubscriptions(query: {
  status?: DodoSubscriptionListStatus;
  customer_id?: string;
}) {
  return listDodoSubscriptions(query);
}

async function findDodoCustomerByEmail(email: string): Promise<any | null> {
  const client = getDodoClient();
  const page = await client.customers.list({
    email: email.toLowerCase(),
    page_size: 5,
    page_number: 1,
  });
  const customers = page.items || [];
  if (!customers.length) return null;
  return (
    customers.find((c: any) => (c.email || '').toLowerCase() === email.toLowerCase()) ||
    customers[0]
  );
}

/**
 * Resolve the subscription that should drive Firestore plan/credits:
 * merges the linked subscription id (if any) with every subscription on the Dodo customer, then picks the highest tier.
 * Fixes Basic→Pro upgrades where the old sub is cancelled but a new Pro sub exists under the same customer.
 */
export async function getBestDodoSubscriptionForUser(opts: {
  userId?: string | null;
  email?: string | null;
  /** Stored Firestore `dodoSubscriptionId` — still merged into candidates even if that sub is no longer active. */
  preferSubscriptionId?: string | null;
}): Promise<any | null> {
  const collected: any[] = [];
  const prefer = String(opts.preferSubscriptionId || '').trim();
  if (prefer) {
    try {
      collected.push(await retrieveDodoSubscription(prefer));
    } catch (e) {
      console.warn('[dodo] getBest: retrieve preferSubscriptionId failed:', prefer, e);
    }
  }

  const normalizedEmail = (opts.email || '').toLowerCase().trim();
  if (normalizedEmail) {
    const customer = await findDodoCustomerByEmail(normalizedEmail);
    if (customer?.customer_id) {
      const all = await collectSubscriptions({ customer_id: customer.customer_id });
      collected.push(...all);
    }
  }

  let best = pickBestDodoSubscription(dedupeSubscriptionsById(collected));
  if (best) return best;

  const candidateStatuses: Array<'active' | 'on_hold' | 'pending'> = ['active', 'on_hold', 'pending'];
  const fallback: any[] = [];
  for (const status of candidateStatuses) {
    const subscriptions = await collectSubscriptions({ status });
    for (const sub of subscriptions) {
      const metaUserId = sub?.metadata?.userId || null;
      const metaEmail = (sub?.metadata?.userEmail || '').toLowerCase();
      const customerEmail = (sub?.customer?.email || '').toLowerCase();
      const userIdMatch = opts.userId && metaUserId === opts.userId;
      const emailMatch = normalizedEmail && (metaEmail === normalizedEmail || customerEmail === normalizedEmail);
      if (userIdMatch || emailMatch) fallback.push(sub);
    }
  }
  return pickBestDodoSubscription(dedupeSubscriptionsById(fallback));
}

/** @deprecated Prefer getBestDodoSubscriptionForUser — this now delegates to it (highest-tier sub for the customer). */
export async function findDodoSubscriptionForUser(args: {
  userId?: string | null;
  email?: string | null;
}) {
  return getBestDodoSubscriptionForUser({ ...args, preferSubscriptionId: null });
}

// ── Create checkout session ────────────────────────────────────────

export interface CreateCheckoutParams {
  productId: string;
  customerEmail: string;
  customerName?: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  session_id: string;
  checkout_url: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  const baseUrl = getDodoBaseUrl();
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY is not set');

  const body: Record<string, unknown> = {
    product_cart: [{ product_id: params.productId, quantity: 1 }],
    customer: {
      email: params.customerEmail,
      ...(params.customerName ? { name: params.customerName } : {}),
    },
    return_url: params.returnUrl,
  };

  if (params.metadata) {
    body.metadata = params.metadata;
  }

  const res = await fetch(`${baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Dodo checkout failed (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json();
}
