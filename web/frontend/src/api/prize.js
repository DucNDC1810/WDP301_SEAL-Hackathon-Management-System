import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

export const getPrizes       = (contest_id)       => api.get(`/api/prize/${contest_id}`);
export const submitPrizeClaim = (prize_id, data)  => api.post(`/api/prize/${prize_id}/claim`, data);
export const getPrizeClaim   = (prize_id, team_id) => api.get(`/api/prize/${prize_id}/claim/${team_id}`);
