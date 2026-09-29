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
    throw err;
  }
  return data;
}

export async function login(username, password) {
  const data = await post('/auth/login/', { username, password });
  tokens.save(data);
  return data.user;
}

export async function refreshTokens() {
  const data = await post('/auth/refresh/', { refresh: tokens.refresh() });
  tokens.save(data); // guarda los DOS: el refresh también rota
  return data.access;
}

export async function me() {
  const res = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${tokens.access()}` },
  });
  if (!res.ok) {
    const err = new Error('Sesión no válida');
    err.status = res.status;
    throw err;
  }
  return res.json();
}