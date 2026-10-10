const STORAGE_KEY = 'qvpn.experimentHistory.v1';
const MAX_RESULTS = 50;

export function getExperimentHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExperimentHistoryItem(item) {
  const history = getExperimentHistory();
  const stored = {
    id: `${Date.now()}-${item.experiment?.id || 'experiment'}`,
    experimentId: item.experiment?.id || null,
    title: item.experiment?.title || 'QVPN experiment',
    category: item.experiment?.category || null,
    outcome: item.outcome || 'unknown',
    success: item.success === true,
    completedAt: new Date().toISOString(),
    data: item.data || null,
    error: item.error || null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([stored, ...history].slice(0, MAX_RESULTS)));
  window.dispatchEvent(new Event('qvpn-history-updated'));
  return stored;
}

export function clearExperimentHistory() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('qvpn-history-updated'));
}
