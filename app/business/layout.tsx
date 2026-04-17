import type { Metadata } from 'next';
import BusinessShell from '@/components/business-os/BusinessShell';

export const metadata: Metadata = {
  title: 'Business Suite',
  description:
    'Run your Draftly site in one place — connect tools, deploy, see traffic and revenue.',
  robots: { index: false, follow: false },
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessShell>{children}</BusinessShell>;
}
