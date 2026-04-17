export type BusinessNavId =
  | 'overview'
  | 'website'
  | 'hosting'
  | 'analytics'
  | 'payments'
  | 'database'
  | 'devops'
  | 'integrations'
  | 'settings';

export interface BusinessNavItem {
  id: BusinessNavId;
  href: string;
  label: string;
  description: string;
  icon: string;
  /** Requires Business OS (Pro+); otherwise show upgrade gate */
  requiresBusinessOs: boolean;
}

export const BUSINESS_NAV: BusinessNavItem[] = [
  {
    id: 'overview',
    href: '/business',
    label: 'Overview',
    description: 'CEO snapshot — revenue, traffic, status',
    icon: 'fa-chart-pie',
    requiresBusinessOs: false,
  },
  {
    id: 'website',
    href: '/business/website',
    label: 'Website',
    description: '3D builder & preview',
    icon: 'fa-cube',
    requiresBusinessOs: false,
  },
  {
    id: 'integrations',
    href: '/business/integrations',
    label: 'Integrations',
    description: 'Stripe, Firebase, analytics',
    icon: 'fa-plug',
    requiresBusinessOs: true,
  },
  {
    id: 'hosting',
    href: '/business/hosting',
    label: 'Hosting',
    description: 'Deploy, domain, SSL',
    icon: 'fa-cloud-arrow-up',
    requiresBusinessOs: true,
  },
  {
    id: 'analytics',
    href: '/business/analytics',
    label: 'Analytics',
    description: 'Traffic & conversions',
    icon: 'fa-chart-line',
    requiresBusinessOs: true,
  },
  {
    id: 'payments',
    href: '/business/payments',
    label: 'Payments',
    description: 'Stripe & revenue',
    icon: 'fa-credit-card',
    requiresBusinessOs: true,
  },
  {
    id: 'database',
    href: '/business/database',
    label: 'Database',
    description: 'Leads & orders',
    icon: 'fa-database',
    requiresBusinessOs: true,
  },
  {
    id: 'devops',
    href: '/business/devops',
    label: 'DevOps',
    description: 'GitHub repos & CI/CD',
    icon: 'fa-code-branch',
    requiresBusinessOs: true,
  },
  {
    id: 'settings',
    href: '/business/settings',
    label: 'Settings',
    description: 'Project, team, billing',
    icon: 'fa-gear',
    requiresBusinessOs: false,
  },
];
