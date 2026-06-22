import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

export const getRankingContests = () =>
  api.get('/api/ranking/contests');

export const getTeamRanking = (round_id) =>
  api.get(`/api/ranking/${round_id}/teams`);

export const getChapterRanking = (round_id) =>
  api.get(`/api/ranking/${round_id}/chapters`);
