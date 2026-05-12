import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('dfs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Config ---
export const getCharacteristics = () => api.get('/characteristics');

// --- Auth ---
export const login = (username, password) => api.post('/auth/login', { username, password });
export const getMe = () => api.get('/auth/me');

// --- Bookings (public) ---
export const submitBooking = (data) => api.post('/bookings', data);

// --- Bookings (staff) ---
export const getBookings = (params) => api.get('/bookings', { params });
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const updateBookingStatus = (id, status) => api.patch(`/bookings/${id}/status`, { status });
export const addNote = (id, noteText) => api.post(`/bookings/${id}/notes`, { noteText });
export const getNotes = (id) => api.get(`/bookings/${id}/notes`);

// --- Matching & Assignment ---
export const getCandidates = (bookingId) => api.get(`/bookings/${bookingId}/candidates`);
export const assignStaff = (bookingId, staffId) => api.post(`/bookings/${bookingId}/assign`, { staffId });

// --- Assignments (public) ---
export const getAssignment = (token) => api.get(`/assignments/${token}`);
export const respondToAssignment = (token, response) => api.post(`/assignments/${token}/respond`, { response });

// --- Staff CRUD ---
export const getAllStaff = () => api.get('/staff');
export const createStaff = (data) => api.post('/staff', data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);

export default api;

