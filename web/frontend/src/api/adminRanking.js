import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

export const adminGetContests        = ()                          => api.get('/api/admin/ranking/contests');
export const adminToggleIndividual   = (contestId)                 => api.patch(`/api/admin/ranking/contests/${contestId}/individual-toggle`);
export const adminGetIndividuals     = (contestId)                 => api.get(`/api/admin/ranking/contests/${contestId}/individuals`);
export const adminUpsertIndividual   = (contestId, userId, body)   => api.put(`/api/admin/ranking/contests/${contestId}/individuals/${userId}`, body);
export const adminGetChapters        = ()                          => api.get('/api/admin/ranking/chapters');
export const adminUpdateChapter      = (chapterId, body)           => api.put(`/api/admin/ranking/chapters/${chapterId}`, body);
export const adminCreateChapter      = (body)                      => api.post('/api/admin/ranking/chapters', body);
