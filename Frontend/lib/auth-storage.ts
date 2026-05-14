import type { AuthResponse, UserResponse } from "./types";

const KEYS = {
  ACCESS:  "cc_access_token",
  EXPIRES: "cc_expires_at",
  USER:    "cc_user",
} as const;

// Refresh token kept in memory only — never written to localStorage.
// XSS can read localStorage; memory is not accessible to injected scripts.
// Trade-off: refresh token lost on page reload. User re-authenticates after
// access token expires (~1hr). Acceptable for a healthcare app.
let _refreshToken: string | null = null;

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
    _refreshToken = auth.refresh_token;
    window.dispatchEvent(new CustomEvent("cc:auth:login"));
  },

  getAccessToken(): string | null {
    return ls()?.getItem(KEYS.ACCESS) ?? null;
  },

  getRefreshToken(): string | null {
    return _refreshToken;
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
    _refreshToken = null;
  },

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  },
};
