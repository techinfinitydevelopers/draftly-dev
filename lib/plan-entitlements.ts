/** Plans that may download project ZIPs (3D builder, full-app export). Premium tier and internal QA. */
const ZIP_EXPORT_PLANS: ReadonlySet<string> = new Set([
  'premium',
  'agency', // legacy subscribers (product no longer sold)
  'tester', // internal QA
]);

export function planCanExportZip(
  plan: string | undefined,
  opts: { isOwner?: boolean },
): boolean {
  if (opts.isOwner) return true;
  const p = String(plan || 'free').toLowerCase().trim();
  return ZIP_EXPORT_PLANS.has(p);
}
