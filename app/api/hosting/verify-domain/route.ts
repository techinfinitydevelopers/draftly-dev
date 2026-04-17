/**
 * GET /api/hosting/verify-domain?domain=myportfolio.com
 *
 * Checks whether a domain's CNAME correctly points to customers.prodevelopers.in.
 * Does NOT write to Firestore — use /connect-domain for that.
 */

import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CNAME_TARGET = 'customers.prodevelopers.in';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase().replace(/^www\./, '');

  if (!domain) {
    return NextResponse.json({ error: 'domain query param required' }, { status: 400 });
  }

  try {
    const addresses = await dns.resolveCname(domain);
    const found = addresses[0]?.replace(/\.$/, '').toLowerCase() ?? null;
    const verified = found === CNAME_TARGET.toLowerCase();

    return NextResponse.json({
      domain,
      verified,
      found,
      cnameTarget: CNAME_TARGET,
    });
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    return NextResponse.json({
      domain,
      verified: false,
      found: null,
      cnameTarget: CNAME_TARGET,
      detail:
        code === 'ENODATA' || code === 'ENOTFOUND'
          ? 'No CNAME record found'
          : 'DNS lookup failed',
    });
  }
}
