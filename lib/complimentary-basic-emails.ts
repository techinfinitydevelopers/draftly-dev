/**
 * Emails that receive complimentary Basic ($25/mo) subscription in Firestore when the account
 * would otherwise be `free` or `testing` (active). useSubscription re-applies on each load until
 * the user doc shows plan `basic`.
 */
const COMPLIMENTARY_BASIC_EMAILS = new Set(
  ['mbarakat@narrativecollective.studio', 'dirossiwebdesign@gmail.com'].map((e) =>
    e.trim().toLowerCase(),
  ),
);

export function isComplimentaryBasicEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return COMPLIMENTARY_BASIC_EMAILS.has(email.trim().toLowerCase());
}
