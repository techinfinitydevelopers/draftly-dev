#!/usr/bin/env node
/**
 * One-off / support: upgrade a user in Firestore by email.
 *
 * For awsolutionswork@gmail.com: set plan to Pro and grant combined Basic+Pro credits (1,500 + 6,000 = 7,500)
 * via subscription.customStudioCredits (see lib/subscription-plans.ts canUseStudio).
 *
 * Usage:
 *   node tools/upgrade-user-subscription.mjs
 *   node tools/upgrade-user-subscription.mjs --email other@example.com
 *   node tools/upgrade-user-subscription.mjs --dry-run
 *
 * Requires .env.local: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BASIC_CREDITS = 1500;
const PRO_CREDITS = 6000;
const COMBINED_CREDITS = BASIC_CREDITS + PRO_CREDITS;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, '\n');
    if (!process.env[key]) process.env[key] = value;
  }
}

function initAdmin() {
  loadEnvFile(join(ROOT, '.env.local'));
  loadEnvFile(join(ROOT, '.env'));

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID || 'draflty',
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
  };

  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Missing FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL (use .env.local)');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  return admin;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let email = 'awsolutionswork@gmail.com';
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = String(args[++i]).trim().toLowerCase();
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { email, dryRun };
}

async function main() {
  const { email, dryRun } = parseArgs();
  console.log('Target email:', email);
  console.log('Plan: pro | customStudioCredits:', COMBINED_CREDITS, `(${BASIC_CREDITS} Basic + ${PRO_CREDITS} Pro)`);

  const adminApp = initAdmin();
  const auth = adminApp.auth();
  const db = adminApp.firestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (e) {
    console.error('Auth lookup failed:', e?.message || e);
    process.exit(1);
  }

  const uid = userRecord.uid;
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const before = snap.exists ? snap.data() : null;

  console.log('UID:', uid);
  console.log('Before subscription:', JSON.stringify(before?.subscription || {}, null, 2));
  console.log('Before creditsUsed:', before?.generationTracking?.creditsUsed ?? '(none)');

  const patch = {
    email,
    subscription: {
      ...(before?.subscription && typeof before.subscription === 'object' ? before.subscription : {}),
      plan: 'pro',
      status: 'active',
      customStudioCredits: COMBINED_CREDITS,
      /** Keeps legacy `useSubscription` / dashboard fields aligned with the Studio credit pool */
      generationsLimit: COMBINED_CREDITS,
      adminCreditNote: `Combined Basic (${BASIC_CREDITS}) + Pro (${PRO_CREDITS}) credits — set ${new Date().toISOString()}`,
    },
    updatedAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log('[dry-run] Would write:', JSON.stringify(patch, null, 2));
    return;
  }

  await ref.set(patch, { merge: true });
  const after = (await ref.get()).data();
  console.log('After subscription:', JSON.stringify(after?.subscription || {}, null, 2));
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
