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
export const getLocations = () => api.get('/locations');

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
export const autoAssignBooking = (bookingId) => api.post(`/bookings/${bookingId}/auto-assign`);
export const bulkAutoAssign = () => api.post('/bookings/bulk-auto-assign');
export const sendAllAssignments = () => api.post('/bookings/send-all-assignments');

// --- Assignments (public) ---
export const getAssignment = (token) => api.get(`/assignments/${token}`);
export const respondToAssignment = (token, response) => api.post(`/assignments/${token}/respond`, { response });

// --- Staff CRUD ---
export const getAllStaff = () => api.get('/staff');
export const createStaff = (data) => api.post('/staff', data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);

// --- Phone AI ---
export const getPhoneSettings = () => api.get('/phone/settings');
export const getPublicPhoneInfo = () => api.get('/phone/public');
export const updatePhoneSettings = (data) => api.put('/phone/settings', data);
export const getPhoneCalls = () => api.get('/phone/calls');
export const phoneIntake = (transcript, callerNumber) => api.post('/phone/intake', { transcript, callerNumber });
export const approveReview = (id) => api.post(`/bookings/${id}/approve-review`);
export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);

export default api;

