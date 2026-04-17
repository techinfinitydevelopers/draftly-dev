/** Central place for legal copy — update dates here when documents change. */
export const LEGAL_LAST_UPDATED = 'April 5, 2026';
export const LEGAL_ENTITY = 'Draftly';
export const PRIVACY_CONTACT_EMAIL = 'piyush.glitch@draftly.business';

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://draftly.space';
}
