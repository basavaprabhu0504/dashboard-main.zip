import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const response = await api.get('/results');
    if (response.ok && Array.isArray(response.data?.results)) {
      setResults(response.data.results);
    } else {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const saveResult = async (resultData) => {
    const res = await api.post('/results', resultData);
    if (res.ok) {
      await fetchResults();
    }
    return res;
  };

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    results,
    loading,
    refreshResults: fetchResults,
    saveResult,
  };
}
