import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('dfs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Public ---
export const submitReferral = (data) => api.post('/referrals', data);

// --- Auth ---
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const getMe = () => api.get('/auth/me');

// --- Staff (protected) ---
export const getReferrals = (params) => api.get('/referrals', { params });

export const getReferralById = (id) => api.get(`/referrals/${id}`);

export const updateReferralStatus = (id, status) =>
  api.patch(`/referrals/${id}/status`, { status });

export const addNote = (id, noteText) =>
  api.post(`/referrals/${id}/notes`, { noteText });

export const getNotes = (id) => api.get(`/referrals/${id}/notes`);

export default api;
