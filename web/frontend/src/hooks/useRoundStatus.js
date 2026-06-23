import { useState, useEffect } from 'react';
import { getRoundSetup } from '../api/round';

export function useRoundStatus(round_id) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!round_id) return;
    let cancelled = false;

    async function fetch() {
      try {
        const res = await getRoundSetup(round_id);
        if (!cancelled) {
          setStatus(res.data?.round?.status ?? null);
        }
      } catch {
        // silently ignore — pages handle their own error state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [round_id]);

  return {
    status,
    loading,
    isFinished: status === 'FINISHED',
    isFrozen: status === 'FINISHED',
  };
}
