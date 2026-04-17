/**
 * Scan Firestore `users` and report emails that appear on more than one document (different UIDs).
 *
 * Note: This does NOT mean "paid twice" — Firestore only stores the current subscription per doc.
 * Repeat purchases / upgrades are reconciled into a single subscription; use Dodo for full history.
 *
 * Usage: node --env-file=.env.local tools/firestore-same-email-multiple-users.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

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
      'Missing Firebase Admin credentials. Set FIREBASE_ADMIN_SDK_JSON_PATH or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL.',
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

function normalizeEmail(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  if (!s || !s.includes('@')) return null;
  return s;
}

initAdmin();
const db = getFirestore();
const col = db.collection('users');

/** @type {Map<string, Array<{ uid: string; plan: string; status: string; dodoSubscriptionId: string | null }>>} */
const byEmail = new Map();

let lastDoc = null;
const batchSize = 500;
let totalDocs = 0;
let batchNum = 0;

const limitArg = process.argv.find((a) => a.startsWith('--max-docs='));
const maxDocs = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : null;

console.error('Scanning Firestore users…', maxDocs ? `(stopping after ~${maxDocs} docs)` : '');

while (true) {
  let q = col.orderBy(FieldPath.documentId()).limit(batchSize);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;

  batchNum += 1;
  if (batchNum === 1 || batchNum % 5 === 0) {
    console.error(`  …batch ${batchNum}, ${totalDocs + snap.size} documents read`);
  }

  for (const doc of snap.docs) {
    totalDocs += 1;
    const data = doc.data() || {};
    const email = normalizeEmail(data.email);
    if (!email) continue;
    const sub = data.subscription || {};
    const row = {
      uid: doc.id,
      plan: String(sub.plan || 'free'),
      status: String(sub.status || ''),
      dodoSubscriptionId: sub.dodoSubscriptionId ? String(sub.dodoSubscriptionId) : null,
    };
    const list = byEmail.get(email) || [];
    list.push(row);
    byEmail.set(email, list);
  }

  lastDoc = snap.docs[snap.docs.length - 1];
  if (maxDocs !== null && totalDocs >= maxDocs) break;
  if (snap.size < batchSize) break;
}

const duplicates = [...byEmail.entries()].filter(([, rows]) => rows.length > 1);

const out = {
  scannedUserDocuments: totalDocs,
  distinctEmailsWithField: byEmail.size,
  emailsWithMultipleUserDocs: duplicates.length,
  details: duplicates.map(([email, accounts]) => ({
    email,
    accountCount: accounts.length,
    accounts,
  })),
};

console.log(JSON.stringify(out, null, 2));
