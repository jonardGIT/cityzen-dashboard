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
      const response = await authClient.get<AuthUser | { user: AuthUser }>("/auth/me");
      const resolvedUser =
        "user" in response.data ? response.data.user : response.data;
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
    const token = response.data.accessToken ?? response.data.token;

    if (!token) {
      throw new Error("Login response did not include an access token.");
    }

    setAccessToken(token);

    if (response.data.user) {
      setStoredUser(response.data.user);
      setUser(response.data.user);
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
