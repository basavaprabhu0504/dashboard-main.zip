const STORAGE_KEY = 'qvpn.experimentHistory.v1';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieve saved experiment runs from localStorage
 * Returns Array of experiment history objects, newest first
 */
export function getExperimentHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a newly executed experiment record
 */
export function saveExperimentHistoryItem(item) {
  const current = getExperimentHistory();
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.experiment?.title || 'Security Experiment',
    category: item.experiment?.category || 'general',
    outcome: item.outcome,
    success: item.success,
    completedAt: item.completedAt || new Date().toLocaleTimeString(),
    data: item.data || null,
    error: item.error || null,
  };

  const next = [record, ...current].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('qvpn-history-updated'));
  } catch (err) {
    console.warn('Failed to save experiment history item to localStorage:', err);
  }
  return record;
}
