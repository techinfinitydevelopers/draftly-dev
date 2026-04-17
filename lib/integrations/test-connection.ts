import type { IntegrationId } from '@/lib/integrations/types';

export type TestResult = { ok: true; message: string } | { ok: false; message: string };

export async function testIntegrationConnection(
  id: IntegrationId,
  secrets: Record<string, string>,
): Promise<TestResult> {
  try {
    switch (id) {
      case 'stripe': {
        const sk = secrets.secretKey?.trim();
        if (!sk?.startsWith('sk_')) return { ok: false, message: 'Secret key should start with sk_test_ or sk_live_.' };
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${sk}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const msg = (j as { error?: { message?: string } })?.error?.message;
          return { ok: false, message: msg || 'Stripe rejected these keys.' };
        }
        return { ok: true, message: 'Stripe connection OK.' };
      }
      case 'supabase': {
        const url = secrets.projectUrl?.replace(/\/$/, '');
        const anon = secrets.anonKey?.trim();
        if (!url || !anon) return { ok: false, message: 'Project URL and anon key are required.' };
        const res = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        });
        if (!res.ok) return { ok: false, message: 'Could not reach Supabase REST API with this URL and anon key.' };
        return { ok: true, message: 'Supabase REST API reachable with anon key.' };
      }
      case 'resend': {
        const key = secrets.apiKey?.trim();
        if (!key) return { ok: false, message: 'API key required.' };
        const res = await fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return { ok: false, message: 'Resend rejected this API key.' };
        return { ok: true, message: 'Resend API key OK.' };
      }
      case 'sendgrid': {
        const key = secrets.apiKey?.trim();
        if (!key) return { ok: false, message: 'API key required.' };
        const res = await fetch('https://api.sendgrid.com/v3/scopes', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return { ok: false, message: 'SendGrid rejected this API key.' };
        return { ok: true, message: 'SendGrid API key OK.' };
      }
      case 'google_analytics': {
        const mid = secrets.measurementId?.trim();
        if (!mid || !/^G-[A-Z0-9]+$/i.test(mid)) {
          return { ok: false, message: 'Measurement ID should look like G-XXXXXXXXXX.' };
        }
        return { ok: true, message: 'Measurement ID format valid (GA4).' };
      }
      case 'meta_pixel': {
        const pid = secrets.pixelId?.trim();
        if (!pid || !/^\d{10,20}$/.test(pid)) {
          return { ok: false, message: 'Meta Pixel ID should be a numeric ID from Events Manager.' };
        }
        return { ok: true, message: 'Pixel ID format valid.' };
      }
      case 'firebase': {
        const { apiKey, authDomain, projectId, storageBucket } = secrets;
        if (!apiKey || !authDomain || !projectId || !storageBucket) {
          return { ok: false, message: 'All Firebase web config fields are required.' };
        }
        if (!apiKey.startsWith('AIza')) {
          return { ok: false, message: 'Firebase API key usually starts with AIza.' };
        }
        if (!authDomain.includes('.')) {
          return { ok: false, message: 'Auth domain looks invalid.' };
        }
        return {
          ok: true,
          message: 'Config format looks valid. Full verification runs when your app uses the Firebase SDK.',
        };
      }
      case 'github': {
        const token = secrets.accessToken?.trim();
        const username = secrets.username?.trim();
        if (!token) return { ok: false, message: 'Personal access token is required.' };
        if (!username) return { ok: false, message: 'GitHub username is required.' };
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
          return { ok: false, message: 'Token should start with ghp_ or github_pat_.' };
        }
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return { ok: false, message: 'GitHub rejected this token.' };
        const data = await res.json() as { login?: string };
        if (data.login?.toLowerCase() !== username.toLowerCase()) {
          return { ok: false, message: `Token belongs to "${data.login}", not "${username}".` };
        }
        return { ok: true, message: `GitHub connected as @${data.login}.` };
      }
      case 'vercel': {
        const token = secrets.apiToken?.trim();
        if (!token) return { ok: false, message: 'Vercel API token is required.' };
        const res = await fetch('https://api.vercel.com/v2/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { ok: false, message: 'Vercel rejected this token.' };
        return { ok: true, message: 'Vercel token verified.' };
      }
      case 'custom_domain': {
        const domain = secrets.domainName?.trim();
        if (!domain) return { ok: false, message: 'Domain name is required.' };
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
          return { ok: false, message: 'Domain format looks invalid (e.g. example.com).' };
        }
        return {
          ok: true,
          message: `Domain "${domain}" saved. Point your DNS A record to Draftly and we'll auto-provision SSL.`,
        };
      }
      default:
        return { ok: false, message: 'Unknown integration.' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, message: `Service temporarily unavailable: ${msg}` };
  }
}
