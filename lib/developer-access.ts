/**
 * Developer dashboard (`/internal/developer`) and `/api/internal/developer-snapshot`.
 * Strict allowlist — only these emails can load aggregate user/project data.
 */
export const DEVELOPER_DASHBOARD_ALLOWED_EMAILS = ['piyushsinghok4355@gmail.com'] as const;

export function isDeveloperDashboardOperator(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  return (DEVELOPER_DASHBOARD_ALLOWED_EMAILS as readonly string[]).includes(e);
}
