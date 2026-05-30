import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => tokenStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      tokenStorage.setTokens(res.data.access_token, res.data.refresh_token);
      const userRes = await authAPI.me();
      setUser(userRes.data);
      return userRes.data;
    } catch (err) {
      console.error('Login error:', err.response?.status, err.response?.data);
      throw err;
    }
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch (_) {
        // Ignore errors — clear local state regardless
      }
    }
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
