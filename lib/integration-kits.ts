export type IntegrationKitId =
  | 'github'
  | 'vercel'
  | 'firebase'
  | 'supabase'
  | 'stripe'
  | 'database';

export interface IntegrationKit {
  id: IntegrationKitId;
  name: string;
  description: string;
  requiredEnvKeys: string[];
  /**
   * Files to scaffold into generated projects.
   * These are safe placeholders (no secrets), designed for users to fill in env vars.
   */
  files: (opts: { appUrl?: string }) => Record<string, string>;
}

function envExample(keys: string[]) {
  const unique = Array.from(new Set(keys)).filter(Boolean);
  unique.sort((a, b) => a.localeCompare(b));
  return unique.map((k) => `${k}=`).join('\n') + '\n';
}

export const INTEGRATION_KITS: Record<IntegrationKitId, IntegrationKit> = {
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Repo push + CI placeholders. Users connect with their own tokens or use Draftly OAuth when available.',
    requiredEnvKeys: [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ],
    files: ({ appUrl }) => ({
      'INTEGRATIONS/GITHUB.md': `# GitHub Integration\n\nThis project supports GitHub OAuth for optional features.\n\n## Env vars\n- GITHUB_CLIENT_ID\n- GITHUB_CLIENT_SECRET\n- NEXT_PUBLIC_APP_URL${appUrl ? ` (suggested: ${appUrl})` : ''}\n\n## Notes\n- For deployments (Vercel/etc.), set these as provider secrets.\n`,
    }),
  },
  vercel: {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy-ready scaffolding (no direct Vercel account access needed).',
    requiredEnvKeys: [
      'NEXT_PUBLIC_APP_URL',
      'VERCEL_PROJECT_ID',
      'VERCEL_ORG_ID',
      'VERCEL_TOKEN',
    ],
    files: ({ appUrl }) => ({
      'vercel.json': JSON.stringify(
        {
          cleanUrls: true,
          trailingSlash: false,
        },
        null,
        2
      ) + '\n',
      'INTEGRATIONS/VERCEL.md': `# Vercel Deployment\n\n## Option A: Deploy via Vercel UI\n1. Push to GitHub\n2. Import repo in Vercel\n3. Add env vars in Vercel Project Settings\n\n## Option B: Deploy via CLI\n- Install: npm i -g vercel\n- Run: vercel\n\n## Optional env vars\n- NEXT_PUBLIC_APP_URL${appUrl ? ` (suggested: ${appUrl})` : ''}\n- VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID (only needed for programmatic deploy)\n`,
    }),
  },
  firebase: {
    id: 'firebase',
    name: 'Firebase',
    description: 'Firebase client + Admin SDK placeholders.',
    requiredEnvKeys: [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
    ],
    files: () => ({
      'INTEGRATIONS/FIREBASE.md': `# Firebase Setup\n\n## Client SDK env vars (public)\n- NEXT_PUBLIC_FIREBASE_API_KEY\n- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n- NEXT_PUBLIC_FIREBASE_APP_ID\n- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID\n\n## Admin SDK env vars (server-only)\n- FIREBASE_PROJECT_ID\n- FIREBASE_PRIVATE_KEY\n- FIREBASE_CLIENT_EMAIL\n\n## Notes\n- Never expose Admin SDK keys to the client.\n- Put server-only env vars in your deployment provider secrets.\n`,
    }),
  },
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    description: 'Supabase client placeholders (users paste their own keys).',
    requiredEnvKeys: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
    files: () => ({
      'lib/supabase/client.ts': `import { createClient } from '@supabase/supabase-js';\n\nconst url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';\nconst anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';\n\nexport const supabase = createClient(url, anonKey);\n`,
      'INTEGRATIONS/SUPABASE.md': `# Supabase Setup\n\n## Env vars\n- NEXT_PUBLIC_SUPABASE_URL\n- NEXT_PUBLIC_SUPABASE_ANON_KEY\n- SUPABASE_SERVICE_ROLE_KEY (server-only, optional)\n\n## Notes\n- Use the anon key in the browser.\n- Keep service role key server-only.\n`,
    }),
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Stripe env placeholders for payments (users paste keys).',
    requiredEnvKeys: [
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ],
    files: () => ({
      'INTEGRATIONS/STRIPE.md': `# Stripe Setup\n\n## Env vars\n- STRIPE_PUBLISHABLE_KEY\n- STRIPE_SECRET_KEY\n- STRIPE_WEBHOOK_SECRET\n`,
    }),
  },
  database: {
    id: 'database',
    name: 'Database',
    description: 'Generic DB placeholders (Postgres etc.).',
    requiredEnvKeys: ['DATABASE_URL'],
    files: () => ({
      'INTEGRATIONS/DATABASE.md': `# Database\n\n## Env vars\n- DATABASE_URL\n\nUse your provider (Neon, Supabase, Railway, etc.) and set DATABASE_URL.\n`,
    }),
  },
};

export function getKitRequiredEnvKeys(kits: IntegrationKitId[]): string[] {
  const keys: string[] = [];
  for (const k of kits) {
    const kit = INTEGRATION_KITS[k];
    if (kit) keys.push(...kit.requiredEnvKeys);
  }
  return keys;
}

export function buildKitFiles(kits: IntegrationKitId[], opts: { appUrl?: string } = {}) {
  const files: Record<string, string> = {};
  for (const k of kits) {
    const kit = INTEGRATION_KITS[k];
    if (!kit) continue;
    Object.assign(files, kit.files(opts));
  }
  return files;
}

export function buildEnvExampleFromKitsAndExistingKeys(params: {
  kits: IntegrationKitId[];
  existingEnvKeys?: string[];
}) {
  const base = ['NEXT_PUBLIC_APP_URL'];
  const kitKeys = getKitRequiredEnvKeys(params.kits);
  const existing = params.existingEnvKeys || [];
  return envExample([...base, ...kitKeys, ...existing]);
}

