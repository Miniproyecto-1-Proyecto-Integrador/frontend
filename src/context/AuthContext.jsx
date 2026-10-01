import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, me, tokens } from '../services/auth';

const AuthContext = createContext(null);

// status: 'checking' (verificando con el back) | 'authed' | 'anon'
//         | 'error' (no se pudo verificar: back caído o sin red; la sesión NO se pierde)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('checking');
  const [intento, setIntento] = useState(0);

  // Al cargar o recargar la app, se lo preguntamos al backend con GET /auth/me/
  useEffect(() => {
    if (!tokens.access()) {
      setStatus('anon');
      return;
    }
    setStatus('checking');
    me()
      .then((data) => {
        setUser(data);
        setStatus('authed');
      })
      .catch((err) => {
        if (err.status === 401) {
          // El back dijo que los tokens no sirven: ahora sí, al login.
          tokens.clear();
          setUser(null);
          setStatus('anon');
        } else {
          // Sin red, back apagado o error 5xx: no sacamos al usuario de su pantalla.
          setStatus('error');
        }
      });
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  
  useEffect(() => {function alExpirar() {
    setUser(null);
    setStatus('anon');
  }
  window.addEventListener('auth:expired', alExpirar);
  return () => window.removeEventListener('auth:expired', alExpirar);
}, []);


  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setUser(data);
    setStatus('authed');
  }, []);

  const register = useCallback(async ({ username, email, password }) => {
  await apiRegister({ username, email, password });

  try {
    const data = await apiLogin(username, password);
    setUser(data);
    setStatus('authed');
  } catch (err) {
  
    err.registroCreado = true;
    throw err;
  }
}, []);


  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, reintentar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}