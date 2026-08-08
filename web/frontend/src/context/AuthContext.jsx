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

// Dùng refresh token (cookie httpOnly, sống 7 ngày) để lấy access token mới
// khi access token (sống 15 phút) hết hạn. Trả về token mới hoặc null nếu
// refresh token cũng đã hết hạn/bị thu hồi.
const tryRefreshToken = async () => {
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data?.data?.accessToken;
    if (!newToken) return null;
    localStorage.setItem('accessToken', newToken);
    return newToken;
  } catch {
    return null;
  }
};

const ROLE_POLL_INTERVAL = 30000;

const rolesKey = (roles) =>
  (roles || []).map((r) => r.role_name).sort().join(',');

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  // Start loading only when there is a valid token that needs verifying
  const [loading, setLoading] = useState(hasValidToken);

  // On mount: if token exists & valid, fetch fresh user from API.
  // If it's expired, try refreshing via the httpOnly refresh-token cookie
  // before giving up — the access token is short-lived (15m) by design and
  // is expected to expire well before the refresh token (7d).
  useEffect(() => {
    const init = async () => {
      let token = localStorage.getItem('accessToken');
      if (token && !isTokenValid(token)) {
        token = await tryRefreshToken();
      }
      if (!token) {
        localStorage.removeItem('accessToken');
        setLoading(false);
        return;
      }
      try {
        setUser(await fetchMe(token));
      } catch {
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    init();
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

  // Poll for role changes made server-side (e.g. admin edits a role in the DB).
  // If the current user's roles no longer match what we hold, force logout.
  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(async () => {
      let token = localStorage.getItem('accessToken');
      if (!token) {
        logout();
        return;
      }
      // Access token hết hạn (15 phút) là chuyện bình thường, không phải lý do
      // để đăng xuất — thử làm mới bằng refresh token (7 ngày) trước đã.
      if (!isTokenValid(token)) {
        token = await tryRefreshToken();
        if (!token) {
          logout();
          return;
        }
      }
      try {
        const fresh = await fetchMe(token);
        if (rolesKey(fresh.roles) !== rolesKey(user.roles)) {
          logout();
        }
      } catch {
        logout();
      }
    }, ROLE_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [user, logout]);

  const isAdmin = user?.roles?.some((r) => r.role_name === 'admin') ?? false;

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
