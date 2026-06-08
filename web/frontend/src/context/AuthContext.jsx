import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || '';

const isTokenValid = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const fetchMe = async (token) => {
  const res = await fetch(`${API}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Unauthorized');
  const data = await res.json();
  return data?.data || data;
};

const hasValidToken = () => {
  const token = localStorage.getItem('accessToken');
  return !!(token && isTokenValid(token));
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  // Start loading only when there is a valid token that needs verifying
  const [loading, setLoading] = useState(hasValidToken);

  // On mount: if token exists & valid, fetch fresh user from API
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !isTokenValid(token)) {
      localStorage.removeItem('accessToken');
      return;
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => setLoading(false));
  }, []);

  // Called after login / register / OAuth — save token then fetch fresh profile
  const login = useCallback(async (userData) => {
    if (userData.accessToken) {
      localStorage.setItem('accessToken', userData.accessToken);
    }
    const token = userData.accessToken || localStorage.getItem('accessToken');
    if (token) {
      try {
        const fresh = await fetchMe(token);
        setUser(fresh);
        return;
      } catch {
        // fall through to use provided data
      }
    }
    const { accessToken: _, ...userOnly } = userData; // eslint-disable-line no-unused-vars
    setUser(userOnly);
  }, []);

  // Re-fetch user from API (use after profile updates)
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const fresh = await fetchMe(token);
      setUser(fresh);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  const isAdmin = user?.roles?.some((r) => r.role_name === 'admin') ?? false;

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
