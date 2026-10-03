import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useLogs() {
  const [logs, setLogs] = useState({ vpn: [], system: [], raw: '' });
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const data = await api.get('/logs');
    if (data) {
      setLogs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    refreshLogs: fetchLogs,
  };
}
