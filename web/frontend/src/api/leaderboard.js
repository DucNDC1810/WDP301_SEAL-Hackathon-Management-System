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

export const getLeaderboard = (round_id) =>
  api.get(`/api/leaderboard/${round_id}`);

export const getContestRounds = (contest_id) =>
  api.get(`/api/leaderboard/contests/${contest_id}/rounds`);

export const getTiebreakStatus = (round_id) =>
  api.get(`/api/leaderboard/${round_id}/tiebreak`);
