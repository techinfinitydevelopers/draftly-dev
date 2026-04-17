import { NextResponse } from 'next/server';

/**
 * Stub deploy queue. Production: authenticate user, check plan entitlements,
 * enqueue job to hosting worker, persist Deployment record in Firestore.
 */
export async function POST(req: Request) {
  try {
    await req.json().catch(() => ({}));
  } catch {
    /* ignore */
  }
  return NextResponse.json({
    ok: true,
    deploymentId: `dep_mock_${Date.now().toString(36)}`,
    message: 'Deploy queued (mock). Connect a real worker + DNS pipeline to go live.',
  });
}
