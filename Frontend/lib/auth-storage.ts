import type { AuthResponse, UserResponse } from "./types";

const KEYS = {
  ACCESS:  "cc_access_token",
  EXPIRES: "cc_expires_at",
  USER:    "cc_user",
} as const;

// Refresh token stored as httpOnly cookie by the backend — never in JS memory or localStorage.
// Cookie is automatically sent on /auth/refresh requests (credentials: "include").
// This survives PWA close/reopen while remaining inaccessible to XSS.

function ls(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export const authStorage = {
  save(auth: AuthResponse) {
    const store = ls();
    if (!store) return;
    const expiresAt = Date.now() + auth.expires_in * 1000;
    store.setItem(KEYS.ACCESS,  auth.access_token);
    store.setItem(KEYS.EXPIRES, String(expiresAt));
    store.setItem(KEYS.USER,    JSON.stringify(auth.user));
    window.dispatchEvent(new CustomEvent("cc:auth:login"));
  },

  getAccessToken(): string | null {
    return ls()?.getItem(KEYS.ACCESS) ?? null;
  },

  getUser(): UserResponse | null {
    const raw = ls()?.getItem(KEYS.USER);
    if (!raw) return null;
    try { return JSON.parse(raw) as UserResponse; }
    catch { return null; }
  },

  isExpired(): boolean {
    const exp = ls()?.getItem(KEYS.EXPIRES);
    if (!exp) return true;
    return Date.now() > Number(exp) - 30_000; // 30s buffer
  },

  clear() {
    const store = ls();
    if (!store) return;
    Object.values(KEYS).forEach(k => store.removeItem(k));
  },

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  },
};
