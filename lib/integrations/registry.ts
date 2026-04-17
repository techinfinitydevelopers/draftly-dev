import type { IntegrationDefinition, IntegrationId } from '@/lib/integrations/types';

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'firebase',
    name: 'Firebase',
    description: 'Auth, Firestore, and optional hosting for your project.',
    category: 'backend',
    icon: 'fa-fire-flame-curved',
    dashboardUrl: 'https://console.firebase.google.com/',
    docsUrl: 'https://firebase.google.com/docs/web/setup',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'AIza...' },
      { key: 'authDomain', label: 'Auth domain', type: 'text', required: true, placeholder: 'app.firebaseapp.com' },
      { key: 'projectId', label: 'Project ID', type: 'text', required: true, placeholder: 'my-app' },
      { key: 'storageBucket', label: 'Storage bucket', type: 'text', required: true, placeholder: 'my-app.appspot.com' },
    ],
    activatesFeatures: ['firebase_auth', 'firestore', 'firebase_storage'],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Postgres, auth, and storage in one backend.',
    category: 'backend',
    icon: 'fa-bolt',
    dashboardUrl: 'https://supabase.com/dashboard',
    docsUrl: 'https://supabase.com/docs/guides/api',
    fields: [
      { key: 'projectUrl', label: 'Project URL', type: 'url', required: true, placeholder: 'https://xxx.supabase.co' },
      { key: 'anonKey', label: 'Anon (public) key', type: 'password', required: true },
      {
        key: 'serviceRoleKey',
        label: 'Service role key',
        type: 'password',
        required: false,
        warn: 'Bypasses Row Level Security. Only use if you understand server-side use.',
      },
    ],
    activatesFeatures: ['supabase_db', 'supabase_auth', 'supabase_storage'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payments, checkout, and subscriptions.',
    category: 'payments',
    icon: 'fa-credit-card',
    dashboardUrl: 'https://dashboard.stripe.com/apikeys',
    docsUrl: 'https://stripe.com/docs/keys',
    fields: [
      { key: 'publishableKey', label: 'Publishable key', type: 'password', required: true, placeholder: 'pk_live_... or pk_test_...' },
      { key: 'secretKey', label: 'Secret key', type: 'password', required: true, placeholder: 'sk_live_... or sk_test_...' },
    ],
    activatesFeatures: ['stripe_checkout', 'stripe_subscriptions', 'stripe_dashboard'],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics (GA4)',
    description: 'Measure traffic and conversions with GA4.',
    category: 'analytics',
    icon: 'fa-chart-line',
    dashboardUrl: 'https://analytics.google.com/',
    docsUrl: 'https://support.google.com/analytics/answer/9304153',
    fields: [{ key: 'measurementId', label: 'Measurement ID', type: 'text', required: true, placeholder: 'G-XXXXXXXXXX' }],
    activatesFeatures: ['ga4_pageviews', 'ga4_events'],
  },
  {
    id: 'meta_pixel',
    name: 'Meta Pixel',
    description: 'Track conversions and optimize Meta ads.',
    category: 'ads',
    icon: 'fa-bullseye',
    dashboardUrl: 'https://business.facebook.com/events_manager',
    fields: [{ key: 'pixelId', label: 'Pixel ID', type: 'text', required: true, placeholder: '15-digit ID' }],
    activatesFeatures: ['meta_conversions', 'meta_ads_insights'],
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Transactional email for forms and notifications.',
    category: 'email',
    icon: 'fa-envelope',
    dashboardUrl: 'https://resend.com/api-keys',
    fields: [{ key: 'apiKey', label: 'API key', type: 'password', required: true }],
    activatesFeatures: ['email_outbound', 'contact_form_delivery'],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email API for marketing and transactional mail.',
    category: 'email',
    icon: 'fa-paper-plane',
    dashboardUrl: 'https://app.sendgrid.com/settings/api_keys',
    fields: [{ key: 'apiKey', label: 'API key', type: 'password', required: true }],
    activatesFeatures: ['email_outbound', 'contact_form_delivery'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Push your site to a repo, enable CI/CD, and manage code.',
    category: 'devops',
    icon: 'fa-code-branch',
    dashboardUrl: 'https://github.com/settings/tokens',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    fields: [
      { key: 'accessToken', label: 'Personal access token', type: 'password', required: true, placeholder: 'ghp_...' },
      { key: 'username', label: 'GitHub username', type: 'text', required: true, placeholder: 'your-username' },
      { key: 'repoName', label: 'Repository name', type: 'text', required: false, placeholder: 'my-draftly-site', help: 'Leave blank to auto-create on deploy.' },
    ],
    activatesFeatures: ['github_push', 'github_actions', 'github_pages'],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy your site to Vercel with automatic SSL and edge CDN.',
    category: 'hosting',
    icon: 'fa-rocket',
    dashboardUrl: 'https://vercel.com/account/tokens',
    docsUrl: 'https://vercel.com/docs/rest-api#authentication',
    fields: [
      { key: 'apiToken', label: 'API token', type: 'password', required: true, placeholder: 'Your Vercel token' },
      { key: 'teamId', label: 'Team ID', type: 'text', required: false, placeholder: 'team_... (leave blank for personal)', help: 'Found in team settings. Leave blank for personal account.' },
    ],
    activatesFeatures: ['vercel_deploy', 'vercel_preview', 'edge_cdn'],
  },
  {
    id: 'custom_domain',
    name: 'Custom Domain',
    description: 'Point your own domain (GoDaddy, Namecheap, Cloudflare, etc.) to Draftly hosting.',
    category: 'hosting',
    icon: 'fa-globe',
    dashboardUrl: 'https://www.godaddy.com/domains',
    fields: [
      { key: 'domainName', label: 'Domain name', type: 'text', required: true, placeholder: 'example.com' },
      { key: 'registrar', label: 'Domain registrar', type: 'text', required: false, placeholder: 'GoDaddy, Namecheap, Cloudflare...', help: 'Where you bought the domain.' },
    ],
    activatesFeatures: ['custom_dns', 'ssl_auto', 'draftly_hosting'],
  },
];

const BY_ID: Record<string, IntegrationDefinition> = Object.fromEntries(INTEGRATIONS.map((d) => [d.id, d]));

export function getIntegrationDefinition(id: string): IntegrationDefinition | undefined {
  return BY_ID[id];
}

export function isIntegrationId(id: string): id is IntegrationId {
  return id in BY_ID;
}
