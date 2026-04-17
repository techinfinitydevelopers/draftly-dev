/**
 * Wasabi S3-compatible storage client (server-side only).
 * Uses @aws-sdk/client-s3 with Wasabi endpoint.
 */

import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

function getWasabiClient(): S3Client {
  const endpoint = process.env.WASABI_ENDPOINT_URL;
  const region = process.env.WASABI_REGION;
  const accessKeyId = process.env.WASABI_ACCESS_KEY;
  const secretAccessKey = process.env.WASABI_SECRET_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Wasabi not configured. Set WASABI_ENDPOINT_URL, WASABI_REGION, WASABI_ACCESS_KEY, WASABI_SECRET_KEY in .env.local',
    );
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // required for Wasabi
  });
}

// Singleton
let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) _client = getWasabiClient();
  return _client;
}

function bucket(): string {
  const b = process.env.WASABI_BUCKET_NAME;
  if (!b) throw new Error('WASABI_BUCKET_NAME is not set');
  return b;
}

/**
 * Upload a Buffer to Wasabi.
 * Path format: users/{uid}/projects/{projectId}/{filename}
 */
export async function uploadToWasabi(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export function wasabiProjectPath(uid: string, projectId: string, filename: string): string {
  return `users/${uid}/projects/${projectId}/${filename}`;
}

export function isWasabiConfigured(): boolean {
  return !!(
    process.env.WASABI_ENDPOINT_URL &&
    process.env.WASABI_REGION &&
    process.env.WASABI_ACCESS_KEY &&
    process.env.WASABI_SECRET_KEY &&
    process.env.WASABI_BUCKET_NAME
  );
}
