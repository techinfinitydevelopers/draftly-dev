import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { resolveFirebaseStorageBucketName } from '@/lib/firebase-storage-bucket';

let adminApp: App | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminStorage: ReturnType<typeof getStorage> | null = null;

/** Optional local JSON (gitignored). Set FIREBASE_ADMIN_SDK_JSON_PATH=firebase-adminsdk.local.json */
function loadServiceAccountFromJsonFile(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_JSON_PATH?.trim();
  if (!raw) return null;
  const abs = resolve(process.cwd(), raw);
  if (!existsSync(abs)) {
    throw new Error(
      `FIREBASE_ADMIN_SDK_JSON_PATH is set but file not found: ${abs}. Remove the env var or add the JSON file.`,
    );
  }
  try {
    const parsed = JSON.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
    if (parsed?.type !== 'service_account' || typeof parsed.private_key !== 'string') {
      throw new Error('Invalid service account JSON (expected type service_account and private_key).');
    }
    return parsed;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`FIREBASE_ADMIN_SDK_JSON_PATH file is not valid JSON: ${abs}`);
    }
    throw e;
  }
}

// Initialize Firebase Admin SDK
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const fromFile = loadServiceAccountFromJsonFile();
  if (fromFile) {
    try {
      const storageBucket = resolveFirebaseStorageBucketName();
      const projectId =
        (typeof fromFile.project_id === 'string' && fromFile.project_id) ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        '';
      adminApp = initializeApp({
        credential: cert(fromFile as any),
        projectId,
        ...(storageBucket && { storageBucket }),
      });
      console.log('✅ Firebase Admin SDK initialized (service account JSON file)');
      return adminApp;
    } catch (error: unknown) {
      console.error('❌ Failed to initialize Firebase Admin SDK from JSON file:', error);
      throw error;
    }
  }

  // Initialize with service account credentials from environment variables
  // NEVER hardcode credentials - always use environment variables
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
    client_id: process.env.FIREBASE_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || "",
    universe_domain: "googleapis.com"
  };

  // Validate required fields
  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Firebase Admin credentials are missing. Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL environment variables.');
  }

  try {
    const storageBucket = resolveFirebaseStorageBucketName();
    adminApp = initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
      ...(storageBucket && { storageBucket }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }

  return adminApp;
}

export function getAdminAuth() {
  if (!adminAuth) {
    const app = getAdminApp();
    adminAuth = getAuth(app);
  }
  return adminAuth;
}

export function getAdminDb() {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

export function getAdminStorage() {
  if (!adminStorage) {
    const app = getAdminApp();
    adminStorage = getStorage(app);
  }
  return adminStorage;
}
