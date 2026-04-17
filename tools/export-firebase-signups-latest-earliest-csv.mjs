#!/usr/bin/env node
/**
 * Export up to 2,000 rows: 1) latest 1,000 Auth sign-ups (newest first),
 * 2) earliest 1,000 Auth sign-ups ever (oldest first).
 *
 * Data source: Firebase Auth (same as export-firebase-signup-emails.mjs).
 * Users without an email are skipped.
 *
 * Requires: .env or .env.local with FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID
 *
 * Usage: node tools/export-firebase-signups-latest-earliest-csv.mjs
 * Output: firebase-signups-latest-earliest-2000.csv (gitignored)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_CSV = join(ROOT, 'firebase-signups-latest-earliest-2000.csv');

const LATEST_N = 1000;
const EARLIEST_N = 1000;

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
    throw new Error('Missing FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL (use .env or .env.local)');
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

function parseCreationMs(u) {
  const t = u.metadata?.creationTime;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function escCsv(field) {
  const s = String(field ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function listAllAuthUsersWithEmail(auth) {
  const rows = [];
  let pageToken;
  let page = 0;
  console.log('Listing Firebase Auth users…');
  do {
    const res = await auth.listUsers(1000, pageToken);
    page += 1;
    for (const u of res.users) {
      const email = normalizeEmail(u.email);
      if (!email) continue;
      const createdMs = parseCreationMs(u);
      const createdIso =
        createdMs > 0 ? new Date(createdMs).toISOString() : '';
      rows.push({
        uid: u.uid,
        email,
        auth_created_at: createdIso,
        _ms: createdMs,
      });
    }
    console.log(`  page ${page}: ${rows.length} rows with email`);
    pageToken = res.pageToken;
  } while (pageToken);
  return rows;
}

async function main() {
  const app = initAdmin();
  const auth = app.auth();

  const rows = await listAllAuthUsersWithEmail(auth);
  rows.sort((a, b) => a._ms - b._ms);

  const n = rows.length;
  const earliestSlice = rows.slice(0, Math.min(EARLIEST_N, n));
  const latestSlice = rows.slice(Math.max(0, n - LATEST_N)).reverse();

  const lines = [
    [
      'csv_row_order',
      'section',
      'section_index',
      'email',
      'uid',
      'auth_created_at',
    ].join(','),
  ];

  let order = 0;
  for (let i = 0; i < latestSlice.length; i++) {
    order += 1;
    const r = latestSlice[i];
    lines.push(
      [
        order,
        escCsv('latest_signups'),
        i + 1,
        escCsv(r.email),
        escCsv(r.uid),
        escCsv(r.auth_created_at),
      ].join(',')
    );
  }
  for (let i = 0; i < earliestSlice.length; i++) {
    order += 1;
    const r = earliestSlice[i];
    lines.push(
      [
        order,
        escCsv('earliest_signups'),
        i + 1,
        escCsv(r.email),
        escCsv(r.uid),
        escCsv(r.auth_created_at),
      ].join(',')
    );
  }

  const body = lines.join('\n') + '\n';
  writeFileSync(OUT_CSV, body, 'utf8');

  console.log('');
  console.log(`Total Auth users with email: ${n}`);
  console.log(`Latest block rows: ${latestSlice.length} (newest first)`);
  console.log(`Earliest block rows: ${earliestSlice.length} (oldest first)`);
  console.log(`Total CSV data rows: ${latestSlice.length + earliestSlice.length}`);
  if (n < LATEST_N + EARLIEST_N) {
    console.log(
      'Note: Fewer than 2,000 distinct users — blocks may overlap or be shorter than 1,000 each.'
    );
  }
  console.log(`Wrote: ${OUT_CSV}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
