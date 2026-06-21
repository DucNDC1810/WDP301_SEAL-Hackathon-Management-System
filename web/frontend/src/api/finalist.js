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

export const getFinalists = (round_id) =>
  api.get(`/api/finalist/${round_id}`);

export const updateTeamStatus = (round_id, team_id, status) =>
  api.patch(`/api/finalist/${round_id}/team/${team_id}`, { status });

export const getAuditLog = (round_id) =>
  api.get(`/api/finalist/${round_id}/audit-log`);
