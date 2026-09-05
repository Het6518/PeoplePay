import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// Handle successful response unwrapping
api.interceptors.response.use((response) => {
  if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
    const orig = response.data;
    response.data = orig.data;
    const pagination = orig.pagination || {
      page: Number(orig.page || 1),
      limit: Number(orig.limit || 10),
      total: Number(orig.total || (Array.isArray(orig.data) ? orig.data.length : 0)),
      totalPages: Number(orig.totalPages || (orig.total && orig.limit ? Math.ceil(orig.total / orig.limit) : 1)),
    };
    response.pagination = pagination;
    response.totalPages = pagination.totalPages;
    response.total = pagination.total;
    response.page = pagination.page;
    response.limit = pagination.limit;
  }
  return response;
});
// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
