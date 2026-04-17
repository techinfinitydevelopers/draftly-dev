import { NextRequest, NextResponse } from 'next/server';
import { exchangeGitHubCode } from '@/lib/github-integration';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth, authErrorResponse } from '@/lib/verify-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/github/callback
 * Exchange OAuth code for token and store in user doc.
 * Requires Authorization header with Firebase ID token to verify the user matches state.
 */
export async function POST(req: NextRequest) {
  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      return NextResponse.json({ error: 'code and state required' }, { status: 400 });
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId = decoded.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    let auth;
    try {
      auth = await verifyAuth(req);
    } catch (err) {
      return authErrorResponse(err);
    }
    if (auth.uid !== userId) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'GitHub OAuth not configured' },
        { status: 500 }
      );
    }

    const accessToken = await exchangeGitHubCode(clientId, clientSecret, code);

    // Fetch GitHub username
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUser = await userRes.json();
    const githubUsername = githubUser?.login || '';

    const db = getAdminDb();
    await db.collection('users').doc(userId).set(
      {
        githubAccessToken: accessToken,
        githubUsername,
        githubConnectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'GitHub connected successfully',
      username: githubUsername,
    });
  } catch (error: any) {
    console.error('GitHub callback error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to connect GitHub' },
      { status: 500 }
    );
  }
}
