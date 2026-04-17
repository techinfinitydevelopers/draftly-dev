/**
 * Usage: node --env-file=.env.local tools/lookup-user-by-email.mjs <email>
 * Uses FIREBASE_* env vars or FIREBASE_ADMIN_SDK_JSON_PATH (same as lib/firebase-admin.ts).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
    console.error('Missing Firebase Admin credentials. Set .env.local (FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL) or FIREBASE_ADMIN_SDK_JSON_PATH.');
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

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: node --env-file=.env.local tools/lookup-user-by-email.mjs <email>');
  process.exit(1);
}

initAdmin();
const auth = getAuth();
const db = getFirestore();

try {
  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const data = userDoc.exists ? userDoc.data() : null;

  const out = {
    email: userRecord.email,
    uid,
    emailVerified: userRecord.emailVerified,
    disabled: userRecord.disabled,
    createdAt: userRecord.metadata.creationTime,
    lastSignIn: userRecord.metadata.lastSignInTime,
    firestoreUserDocExists: userDoc.exists,
    subscription: data?.subscription ?? null,
    generationTracking: data?.generationTracking ?? null,
  };

  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  if (e?.code === 'auth/user-not-found') {
    const snap = await db.collection('users').where('email', '==', email).limit(5).get();
    if (snap.empty) {
      console.log(JSON.stringify({ email, error: 'No Firebase Auth user and no Firestore users doc with this email.' }, null, 2));
      process.exit(0);
    }
    const rows = snap.docs.map((d) => ({
      uid: d.id,
      subscription: d.data()?.subscription ?? null,
      generationTracking: d.data()?.generationTracking ?? null,
    }));
    console.log(JSON.stringify({ email, found: 'firestore_only', accounts: rows }, null, 2));
    process.exit(0);
  }
  console.error(e?.message || e);
  process.exit(1);
}
