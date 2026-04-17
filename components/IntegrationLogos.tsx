/**
 * Colored brand logos for integrations (GitHub, Supabase, Firebase, Vercel).
 * Uses official brand colors for visibility on dark backgrounds.
 */

const sizes = { sm: 16, md: 18, lg: 24 } as const;

export function GitHubLogo({ size = 'md', className = '' }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#c9d1d9" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function SupabaseLogo({ size = 'md', className = '' }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" fill="#3ECF8E" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" fill="#3ECF8E" opacity="0.8" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" fill="#3ECF8E" opacity="0.5" />
    </svg>
  );
}

export function FirebaseLogo({ size = 'md', className = '' }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className}>
      <path d="M3.89 15.673L6.255 2.02a.453.453 0 01.847-.145l2.12 3.257 4.22-4.649a.453.453 0 01.678 0l.676.678-7.32 14.513z" fill="#FFCA28" />
      <path d="M12 21.354l-1.017-1.017-5.093-4.664 7.32-14.513.677-.678a.453.453 0 01.678 0l.677.678 7.32 14.513-5.093 4.664L12 21.354z" fill="#FFA000" />
    </svg>
  );
}

export function VercelLogo({ size = 'md', className = '' }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#ffffff" className={className}>
      <path d="M12 0L2 12l10 12 10-12L12 0z" />
    </svg>
  );
}

export const IntegrationIcons = {
  github: GitHubLogo,
  supabase: SupabaseLogo,
  firebase: FirebaseLogo,
  vercel: VercelLogo,
};
