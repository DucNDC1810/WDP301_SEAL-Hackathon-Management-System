import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const isTokenValid = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const getStoredUser = () => {
  try {
    const token = localStorage.getItem('accessToken');
    const stored = localStorage.getItem('user');
    if (!token || !stored) return null;
    if (!isTokenValid(token)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      return null;
    }
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const login = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.accessToken) {
      localStorage.setItem('accessToken', userData.accessToken);
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const isAdmin = user?.roles?.some((r) => r.role_name === 'admin') ?? false;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
