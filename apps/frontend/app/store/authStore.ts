'use client';

import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  init: () => void;
}

const TOKEN_KEY = 'fw_token';
const USER_KEY = 'fw_user';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // middleware reads this cookie for route protection
    document.cookie = `fw_authed=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    set({ token, user });
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'fw_authed=; path=/; max-age=0; SameSite=Lax';
    set({ token: null, user: null });
  },

  init() {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        set({ token, user });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  },
}));
