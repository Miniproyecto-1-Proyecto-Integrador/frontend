import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, me, tokens } from '../services/auth';

const AuthContext = createContext(null);

// status: 'checking' (verificando con el back) | 'authed' | 'anon'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('checking');

  // Al cargar o recargar la app, se lo preguntamos al backend con GET /auth/me/
  useEffect(() => {
    if (!tokens.access()) {
      setStatus('anon');
      return;
    }
    me()
      .then((data) => {
        setUser(data);
        setStatus('authed');
      })
      .catch((err) => {
        // Solo borramos los tokens si el back dijo que no sirven (401).
        if (err.status === 401) tokens.clear();
        setUser(null);
        setStatus('anon');
      });
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setUser(data);
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}