
export const AUTH_STORAGE_KEY = 'synapescrow_auth';

const decodeJwtPayload = (token) => {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode JWT payload', error);
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  if (typeof window === 'undefined') return false;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
};

const normalizeUser = (user) => {
  if (!user) return null;

  const parsed = typeof user === 'string' ? JSON.parse(user) : user;

  if (parsed._id && !parsed.id) {
    parsed.id = parsed._id;
  }

  return parsed;
};

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const userValue = localStorage.getItem('user');

  if (token && userValue) {
    try {
      if (isTokenExpired(token)) {
        clearAuth();
        return null;
      }

      const user = normalizeUser(userValue);
      if (user) {
        return { token, user };
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage', e);
    }
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const auth = JSON.parse(raw);
    if (isTokenExpired(auth?.token)) {
      clearAuth();
      return null;
    }

    if (auth?.user) {
      auth.user = normalizeUser(auth.user);
    }

    return auth;
  } catch (e) {
    console.warn('Failed to parse auth from combined storage', e);
  }

  return null;
}

export const getAuthUserId = (auth) => auth?.user?._id || auth?.user?.id || null;

export const isAuthenticated = () => {
  const auth = getStoredAuth();
  return Boolean(auth?.token && auth?.user);
};

export const saveAuth = (authData) => {
  if (typeof window === 'undefined') {
    return;
  }

  const parsedUser = normalizeUser(authData.user);
  const storedAuth = {
    token: authData.token,
    user: parsedUser
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedAuth));

  if (authData.token) {
    window.localStorage.setItem('token', authData.token);
  }

  if (parsedUser) {
    window.localStorage.setItem('user', JSON.stringify(parsedUser));
  }
};

export const clearAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
};
