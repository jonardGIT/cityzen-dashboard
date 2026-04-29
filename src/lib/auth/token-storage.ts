const ACCESS_TOKEN_KEY = "xypes_access_token";
const REFRESH_TOKEN_KEY = "xypes_refresh_token";
const AUTH_SESSION_KEY = "xypes_auth_session";
const AUTH_USER_KEY = "xypes_auth_user";

import { normalizeAuthUser } from "@/lib/auth/roles";
import type { AuthResponse, StoredAuthSession } from "@/types/auth";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function getAccessToken(): string | null {
  return null;
}

export function setAccessToken(token: string): void {
  void token;
}

export function clearAccessToken(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return null;
}

export function setRefreshToken(token: string): void {
  void token;
}

export function clearRefreshToken(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function setStoredAuthSession(session: StoredAuthSession): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function storeAuthResponse(response: AuthResponse): void {
  const normalizedUser = normalizeAuthUser(response.user);

  clearAccessToken();
  clearRefreshToken();
  setStoredAuthSession({
    tokenType: response.tokenType,
    sessionId: response.sessionId,
    expiresAt: response.expiresAt,
    refreshExpiresAt: response.refreshExpiresAt,
  });
  setStoredUser(normalizedUser);
}

export function getStoredUser<T>(): T | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearRefreshToken();
  clearStoredAuthSession();
  clearStoredUser();
}
