const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const useApi = () => {
  const getHeaders = (extra = {}) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    ...extra,
  });

  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: getHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi server');
    return data;
  };

  return { request };
};
