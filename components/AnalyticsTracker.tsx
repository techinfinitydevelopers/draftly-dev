'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { logAnalyticsEvent } from '@/lib/firebase';
import { devLog } from '@/lib/client-log';

function AnalyticsTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page views on route change
    if (pathname) {
      logAnalyticsEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: pathname,
      });
      devLog('Analytics: page_view', pathname);
    }
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerContent />
    </Suspense>
  );
}
