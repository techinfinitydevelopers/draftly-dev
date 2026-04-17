'use client';

import type { IntegrationId } from '@/lib/integrations/types';

const base = 'flex items-center justify-center rounded-xl shadow-md overflow-hidden';

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#635BFF" />
      <path
        d="M56.2 46.8c0-3.3 2.7-4.6 7.2-4.6 6.4 0 14.5 2 20.9 5.4V31.4c-7-2.8-14-3.9-20.9-3.9-17.1 0-28.5 8.9-28.5 23.8 0 23.2 32 19.5 32 29.5 0 3.9-3.4 5.2-8.2 5.2-7.1 0-16.1-2.9-23.3-6.8v16.4c7.9 3.4 15.9 4.9 23.3 4.9 17.5 0 29.5-8.7 29.5-23.8-.1-25.1-32.1-20.6-32.1-29.9z"
        fill="white"
      />
    </svg>
  );
}

function FirebaseLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#1A73E8" />
      <path d="M38.8 88.5L48.2 27.9c.2-1.3 2-1.6 2.6-.4l10 19.4-5.8 11.3L38.8 88.5z" fill="#FFA000" />
      <path d="M65.5 53.2l-10.5-20.3c-.5-1-.4-2.1.3-3l.1-.1c.5-.6 1.4-.6 1.9.1L81.2 88.5H38.8l26.7-35.3z" fill="#F57C00" />
      <path d="M38.8 88.5L55 58.2 44.5 38.8c-.6-1.1-2.2-.9-2.5.4L38.8 88.5z" fill="#FFCA28" />
      <path d="M60 92.7l21.2-4.2L72.5 59c-.3-1.6-2.5-1.8-3.1-.3L60 77l-9.4-18.3c-.6-1.2-2.3-1-2.6.3L44.8 88.5 60 92.7z" fill="#FFA000" />
      <path d="M81.2 88.5L72.5 59c-.3-1.6-2.5-1.8-3.1-.3L60 77l-9.4-18.3c-.6-1.2-2.3-1-2.6.3L44.8 88.5l-6 0L60 97l21.2-8.5z" fill="white" />
    </svg>
  );
}

function SupabaseLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#1C1C1C" />
      <path
        d="M63.7 97.7c-1.3 1.6-4 .6-4-.5V66h26.8c3.6 0 5.5 4.2 3.1 6.8L63.7 97.7z"
        fill="url(#sb_a)"
      />
      <path
        d="M56.3 22.3c1.3-1.6 4-.6 4 .5V54H33.5c-3.6 0-5.5-4.2-3.1-6.8L56.3 22.3z"
        fill="#3ECF8E"
      />
      <defs>
        <linearGradient id="sb_a" x1="59.7" y1="71.3" x2="83.1" y2="86.2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GoogleAnalyticsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#fff" />
      <path
        d="M83.3 92.5c0 4.9-3.9 8.9-8.7 8.9s-8.7-4-8.7-8.9V27.5c0-4.9 3.9-8.9 8.7-8.9s8.7 4 8.7 8.9v65z"
        fill="#F9AB00"
      />
      <path
        d="M57.1 92.5c0 4.9-3.9 8.9-8.7 8.9s-8.7-4-8.7-8.9V55c0-4.9 3.9-8.9 8.7-8.9s8.7 4 8.7 8.9v37.5z"
        fill="#E37400"
      />
      <circle cx="35" cy="92.5" r="8.7" fill="#E37400" />
    </svg>
  );
}

function MetaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#0668E1" />
      <path
        d="M35.5 75.4c0 3.6 1.1 6.3 2.7 7.7 1.5 1.3 3.4 1.7 5.2 1.7 3.4 0 6.3-2 9.8-7.4l5.8-8.9c4.3-6.6 8.1-10.6 14.1-10.6 4.5 0 8.2 2 10.9 5.5 2.9 3.7 4.5 8.9 4.5 15.1 0 6.6-1.6 11.1-4 14.3-2.3 3-5.8 5-10.2 5v-9.4c2.3 0 3.7-.9 4.7-2.5.9-1.5 1.6-4.1 1.6-7.4 0-3.8-.9-7-2.5-9.2-1.4-2-3.3-3-5.3-3-3.4 0-5.6 2.3-9.1 7.4l-5.6 8.1c-4.9 7.2-8.9 11.4-15.5 11.4-4.1 0-7.6-1.5-10.1-4.3C29.1 84.6 27 80 27 74c0-6.6 2.1-12.1 5.3-16 3.2-3.8 7.7-6 13-6.2v9.3c-3 .2-5.2 1.6-6.8 3.7-1.9 2.6-3 6.3-3 10.6z"
        fill="white"
      />
    </svg>
  );
}

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#181717" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M60 20C37.9 20 20 37.9 20 60c0 17.7 11.5 32.7 27.4 38 2 .4 2.7-.9 2.7-1.9 0-1-.1-3.5-.1-6.8-11.2 2.4-13.5-5.4-13.5-5.4-1.8-4.6-4.5-5.9-4.5-5.9-3.6-2.5.3-2.4.3-2.4 4 .3 6.1 4.1 6.1 4.1 3.6 6.1 9.4 4.3 11.7 3.3.4-2.6 1.4-4.3 2.5-5.3-8.9-1-18.3-4.5-18.3-19.9 0-4.4 1.6-8 4.1-10.8-.4-1-1.8-5.1.4-10.6 0 0 3.4-1.1 11 4.1 3.2-.9 6.6-1.3 10-1.4 3.4 0 6.8.5 10 1.4 7.6-5.2 11-4.1 11-4.1 2.2 5.5.8 9.6.4 10.6 2.6 2.8 4.1 6.4 4.1 10.8 0 15.5-9.4 18.9-18.4 19.9 1.4 1.2 2.7 3.7 2.7 7.4 0 5.3-.1 9.6-.1 10.9 0 1.1.7 2.3 2.7 1.9C88.5 92.7 100 77.7 100 60c0-22.1-17.9-40-40-40z"
        fill="white"
      />
    </svg>
  );
}

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#000" />
      <path d="M60 30L95 90H25L60 30Z" fill="white" />
    </svg>
  );
}

function CustomDomainLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#10B981" />
      <circle cx="60" cy="60" r="28" stroke="white" strokeWidth="4" fill="none" />
      <ellipse cx="60" cy="60" rx="14" ry="28" stroke="white" strokeWidth="3" fill="none" />
      <line x1="32" y1="60" x2="88" y2="60" stroke="white" strokeWidth="3" />
      <line x1="37" y1="46" x2="83" y2="46" stroke="white" strokeWidth="2" opacity="0.6" />
      <line x1="37" y1="74" x2="83" y2="74" stroke="white" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function ResendLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#000" />
      <path d="M36 36h20c10 0 16 6 16 14s-6 14-16 14H48v20H36V36zm12 20h8c3.3 0 5-2 5-6s-1.7-6-5-6h-8v12z" fill="white" />
      <path d="M64 84l12-20h-8l-4-14 20 14h-8l12 20H64z" fill="white" opacity="0.7" />
    </svg>
  );
}

function SendGridLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#1A82E2" />
      <rect x="30" y="30" width="20" height="20" rx="2" fill="white" opacity="0.4" />
      <rect x="50" y="30" width="20" height="20" rx="2" fill="white" opacity="0.7" />
      <rect x="70" y="30" width="20" height="20" rx="2" fill="white" />
      <rect x="30" y="50" width="20" height="20" rx="2" fill="white" opacity="0.7" />
      <rect x="50" y="50" width="20" height="20" rx="2" fill="white" />
      <rect x="30" y="70" width="20" height="20" rx="2" fill="white" />
    </svg>
  );
}

export function IntegrationBrandGlyph({ id, className = 'h-10 w-10 sm:h-11 sm:w-11' }: { id: IntegrationId; className?: string }) {
  const box = `${base} ${className}`;
  const svgClass = 'w-full h-full';
  switch (id) {
    case 'stripe':
      return <div className={box}><StripeLogo className={svgClass} /></div>;
    case 'firebase':
      return <div className={box}><FirebaseLogo className={svgClass} /></div>;
    case 'supabase':
      return <div className={box}><SupabaseLogo className={svgClass} /></div>;
    case 'google_analytics':
      return <div className={box}><GoogleAnalyticsLogo className={svgClass} /></div>;
    case 'meta_pixel':
      return <div className={box}><MetaLogo className={svgClass} /></div>;
    case 'github':
      return <div className={box}><GitHubLogo className={svgClass} /></div>;
    case 'vercel':
      return <div className={box}><VercelLogo className={svgClass} /></div>;
    case 'custom_domain':
      return <div className={box}><CustomDomainLogo className={svgClass} /></div>;
    case 'resend':
      return <div className={box}><ResendLogo className={svgClass} /></div>;
    case 'sendgrid':
      return <div className={box}><SendGridLogo className={svgClass} /></div>;
    default:
      return (
        <div className={`${box} bg-white/10 text-white/60`} aria-hidden>
          ?
        </div>
      );
  }
}
