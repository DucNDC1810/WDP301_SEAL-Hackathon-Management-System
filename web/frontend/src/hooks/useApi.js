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

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const err = new Error(data.message || res.statusText || 'Lỗi server');
      err.status = res.status;
      throw err;
    }
    return data;
  };

  return { request };
};
