
export const AUTH_STORAGE_KEY = 'synapescrow_auth';

export function getStoredAuth() {
  if (typeof window === "undefined") return null;

  // Primary check for separate keys as requested by user
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (token && user) {
    try {
      return {
        token,
        user: JSON.parse(user)
      };
    } catch (e) {}
  }

  // Final fallback to combined key for backward compatibility
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return null;
}

export const isAuthenticated = () => {
  const auth = getStoredAuth();
  return Boolean(auth?.token);
};

export const saveAuth = (authData) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Save to combined key
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  
  // Also save to separate keys as expected by the user's logic
  if (authData.token) window.localStorage.setItem('token', authData.token);
  if (authData.user) window.localStorage.setItem('user', typeof authData.user === 'string' ? authData.user : JSON.stringify(authData.user));
};

export const clearAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
};
