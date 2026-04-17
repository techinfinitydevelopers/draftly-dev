'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'draftly_activity_sid_v1';

/**
 * Registers one session per browser tab (sessionStorage) for developer analytics.
 * Server dedupes by id so refresh in same tab does not inflate counts.
 */
export default function UserActivityPing() {
  const { user } = useAuth();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!user || sentRef.current) return;
    sentRef.current = true;

    let sid = '';
    try {
      sid = sessionStorage.getItem(STORAGE_KEY) || '';
      if (!sid) {
        sid =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        sessionStorage.setItem(STORAGE_KEY, sid);
      }
    } catch {
      return;
    }

    user
      .getIdToken()
      .then((token) =>
        fetch('/api/user/activity-ping', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientSessionId: sid }),
        }),
      )
      .catch(() => {});
  }, [user]);

  return null;
}
