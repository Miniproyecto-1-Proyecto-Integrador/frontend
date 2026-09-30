import { API_URL } from './api';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export const tokens = {
  access: () => localStorage.getItem(ACCESS),
  refresh: () => localStorage.getItem(REFRESH),
  save: ({ access, refresh }) => {
    if (access) localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.detail || 'No pudimos completar la operación. Intenta de nuevo.');
    err.status = res.status;
    err.fieldErrors = data && !data.detail ? data : {};
    throw err;
  }
  return data;
}

export async function login(username, password) {
  const data = await post('/auth/login/', { username, password });
  tokens.save(data);
  return data.user;
}


export async function register({ username, email, password }) {
  return post('/auth/register/', { username, email, password });
}

export async function refreshTokens() {
  const data = await post('/auth/refresh/', { refresh: tokens.refresh() });
  tokens.save(data); // guarda los DOS: el refresh también rota
  return data.access;
}

// Avisa a toda la app que la sesión ya no sirve.
function sesionExpirada() {
  tokens.clear();
  window.dispatchEvent(new Event('auth:expired'));
}

// Si varias peticiones reciben 401 a la vez, se hace UN solo refresh
// (el refresh rota: usar el token viejo por segunda vez fallaría).
let refrescando = null;
function renovar() {
  if (!refrescando) {
    refrescando = refreshTokens().finally(() => {
      refrescando = null;
    });
  }
  return refrescando;
}

// fetch con Authorization. Si hay 401, renueva el token y reintenta una vez.
export async function authFetch(url, options = {}) {
  const enviar = () => {
    const access = tokens.access();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });
  };

  const res = await enviar();
  if (res.status !== 401) return res;

  if (!tokens.refresh()) {
    if (tokens.access()) sesionExpirada();
    return res;
  }

  try {
    await renovar();
  } catch (err) {
    // Solo 401/400 significan "el refresh ya no sirve". Un fallo de red no cierra sesión.
    if (err.status === 401 || err.status === 400) sesionExpirada();
    return res;
  }

  const reintento = await enviar();
  if (reintento.status === 401) sesionExpirada();
  return reintento;
}

export async function me() {
  const res = await authFetch(`${API_URL}/auth/me/`);
  if (!res.ok) {
    const err = new Error('Sesión no válida');
    err.status = res.status;
    throw err;
  }
  return res.json();
}