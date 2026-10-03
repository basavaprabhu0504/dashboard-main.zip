import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useMetrics() {
  const [packetsData, setPacketsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPackets = useCallback(async () => {
    const data = await api.get('/packets');
    if (data) {
      setPacketsData(data);
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    const data = await api.get('/performance');
    if (data) {
      setPerformanceData(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPackets();
    fetchPerformance();

    const pInterval = setInterval(fetchPackets, 1000);
    const perfInterval = setInterval(fetchPerformance, 3000);

    return () => {
      clearInterval(pInterval);
      clearInterval(perfInterval);
    };
  }, [fetchPackets, fetchPerformance]);

  return {
    packetsData,
    performanceData,
    loading,
    refreshMetrics: () => {
      fetchPackets();
      fetchPerformance();
    },
  };
}
