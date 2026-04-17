'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { IntegrationId } from '@/lib/integrations/types';

export function useIntegrationData<T = Record<string, unknown>>(integrationId: IntegrationId) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/business/integration-data?integrationId=${integrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.connected === false || !res.ok) {
        setConnected(false);
        setError(j.error || 'Not connected');
        setData(null);
      } else {
        setConnected(true);
        setData(j.data as T);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user, integrationId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, connected, refresh };
}
