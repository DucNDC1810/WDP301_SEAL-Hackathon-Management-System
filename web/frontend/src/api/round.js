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

export const getRoundSetup = (round_id) =>
  api.get(`/api/round/${round_id}/setup`);

export const assignJudges = (round_id, judge_ids) =>
  api.post(`/api/round/${round_id}/judges`, { judge_ids });

export const activateRound = (round_id) =>
  api.patch(`/api/round/${round_id}/activate`);
