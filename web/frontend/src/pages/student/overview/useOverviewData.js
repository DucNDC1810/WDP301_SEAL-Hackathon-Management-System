import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../../../hooks/useApi';

// Only poll while a round is running; every other state is effectively static.
const POLL_INTERVAL_MS = 90_000;

export const useOverviewData = () => {
  const { request } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await request('/api/overview/me');
        if (!mountedRef.current) return;
        setData(res);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh only matters while the team is competing against a deadline.
  useEffect(() => {
    if (data?.state !== 'competing') return undefined;
    const id = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data?.state, load]);

  const reload = useCallback(() => load({ silent: false }), [load]);

  return { data, loading, error, reload };
};
