import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getNotifications = () =>
  api.get('/api/notifications');

export const markAllAsRead = () =>
  api.patch('/api/notifications/read-all');

export const markAsRead = (id) =>
  api.patch(`/api/notifications/${id}/read`);

export const deleteNotification = (id) =>
  api.delete(`/api/notifications/${id}`);

export const broadcastNotification = (data) =>
  api.post('/api/notifications/broadcast', data);
