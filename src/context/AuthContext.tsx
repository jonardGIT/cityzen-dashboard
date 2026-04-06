"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { registerUnauthorizedHandler } from "@/lib/api/clients";
import { normalizeCapabilities, normalizeRole } from "@/lib/auth/roles";
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setStoredUser,
  storeAuthResponse,
} from "@/lib/auth/token-storage";
import {
  fetchCurrentUserCapabilities,
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentSession,
} from "@/features/auth/api";
import type {
  AuthUser,
  LoginReason,
  LoginResult,
  Role,
  UserCapabilities,
} from "@/types/auth";

interface LogoutOptions {
  revokeRemote?: boolean;
  redirectTo?: string;
  reason?: LoginReason;
}

interface AuthContextValue {
  user: AuthUser | null;
  capabilities: UserCapabilities | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (
    email: string,
    password: string,
    mfaCode?: string,
  ) => Promise<LoginResult>;
  logout: (options?: LogoutOptions) => Promise<void>;
  clearSession: () => void;
  restoreSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [capabilities, setCapabilities] = useState<UserCapabilities | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(true);
  const router = useRouter();

  const clearLocalSession = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setCapabilities(null);
  }, []);

  const logout = useCallback(
    async (options?: LogoutOptions) => {
      if (options?.revokeRemote !== false) {
        try {
          await logoutCurrentSession();
        } catch {
          // Local cleanup still needs to happen when the server-side session is already invalid.
        }
      }

      clearLocalSession();
      const redirectTo =
        options?.redirectTo ??
        `/login?reason=${encodeURIComponent(options?.reason ?? "signed-out")}`;
      router.replace(redirectTo);
    },
    [clearLocalSession, router],
  );

  const refreshUser = useCallback(async () => {
    const resolvedUser = await fetchCurrentUser();
    const resolvedCapabilities = await fetchCurrentUserCapabilities().catch(
      () => {
        return normalizeCapabilities(undefined, resolvedUser.role);
      },
    );

    setStoredUser(resolvedUser);
    setUser(resolvedUser);
    setCapabilities(resolvedCapabilities);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = getAccessToken();
    const storedUser = getStoredUser<AuthUser>();

    if (!token) {
      setUser(null);
      setIsRestoring(false);
      return;
    }

    if (storedUser) {
      setUser({
        ...storedUser,
        role: normalizeRole(storedUser.role) ?? storedUser.role,
      });
    }

    try {
      await refreshUser();
    } catch {
      clearLocalSession();
    } finally {
      setIsRestoring(false);
    }
  }, [clearLocalSession, refreshUser]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    return registerUnauthorizedHandler((reason) => {
      clearLocalSession();
      router.replace(`/login?reason=${encodeURIComponent(reason)}`);
    });
  }, [clearLocalSession, router]);

  const login = useCallback(
    async (email: string, password: string, mfaCode?: string) => {
      const result = await loginWithPassword({ email, password, mfaCode });

      if (!result.auth) {
        return result;
      }

      storeAuthResponse(result.auth);

      try {
        await refreshUser();
      } catch (error) {
        clearLocalSession();
        throw error;
      }

      return result;
    },
    [clearLocalSession, refreshUser],
  );

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
      capabilities,
      isAuthenticated: Boolean(user),
      isRestoring,
      login,
      logout,
      clearSession: clearLocalSession,
      restoreSession,
      refreshUser,
      hasRole,
    }),
    [
      user,
      capabilities,
      isRestoring,
      login,
      logout,
      clearLocalSession,
      restoreSession,
      refreshUser,
      hasRole,
    ],
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
