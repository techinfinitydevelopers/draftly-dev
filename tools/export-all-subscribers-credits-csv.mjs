#!/usr/bin/env node
/**
 * Export every Firestore user who has purchased (Dodo customer/subscription id) or a paid plan slug,
 * with credits used / remaining (same rules as app + /api/internal/subscribers-credits).
 *
 * Usage:
 *   node --env-file=.env tools/export-all-subscribers-credits-csv.mjs
 *   node --env-file=.env tools/export-all-subscribers-credits-csv.mjs --include-tester-testing
 *
 * Output: paid-subscribers-credits-export.csv (gitignored via /paid-*.csv)
 */
import { createWriteStream, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_FILE = resolve(ROOT, 'paid-subscribers-credits-export.csv');

/** Mirrors lib/subscription-plan credit totals (monthly pool). */
const PLAN_CREDITS = {
  free: 0,
  tester: 200,
  testing: 800,
  basic: 1500,
  'basic-plus': 2500,
  pro: 6000,
  premium: 25000,
  agency: 125000,
};

/** Mirrors lib/owner-emails.ts */
const OWNER_EMAILS = new Set(
  [
    'piyush.glitch@draftly.business',
    'piyushsinghok4355@gmail.com',
    'piyushsingh123443@gmail.com',
    'piyushok4350@gmail.com',
  ].map((e) => e.trim().toLowerCase()),
);

function isOwnerEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return OWNER_EMAILS.has(email.trim().toLowerCase());
}

function initAdmin() {
  if (getApps().length > 0) return;

  const jsonPath = process.env.FIREBASE_ADMIN_SDK_JSON_PATH?.trim();
  if (jsonPath) {
    const abs = resolve(process.cwd(), jsonPath);
    if (!existsSync(abs)) {
      console.error('FIREBASE_ADMIN_SDK_JSON_PATH file not found:', abs);
      process.exit(1);
    }
    const parsed = JSON.parse(readFileSync(abs, 'utf8'));
    initializeApp({
      credential: cert(parsed),
      projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || 'draflty',
    });
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!privateKey || !clientEmail) {
    console.error(
      'Missing Firebase Admin credentials. Set .env (FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL) or FIREBASE_ADMIN_SDK_JSON_PATH.',
    );
    process.exit(1);
  }

  initializeApp({
    credential: cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || 'draflty',
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
      universe_domain: 'googleapis.com',
    }),
    projectId: process.env.FIREBASE_PROJECT_ID || 'draflty',
  });
}

function creditsTotalForUser(plan, customStudioCredits) {
  const p = String(plan || 'free').toLowerCase();
  const limits = PLAN_CREDITS[p] ?? PLAN_CREDITS.free;
  const custom =
    typeof customStudioCredits === 'number' && Number.isFinite(customStudioCredits) && customStudioCredits > 0
      ? Math.floor(customStudioCredits)
      : null;
  return custom ?? limits;
}

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const PAID_PLAN_SLUGS = new Set(['basic', 'basic-plus', 'pro', 'premium', 'agency']);
const OPTIONAL_PLAN_SLUGS = new Set(['tester', 'testing']);

function isPurchaser(sub, includeTesterTesting) {
  if (!sub || typeof sub !== 'object') return false;
  if (sub.dodoSubscriptionId || sub.dodoCustomerId) return true;
  const plan = String(sub.plan || 'free').toLowerCase();
  if (PAID_PLAN_SLUGS.has(plan)) return true;
  if (includeTesterTesting && OPTIONAL_PLAN_SLUGS.has(plan)) return true;
  return false;
}

const includeTesterTesting = process.argv.includes('--include-tester-testing');

initAdmin();
const db = getFirestore();

const headers = [
  'uid',
  'email',
  'plan',
  'subscription_status',
  'credits_total',
  'credits_used',
  'credits_remaining',
  'custom_studio_credits',
  'is_owner_unlimited',
  'last_reset_date',
  'dodo_customer_id',
  'dodo_subscription_id',
  'subscription_start_date',
  'subscription_end_date',
  'cancelled_at',
  'cancel_at_period_end',
];

const PAGE = 500;
let lastDoc = null;
let totalScanned = 0;
let included = 0;

const out = createWriteStream(OUT_FILE, { encoding: 'utf8' });
out.write(`${headers.map(csvEscape).join(',')}\n`);

try {
  while (true) {
    let q = db.collection('users').orderBy(FieldPath.documentId()).limit(PAGE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      totalScanned++;
      const d = doc.data() || {};
      const email = String(d.email || '').trim();
      const sub = d.subscription || {};
      if (!isPurchaser(sub, includeTesterTesting)) continue;

      included++;
      const plan = String(sub.plan || 'free').toLowerCase();
      const status = String(sub.status || '').toLowerCase();
      const custom = sub.customStudioCredits;
      const gt = d.generationTracking || {};
      const creditsUsed = Number(gt.creditsUsed) || 0;
      const owner = isOwnerEmail(email);
      const creditsTotal = owner ? '' : creditsTotalForUser(plan, custom);
      const totalNum = owner ? null : Number(creditsTotal);
      const creditsRemaining =
        owner ? 'unlimited' : totalNum !== null ? Math.max(0, totalNum - creditsUsed) : '';

      const row = [
        doc.id,
        email,
        plan,
        status || '',
        owner ? 'unlimited' : creditsTotal,
        creditsUsed,
        creditsRemaining,
        typeof custom === 'number' && Number.isFinite(custom) ? custom : '',
        owner ? 'yes' : 'no',
        gt.lastResetDate != null ? String(gt.lastResetDate) : '',
        sub.dodoCustomerId != null ? String(sub.dodoCustomerId) : '',
        sub.dodoSubscriptionId != null ? String(sub.dodoSubscriptionId) : '',
        sub.startDate != null ? String(sub.startDate) : '',
        sub.endDate != null ? String(sub.endDate) : '',
        sub.cancelledAt != null ? String(sub.cancelledAt) : '',
        sub.cancelAtPeriodEnd === true ? 'yes' : sub.cancelAtPeriodEnd === false ? 'no' : '',
      ];
      out.write(`${row.map(csvEscape).join(',')}\n`);
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
} finally {
  out.end();
}

await new Promise((resolve, reject) => {
  out.on('finish', resolve);
  out.on('error', reject);
});

console.log(`Wrote ${included} rows to ${OUT_FILE}`);
console.log(`Scanned ${totalScanned} user documents total.`);
if (!includeTesterTesting) {
  console.log('Note: tester/testing plans without Dodo IDs were excluded. Re-run with --include-tester-testing to include them.');
}
