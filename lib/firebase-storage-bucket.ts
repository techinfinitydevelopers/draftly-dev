/**
 * Single source of truth for Firebase Storage bucket name (client + server).
 * Default Firebase bucket is `PROJECT_ID.appspot.com`. The `.firebasestorage.app`
 * hostname only works after Storage is provisioned for that bucket name in GCP.
 */

function projectIdFromEnv(): string {
  return (
    (typeof process !== 'undefined' && process.env.FIREBASE_PROJECT_ID) ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    ''
  ).trim();
}

/**
 * Bucket string for `initializeApp`, `getStorage`, and Admin `storage.bucket(...)`.
 */
export function resolveFirebaseStorageBucketName(): string | undefined {
  const projectId = projectIdFromEnv();
  const raw = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

  if (raw) return raw;
  if (projectId) return `${projectId}.appspot.com`;
  return undefined;
}

export const FIREBASE_STORAGE_BUCKET_MISSING_HELP =
  'Firebase Storage is not available for this project bucket. Open Firebase Console → Build → Storage → Get started to create the default bucket. Then confirm Project settings → Your apps shows the same Storage bucket as NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (typically PROJECT_ID.appspot.com). Cloud save uploads files to that bucket; preview scroll uses frames in your browser and does not depend on cloud save.';
