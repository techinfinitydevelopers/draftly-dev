/**
 * Support: zero out monthly-style usage on users/{uid}.generationTracking so the user
 * gets their full plan credits/limits again (does not change subscription.plan).
 *
 * Usage:
 *   node tools/reset-user-credits.mjs <email>
 *   node tools/reset-user-credits.mjs --uid <firebaseUid>
 *   node tools/reset-user-credits.mjs <email> --dry-run
 *
 * Loads .env.local and .env from repo root (no need for node --env-file).
 * Requires FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL (+ FIREBASE_PROJECT_ID), or FIREBASE_ADMIN_SDK_JSON_PATH.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const dryRun = process.argv.includes('--dry-run');
const argv = process.argv.slice(2).filter((a) => a !== '--dry-run');

let uidArg = null;
let emailRaw = null;
if (argv[0] === '--uid' && argv[1]) {
  uidArg = argv[1].trim();
} else if (argv[0]) {
  emailRaw = argv[0].trim();
}

if (!uidArg && !emailRaw) {
  console.error('Usage: node tools/reset-user-credits.mjs <email>');
  console.error('       node tools/reset-user-credits.mjs --uid <firebaseUid>');
  console.error('       Add --dry-run to preview without writing.');
  process.exit(1);
}

const emailLower = emailRaw ? emailRaw.toLowerCase() : '';

function initAdmin() {
  if (getApps().length > 0) return;

  const jsonPath = process.env.FIREBASE_ADMIN_SDK_JSON_PATH?.trim();
  if (jsonPath) {
    const abs = resolve(ROOT, jsonPath);
    if (!existsSync(abs)) {
      console.error('FIREBASE_ADMIN_SDK_JSON_PATH file not found:', abs);
      process.exit(1);
    }
    const parsed = JSON.parse(readFileSync(abs, 'utf8'));
    const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID || 'draflty';
    initializeApp({
      credential: cert(parsed),
      projectId,
    });
    console.log('Firebase Admin: using JSON file, projectId=', projectId);
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!privateKey || !clientEmail) {
    console.error(
      'Missing Firebase Admin credentials. Set FIREBASE_ADMIN_SDK_JSON_PATH or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL in .env.local',
    );
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'draflty';
  initializeApp({
    credential: cert({
      type: 'service_account',
      project_id: projectId,
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
    projectId,
  });
  console.log('Firebase Admin: using env vars, projectId=', projectId);
}

initAdmin();
const auth = getAuth();
const db = getFirestore();

/** Counters that consume credits / monthly quotas; projects map is preserved. */
function buildTrackingPatch(existing) {
  const gt = existing && typeof existing === 'object' ? { ...existing } : {};
  return {
    ...gt,
    creditsUsed: 0,
    chatsUsed: 0,
    sites3DGenerated: 0,
    fullAppsGenerated: 0,
    uiPreviewsGenerated: 0,
    studioGenerations: 0,
    studioImageGenerations: 0,
    studioVideoGenerations: 0,
    builderImageGenerations: 0,
    builderVideoGenerations: 0,
  };
}

async function patchUser(uid, label, emailForDoc) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const before = snap.exists ? snap.data() : null;
  const prev = before?.generationTracking || {};
  const next = buildTrackingPatch(prev);

  console.log(`\n--- ${label} ${uid} ---`);
  console.log('Before creditsUsed:', prev.creditsUsed ?? 0);
  console.log('After creditsUsed:', next.creditsUsed);

  if (dryRun) {
    console.log('[dry-run] no write');
    return;
  }

  const patch = {
    generationTracking: next,
    updatedAt: new Date().toISOString(),
  };
  if (emailForDoc) patch.email = emailForDoc;

  await ref.set(patch, { merge: true });
  console.log('Updated.');
}

try {
  if (uidArg) {
    await patchUser(uidArg, 'uid', null);
    console.log('\nDone.');
    process.exit(0);
  }

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(emailLower);
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e;
    userRecord = null;
  }

  if (userRecord) {
    await patchUser(userRecord.uid, 'auth', userRecord.email || emailLower);
  } else {
    const variants = [...new Set([emailLower, emailRaw].filter(Boolean))];
    let snap = null;
    for (const v of variants) {
      const q = await db.collection('users').where('email', '==', v).limit(10).get();
      if (!q.empty) {
        snap = q;
        break;
      }
    }
    if (!snap || snap.empty) {
      console.error('No Firebase Auth user and no Firestore users doc for:', variants.join(' / '));
      console.error('Tip: create the account once in the app, or run with --uid <FirebaseAuth UID> from Console.');
      process.exit(1);
    }
    for (const d of snap.docs) {
      const em = d.data()?.email || emailLower;
      await patchUser(d.id, 'firestore', em);
    }
  }

  console.log('\nDone.');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
