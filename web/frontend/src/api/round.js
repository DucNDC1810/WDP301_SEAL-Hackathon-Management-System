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

export const finishRound = (round_id) =>
  api.patch(`/api/round/${round_id}/finish`);

// ── Criteria CRUD ────────────────────────────────────────────────────────────
export const createCriteria = (round_id, data) =>
  api.post(`/api/round/${round_id}/criteria`, data);

export const updateCriteria = (round_id, criteria_id, data) =>
  api.patch(`/api/round/${round_id}/criteria/${criteria_id}`, data);

export const deleteCriteria = (round_id, criteria_id) =>
  api.delete(`/api/round/${round_id}/criteria/${criteria_id}`);

export const getPools = (contest_id, round_id) =>
  api.get(`/api/pools/contests/${contest_id}/pools?round_id=${round_id}`);

export const updatePool = (pool_id, data) =>
  api.put(`/api/pools/${pool_id}`, data);

export const updateRound = (round_id, data) =>
  api.patch(`/api/round/${round_id}`, data);
