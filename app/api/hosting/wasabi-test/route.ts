/**
 * GET /api/hosting/wasabi-test
 * Quick Wasabi connectivity check — returns config status and bucket test result.
 * Only accessible to admins (checks ADMIN_SECRET_KEY header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isWasabiConfigured } from '@/lib/wasabi-server';
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const configured = isWasabiConfigured();
  const vars = {
    WASABI_ENDPOINT_URL: !!process.env.WASABI_ENDPOINT_URL,
    WASABI_REGION: !!process.env.WASABI_REGION,
    WASABI_ACCESS_KEY: !!process.env.WASABI_ACCESS_KEY,
    WASABI_SECRET_KEY: !!process.env.WASABI_SECRET_KEY,
    WASABI_BUCKET_NAME: !!process.env.WASABI_BUCKET_NAME,
    bucket: process.env.WASABI_BUCKET_NAME || '(not set)',
    endpoint: process.env.WASABI_ENDPOINT_URL || '(not set)',
  };

  if (!configured) {
    return NextResponse.json({ configured: false, vars });
  }

  // Try bucket head check
  const client = new S3Client({
    endpoint: process.env.WASABI_ENDPOINT_URL!,
    region: process.env.WASABI_REGION!,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY!,
      secretAccessKey: process.env.WASABI_SECRET_KEY!,
    },
    forcePathStyle: true,
  });

  const bucket = process.env.WASABI_BUCKET_NAME!;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e) {
    return NextResponse.json({
      configured: true,
      vars,
      bucketReachable: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Try a test write + delete
  const testKey = `_test/wasabi-connectivity-${Date.now()}.txt`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: Buffer.from('ok'),
      ContentType: 'text/plain',
    }));
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  } catch (e) {
    return NextResponse.json({
      configured: true,
      vars,
      bucketReachable: true,
      writePermission: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({
    configured: true,
    vars,
    bucketReachable: true,
    writePermission: true,
    status: 'All OK — Wasabi is working correctly',
  });
}
