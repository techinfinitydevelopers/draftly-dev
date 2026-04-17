import { NextRequest, NextResponse } from 'next/server';
import { getGitHubOAuthURL } from '@/lib/github-integration';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/github/oauth?userId=xxx
 * Returns the GitHub OAuth URL for the user to redirect to.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const redirectUri = `${baseUrl}/integrations`;
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
    const url = getGitHubOAuthURL(clientId, redirectUri, state);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('GitHub OAuth URL error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to get OAuth URL' }, { status: 500 });
  }
}
