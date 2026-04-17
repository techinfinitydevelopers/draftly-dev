'use client';

import { usePathname } from 'next/navigation';
import GuideChatWidget from './GuideChatWidget';

/**
 * Renders the guide chat on all routes except /3d-builder (that page mounts its own widget with preview hide).
 */
export function GuideChatWidgetHost() {
  const pathname = usePathname();
  if (pathname?.startsWith('/3d-builder')) return null;
  return <GuideChatWidget variant="site" position="right" />;
}
