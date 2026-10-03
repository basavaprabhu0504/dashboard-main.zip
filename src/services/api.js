const DEFAULT_BASE_URL = import.meta.env.VITE_CLIENT_AGENT_URL || '/agent';
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_DASHBOARD_REQUEST_TIMEOUT_MS) || 15000;

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  async get(path, { baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
    const fullUrl = path.startsWith('http://') || path.startsWith('https://') 
      ? path 
      : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    try {
      const response = await fetchWithTimeout(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
      }, timeout);

      const data = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      const isTimeout = error.name === 'AbortError';
      const errorMsg = isTimeout 
        ? `Request timed out after ${timeout}ms` 
        : (error.message || 'Network error');
      console.warn(`GET ${path} failed:`, errorMsg);
      return { ok: false, status: 0, error: errorMsg, isTimeout };
    }
  },

  async post(path, payload = {}, { baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
    const fullUrl = path.startsWith('http://') || path.startsWith('https://') 
      ? path 
      : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    try {
      const response = await fetchWithTimeout(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      }, timeout);

      const data = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      const isTimeout = error.name === 'AbortError';
      const errorMsg = isTimeout 
        ? `Request timed out after ${timeout}ms` 
        : (error.message || 'Network error');
      console.warn(`POST ${path} failed:`, errorMsg);
      return { ok: false, status: 0, error: errorMsg, isTimeout };
    }
  },
};

export default api;
