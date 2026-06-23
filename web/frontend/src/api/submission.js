import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * GET /api/submission/:round_id/team/:team_id
 * Returns { submission, deadline, is_locked }
 */
export const getSubmission = (round_id, team_id) =>
  api.get(`/api/submission/${round_id}/team/${team_id}`);

/**
 * POST /api/submission/:round_id/team/:team_id
 * Body: { criteria_submissions: [...] }
 * Returns { success, submission } or 403 { error: 'DEADLINE_PASSED' }
 */
export const submitWork = (round_id, team_id, data) =>
  api.post(`/api/submission/${round_id}/team/${team_id}`, data);
