import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/** GET /api/round/:round_id/judges — judges đã assign */
export const getAssignedJudges = (round_id) =>
  api.get(`/api/round/${round_id}/judges`);

/** GET /api/round/:round_id/available-judges — khả dụng (loại Sơ loại) */
export const getAvailableJudges = (round_id) =>
  api.get(`/api/round/${round_id}/available-judges`);

/** POST /api/round/:round_id/judges — assign danh sách judge */
export const assignJudges = (round_id, judge_ids) =>
  api.post(`/api/round/${round_id}/judges`, { judge_ids });

/** DELETE /api/round/:round_id/judges/:judge_id — xóa phân công */
export const removeJudge = (round_id, judge_id) =>
  api.delete(`/api/round/${round_id}/judges/${judge_id}`);
