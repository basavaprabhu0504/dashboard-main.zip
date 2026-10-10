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
