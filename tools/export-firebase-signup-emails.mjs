#!/usr/bin/env node
/**
 * Export signup emails from Firebase Auth (canonical for “every sign up”), comma-separated for marketing tools.
 *
 * Requires: .env.local with FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL (same as Admin SDK).
 *
 * Usage: npm run export-signup-emails
 *        npm run export-signup-emails -- --merge-firestore   (union with Firestore users collection; slower)
 *        npm run export-signup-emails-csv   (single column "email", one row per address)
 *        npm run export-signup-emails -- --csv   (txt + csv)
 * Output: firebase-signup-emails-export.txt and/or firebase-signup-emails-export.csv (gitignored)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'firebase-signup-emails-export.txt');
const OUT_CSV = join(ROOT, 'firebase-signup-emails-export.csv');

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
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
    universe_domain: 'googleapis.com',
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

function normalizeEmail(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  if (!s || !s.includes('@')) return null;
  return s;
}

async function collectAuthEmails(auth) {
  const emails = new Set();
  let pageToken;
  let page = 0;
  console.log('Listing Firebase Auth users (this is the signup list)…');
  do {
    const res = await auth.listUsers(1000, pageToken);
    page += 1;
    for (const u of res.users) {
      const e = normalizeEmail(u.email);
      if (e) emails.add(e);
    }
    if (page === 1 || page % 5 === 0 || !res.pageToken) {
      console.log(`  Auth page ${page}: ${emails.size} emails so far`);
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return emails;
}

async function collectFirestoreEmails(db) {
  const emails = new Set();
  const col = db.collection('users');
  let lastDoc = null;
  const batchSize = 500;
  let batch = 0;
  console.log('Reading Firestore users collection (batched)…');
  while (true) {
    let q = col.orderBy(FieldPath.documentId()).limit(batchSize);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    batch += 1;
    snap.forEach((doc) => {
      const data = doc.data() || {};
      const e = normalizeEmail(data.email);
      if (e) emails.add(e);
    });
    lastDoc = snap.docs[snap.docs.length - 1];
    if (batch === 1 || batch % 10 === 0) {
      console.log(`  Firestore batch ${batch}: ${emails.size} emails so far`);
    }
    if (snap.size < batchSize) break;
  }
  return emails;
}

/** Lines of comma-separated emails (no numbers). ~6 emails per line for copy-paste. */
function formatMarketingLines(sortedEmails, perLine = 6) {
  const lines = [];
  for (let i = 0; i < sortedEmails.length; i += perLine) {
    const chunk = sortedEmails.slice(i, i + perLine);
    lines.push(chunk.map((e) => `${e},`).join(' '));
  }
  return lines.join('\n');
}

/** One column `email`, RFC 4180-style quoting when needed. */
function formatCsv(sortedEmails) {
  const esc = (field) => {
    const s = String(field);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return ['email', ...sortedEmails.map(esc)].join('\n');
}

async function main() {
  const mergeFirestore = process.argv.includes('--merge-firestore');
  const csvOnly = process.argv.includes('--csv-only');
  const csvAlso = process.argv.includes('--csv');

  const app = initAdmin();
  const auth = app.auth();

  const fromAuth = await collectAuthEmails(auth);
  let fromFs = new Set();
  if (mergeFirestore) {
    const db = app.firestore();
    fromFs = await collectFirestoreEmails(db);
  }

  const merged = new Set([...fromAuth, ...fromFs]);
  const sorted = [...merged].sort((a, b) => a.localeCompare(b));

  if (csvOnly) {
    const csvBody = formatCsv(sorted);
    writeFileSync(OUT_CSV, csvBody + (sorted.length ? '\n' : ''), 'utf8');
  } else {
    const body = formatMarketingLines(sorted);
    writeFileSync(OUT_FILE, body + (body ? '\n' : ''), 'utf8');
    if (csvAlso) {
      const csvBody = formatCsv(sorted);
      writeFileSync(OUT_CSV, csvBody + (sorted.length ? '\n' : ''), 'utf8');
    }
  }

  console.log(`Auth users with email: ${fromAuth.size}`);
  if (mergeFirestore) {
    console.log(`Firestore users docs with email: ${fromFs.size}`);
  }
  console.log(`Unique emails: ${sorted.length}`);
  if (csvOnly) {
    console.log(`Wrote: ${OUT_CSV}`);
  } else {
    console.log(`Wrote: ${OUT_FILE}`);
    if (csvAlso) console.log(`Wrote: ${OUT_CSV}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
