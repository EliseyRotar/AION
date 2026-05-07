import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 🔧 FIX: Gestione errore migliorata
  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      
      const userRes = await authAPI.me();
      setUser(userRes.data);
      return userRes.data;
    } catch (err) {
      // 🔧 Rilancia l'errore per farlo gestire dal componente Login
      console.error('Login error:', err.response?.status, err.response?.data);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);