const TOKEN_KEY = 'sweety_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let unauthorizedHandler = () => {};
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function request(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // An expired token (not a failed login) sends the user back to the login page.
    if (response.status === 401 && token) unauthorizedHandler();
    throw new ApiError(response.status, data.message || 'Something went wrong. Please try again.', data.errors);
  }
  return data;
}

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.set(key, value);
  });
  return query.toString();
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  getCurrentUser: () => request('/auth/me'),

  listReadings: (params = {}) => request(`/readings?${toQuery(params)}`),
  createReading: (body) => request('/readings', { method: 'POST', body }),
  updateReading: (id, body) => request(`/readings/${id}`, { method: 'PUT', body }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),

  getDailyReport: (date) => request(`/reports/daily?${toQuery({ date })}`),
  getMonthToDateReport: (date) => request(`/reports/month-to-date?${toQuery({ date })}`),
  getMonthlyReport: (date) => request(`/reports/monthly?${toQuery({ date })}`),
  getChartData: (month) => request(`/reports/chart?${toQuery({ month })}`),
};
