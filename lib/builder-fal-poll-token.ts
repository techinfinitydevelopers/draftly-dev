import crypto from 'crypto';

function getSecret(): string {
  const s =
    process.env.BUILDER_FAL_POLL_SECRET ||
    process.env.FAL_SELL_API_KEY ||
    process.env.FAL_KEY ||
    process.env.fal_key;
  if (!s) {
    throw new Error(
      'BUILDER_FAL_POLL_SECRET, FAL_KEY, fal_key, or FAL_SELL_API_KEY must be set for LTX async polling.',
    );
  }
  return s;
}

/** Signed token binding a Firebase user to a fal queue request + billed credit amount (short-lived). */
export function signFalPollToken(userId: string, requestId: string, creditCost: number): string {
  const payload = {
    uid: userId,
    rid: requestId,
    credits: Math.max(0, Math.floor(creditCost)),
    exp: Date.now() + 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyFalPollToken(token: string): { userId: string; requestId: string; creditCost: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      uid?: string;
      rid?: string;
      credits?: number;
      exp?: number;
    };
    if (!payload.uid || !payload.rid || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    const creditCost = typeof payload.credits === 'number' ? payload.credits : 0;
    return { userId: payload.uid, requestId: payload.rid, creditCost };
  } catch {
    return null;
  }
}
