/**
 * Owner/admin emails — unlimited credits and no limits.
 * Used for internal accounts and support.
 */

const OWNER_EMAILS = new Set([
  'piyush.glitch@draftly.business',
  'piyushsinghok4355@gmail.com',
  'piyushsingh123443@gmail.com',
  'piyushok4350@gmail.com', // PiyushOK4350 variant
  'kunal.techinfinity@gmail.com',
].map((e) => e.trim().toLowerCase()));

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return OWNER_EMAILS.has(email.trim().toLowerCase());
}
