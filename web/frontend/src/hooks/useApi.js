import { useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const doFetch = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.message || res.statusText || 'Lỗi server');
    err.status = res.status;
    throw err;
  }
  return data;
};

const tryRefresh = async () => {
  const res = await fetch(`${API}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.data?.accessToken) {
    throw new Error('Refresh failed');
  }
  localStorage.setItem('accessToken', data.data.accessToken);
};

export const useApi = () => {
  // useCallback với empty deps để reference ổn định qua các render
  // Không có dependency vì hàm chỉ đọc localStorage trực tiếp tại thời điểm gọi
  const request = useCallback(async (path, options = {}) => {
    try {
      return await doFetch(path, options);
    } catch (err) {
      if (err.status === 401) {
        try {
          await tryRefresh();
          return await doFetch(path, options);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
      }
      throw err;
    }
  }, []);

  return { request };
};
