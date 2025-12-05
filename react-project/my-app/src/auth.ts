export type SessionUser = {
  UserID: number;
  Username: string;
  Email?: string;
  RoleName: 'User' | 'Admin';
};

const KEY = 'auth-session';

export const setAuth = (token: string, user: SessionUser) => {
  localStorage.setItem(KEY, JSON.stringify({ token, user }));
};

export const clearAuth = () => localStorage.removeItem(KEY);

export const getToken = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).token as string;
  } catch {
    return null;
  }
};

export const getUser = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).user as SessionUser;
  } catch {
    return null;
  }
};