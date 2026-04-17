import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const SALT = 'draftly-integration-secrets-v1';

function getKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length < 24) {
    throw new Error(
      'INTEGRATIONS_ENCRYPTION_SECRET is not set or too short (use at least 24 random characters).',
    );
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptSecretsJson(json: Record<string, string>): string {
  const plain = JSON.stringify(json);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptSecretsJson(ciphertext: string): Record<string, string> {
  const buf = Buffer.from(ciphertext, 'base64url');
  if (buf.length < 12 + 16) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  const parsed = JSON.parse(plain) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid secrets payload');
  return parsed as Record<string, string>;
}
