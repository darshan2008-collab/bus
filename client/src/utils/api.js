const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bus_auth_token');
  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    if (res.status === 401) {
      // Session expired
      localStorage.removeItem('bus_auth_token');
      localStorage.removeItem('bus_auth_user');
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('Session expired. Please log in again.');
    }

    // Check if binary download (e.g. excel)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('spreadsheetml')) {
      return res.blob();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server error occurred.');
    }
    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}
