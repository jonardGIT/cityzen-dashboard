"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, publicClient, registerUnauthorizedHandler } from "@/lib/api/clients";
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setStoredUser,
} from "@/lib/auth/token-storage";
import type { AuthUser, LoginRequest, LoginResponse, Role } from "@/types/auth";

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.email === "string" &&
    typeof record.role === "string"
  );
}

function resolveUserPayload(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedUser = record.user;

  if (isAuthUser(nestedUser)) {
    return nestedUser as AuthUser;
  }

  if (isAuthUser(record)) {
    return record as AuthUser;
  }

  if (record.data && typeof record.data === "object") {
    const dataRecord = record.data as Record<string, unknown>;
    if (isAuthUser(dataRecord.user)) {
      return dataRecord.user;
    }
  }

  return null;
}

function resolveAccessToken(payload: LoginResponse): string | null {
  return (
    payload.accessToken ??
    payload.token ??
    payload.access_token ??
    payload.jwt ??
    payload.data?.accessToken ??
    payload.data?.token ??
    payload.data?.access_token ??
    payload.data?.jwt ??
    null
  );
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const restoreSession = useCallback(async () => {
    const token = getAccessToken();
    const storedUser = getStoredUser<AuthUser>();

    if (!token) {
      setUser(null);
      setIsRestoring(false);
      return;
    }

    if (storedUser) {
      setUser(storedUser);
    }

    try {
      const response = await authClient.get<unknown>("/auth/me");
      const resolvedUser = resolveUserPayload(response.data);

      if (!resolvedUser) {
        throw new Error("Session response did not include a valid user payload.");
      }

      setStoredUser(resolvedUser);
      setUser(resolvedUser);
    } catch {
      clearAuthStorage();
      setUser(null);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    return registerUnauthorizedHandler(() => {
      clearAuthStorage();
      setUser(null);
      router.replace("/login");
    });
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const payload: LoginRequest = { email, password };
    const response = await publicClient.post<LoginResponse>("/auth/login", payload);
    const token = resolveAccessToken(response.data);

    if (!token) {
      throw new Error("Login response did not include an access token.");
    }

    setAccessToken(token);

    const resolvedUser = resolveUserPayload(response.data);
    if (resolvedUser) {
      setStoredUser(resolvedUser);
      setUser(resolvedUser);
    }

    await restoreSession();
  }, [restoreSession]);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) {
        return false;
      }

      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRestoring,
      login,
      logout,
      restoreSession,
      hasRole,
    }),
    [user, isRestoring, login, logout, restoreSession, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
