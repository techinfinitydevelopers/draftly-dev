import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, authErrorResponse, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { getBusinessOsAccessForUid } from '@/lib/business-os/access-server';
import { decryptSecretsJson } from '@/lib/integrations/crypto';
import { isIntegrationId } from '@/lib/integrations/registry';
import type { IntegrationId } from '@/lib/integrations/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getDecryptedSecrets(uid: string, integrationId: string): Promise<Record<string, string> | null> {
  const ref = getAdminDb().collection('users').doc(uid).collection('integrations').doc(integrationId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.status !== 'connected' || !data?.ciphertext) return null;
  try {
    return decryptSecretsJson(data.ciphertext);
  } catch {
    return null;
  }
}

async function fetchStripeData(secrets: Record<string, string>) {
  const sk = secrets.secretKey;
  if (!sk) return { error: 'No secret key stored' };

  const headers = { Authorization: `Bearer ${sk}` };

  const [balanceRes, chargesRes, payoutsRes, customersRes] = await Promise.allSettled([
    fetch('https://api.stripe.com/v1/balance', { headers }),
    fetch('https://api.stripe.com/v1/charges?limit=10', { headers }),
    fetch('https://api.stripe.com/v1/payouts?limit=5', { headers }),
    fetch('https://api.stripe.com/v1/customers?limit=5', { headers }),
  ]);

  const balance = balanceRes.status === 'fulfilled' && balanceRes.value.ok
    ? await balanceRes.value.json()
    : null;
  const charges = chargesRes.status === 'fulfilled' && chargesRes.value.ok
    ? await chargesRes.value.json()
    : null;
  const payouts = payoutsRes.status === 'fulfilled' && payoutsRes.value.ok
    ? await payoutsRes.value.json()
    : null;
  const customers = customersRes.status === 'fulfilled' && customersRes.value.ok
    ? await customersRes.value.json()
    : null;

  const availableBalance = balance?.available?.reduce(
    (sum: number, b: { amount: number }) => sum + b.amount, 0
  ) ?? 0;
  const pendingBalance = balance?.pending?.reduce(
    (sum: number, b: { amount: number }) => sum + b.amount, 0
  ) ?? 0;

  const recentCharges = (charges?.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    amount: c.amount,
    currency: c.currency,
    status: c.status,
    description: c.description || '(no description)',
    created: c.created,
    paid: c.paid,
    customer: c.customer,
  }));

  const recentPayouts = (payouts?.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    arrival_date: p.arrival_date,
    created: p.created,
  }));

  const totalRevenue = recentCharges
    .filter((c: { paid: boolean }) => c.paid)
    .reduce((s: number, c: { amount: number }) => s + c.amount, 0);

  return {
    availableBalance,
    pendingBalance,
    currency: balance?.available?.[0]?.currency || 'usd',
    totalRevenue,
    recentCharges,
    recentPayouts,
    customerCount: customers?.data?.length ?? 0,
    hasMore: charges?.has_more ?? false,
  };
}

async function fetchGitHubData(secrets: Record<string, string>) {
  const token = secrets.accessToken;
  const username = secrets.username;
  if (!token) return { error: 'No access token stored' };

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

  const [userRes, reposRes, eventsRes] = await Promise.allSettled([
    fetch('https://api.github.com/user', { headers }),
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers }),
    fetch(`https://api.github.com/users/${username}/events?per_page=15`, { headers }),
  ]);

  const user = userRes.status === 'fulfilled' && userRes.value.ok
    ? await userRes.value.json()
    : null;
  const repos = reposRes.status === 'fulfilled' && reposRes.value.ok
    ? await reposRes.value.json()
    : [];
  const events = eventsRes.status === 'fulfilled' && eventsRes.value.ok
    ? await eventsRes.value.json()
    : [];

  return {
    user: user ? { login: user.login, avatar_url: user.avatar_url, public_repos: user.public_repos, followers: user.followers } : null,
    repos: (repos as Record<string, unknown>[]).slice(0, 8).map((r) => ({
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      html_url: r.html_url,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
    })),
    recentEvents: (events as Record<string, unknown>[]).slice(0, 10).map((e) => ({
      type: e.type,
      repo: (e.repo as Record<string, unknown>)?.name,
      created_at: e.created_at,
    })),
  };
}

async function fetchVercelData(secrets: Record<string, string>) {
  const token = secrets.apiToken;
  if (!token) return { error: 'No API token stored' };
  const teamParam = secrets.teamId ? `?teamId=${secrets.teamId}` : '';
  const headers = { Authorization: `Bearer ${token}` };

  const [deploymentsRes, projectsRes, domainsRes] = await Promise.allSettled([
    fetch(`https://api.vercel.com/v6/deployments?limit=8${teamParam ? `&${teamParam.slice(1)}` : ''}`, { headers }),
    fetch(`https://api.vercel.com/v9/projects?limit=10${teamParam ? `&${teamParam.slice(1)}` : ''}`, { headers }),
    fetch(`https://api.vercel.com/v5/domains${teamParam}`, { headers }),
  ]);

  const deployments = deploymentsRes.status === 'fulfilled' && deploymentsRes.value.ok
    ? await deploymentsRes.value.json()
    : null;
  const projects = projectsRes.status === 'fulfilled' && projectsRes.value.ok
    ? await projectsRes.value.json()
    : null;
  const domains = domainsRes.status === 'fulfilled' && domainsRes.value.ok
    ? await domainsRes.value.json()
    : null;

  return {
    deployments: (deployments?.deployments ?? []).slice(0, 8).map((d: Record<string, unknown>) => ({
      uid: d.uid,
      name: d.name,
      url: d.url,
      state: d.state ?? d.readyState,
      created: d.created ?? d.createdAt,
      target: d.target,
    })),
    projects: (projects?.projects ?? []).slice(0, 8).map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      framework: p.framework,
      updatedAt: p.updatedAt,
    })),
    domains: (domains?.domains ?? []).slice(0, 8).map((d: Record<string, unknown>) => ({
      name: d.name,
      verified: d.verified,
      configured: d.configured ?? d.cdnEnabled,
    })),
  };
}

async function fetchSupabaseData(secrets: Record<string, string>) {
  const url = secrets.projectUrl?.replace(/\/$/, '');
  const anon = secrets.anonKey;
  if (!url || !anon) return { error: 'Missing project URL or anon key' };

  const headers = { apikey: anon, Authorization: `Bearer ${anon}` };

  const [healthRes, tablesRes] = await Promise.allSettled([
    fetch(`${url}/rest/v1/`, { headers }),
    fetch(`${url}/rest/v1/?select=*&limit=0`, { headers, method: 'HEAD' }),
  ]);

  const healthy = healthRes.status === 'fulfilled' && healthRes.value.ok;

  let tableNames: string[] = [];
  if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
    try {
      const defRes = await fetch(`${url}/rest/v1/`, {
        headers: { ...headers, Accept: 'application/openapi+json' },
      });
      if (defRes.ok) {
        const spec = await defRes.json() as { definitions?: Record<string, unknown> };
        tableNames = Object.keys(spec?.definitions ?? {}).slice(0, 20);
      }
    } catch { /* ignore */ }
  }

  return {
    healthy,
    projectUrl: url,
    tableCount: tableNames.length,
    tables: tableNames,
    hasServiceRole: !!secrets.serviceRoleKey,
  };
}

async function fetchFirebaseData(secrets: Record<string, string>) {
  return {
    projectId: secrets.projectId || '(unknown)',
    authDomain: secrets.authDomain || '(unknown)',
    storageBucket: secrets.storageBucket || '(unknown)',
    configured: !!(secrets.apiKey && secrets.projectId && secrets.authDomain),
    note: 'Firebase client config verified on save. Full Firestore/Auth stats require Admin SDK with your service account.',
  };
}

function getGoogleAnalyticsData(secrets: Record<string, string>) {
  const mid = secrets.measurementId;
  return {
    measurementId: mid || '(not set)',
    configured: !!mid && /^G-[A-Z0-9]+$/i.test(mid),
    injected: true,
    note: 'GA4 measurement ID is injected into your site. View full analytics at analytics.google.com.',
    dashboardUrl: `https://analytics.google.com/analytics/web/#/report-home/${mid || ''}`,
  };
}

function getMetaPixelData(secrets: Record<string, string>) {
  const pid = secrets.pixelId;
  return {
    pixelId: pid || '(not set)',
    configured: !!pid && /^\d{10,20}$/.test(pid),
    injected: true,
    note: 'Meta Pixel is injected into your site. View events at business.facebook.com/events_manager.',
    dashboardUrl: `https://business.facebook.com/events_manager2/list/pixel/${pid || ''}/overview`,
  };
}

function getCustomDomainData(secrets: Record<string, string>) {
  return {
    domainName: secrets.domainName || '(not set)',
    registrar: secrets.registrar || '(unknown)',
    configured: !!secrets.domainName,
    dnsRecords: [
      { type: 'A', host: '@', value: '76.76.21.21' },
      { type: 'CNAME', host: 'www', value: 'cname.draftly.site' },
    ],
    sslStatus: 'pending',
  };
}

function getResendData(secrets: Record<string, string>) {
  return { configured: true, provider: 'Resend', hasApiKey: Boolean(secrets.apiKey) };
}

function getSendGridData(secrets: Record<string, string>) {
  return { configured: true, provider: 'SendGrid', hasApiKey: Boolean(secrets.apiKey) };
}

const FETCHERS: Partial<Record<IntegrationId, (secrets: Record<string, string>) => unknown>> = {
  stripe: fetchStripeData,
  github: fetchGitHubData,
  vercel: fetchVercelData,
  supabase: fetchSupabaseData,
  firebase: fetchFirebaseData,
  google_analytics: getGoogleAnalyticsData,
  meta_pixel: getMetaPixelData,
  custom_domain: getCustomDomainData,
  resend: getResendData,
  sendgrid: getSendGridData,
};

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const access = await getBusinessOsAccessForUid(auth.uid);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Business OS plan required.' }, { status: 403 });
    }

    const integrationId = new URL(req.url).searchParams.get('integrationId')?.trim();
    if (!integrationId || !isIntegrationId(integrationId)) {
      return NextResponse.json({ error: 'integrationId query param required' }, { status: 400 });
    }

    const secrets = await getDecryptedSecrets(auth.uid, integrationId);
    if (!secrets) {
      return NextResponse.json({ error: 'Integration not connected or keys missing', connected: false }, { status: 404 });
    }

    const fetcher = FETCHERS[integrationId as IntegrationId];
    if (!fetcher) {
      return NextResponse.json({ error: 'No dashboard data available for this integration' }, { status: 400 });
    }

    const data = await fetcher(secrets);
    return NextResponse.json({ ok: true, integrationId, data });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('integration-data GET', e);
    return NextResponse.json({ error: 'Failed to fetch integration data' }, { status: 500 });
  }
}
