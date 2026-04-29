import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const {
  useRouterMock,
  registerUnauthorizedHandlerMock,
  unauthorizedHandlerRef,
  clearAuthStorageMock,
  getAccessTokenMock,
  getStoredUserMock,
  setStoredUserMock,
  storeAuthResponseMock,
  fetchCurrentUserMock,
  fetchCurrentUserCapabilitiesMock,
  loginWithPasswordMock,
  logoutCurrentSessionMock,
  registerAccountMock,
  normalizeCapabilitiesMock,
  normalizeRoleMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  registerUnauthorizedHandlerMock: vi.fn(),
  unauthorizedHandlerRef: {
    current: undefined as undefined | ((reason: string) => void),
  },
  clearAuthStorageMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getStoredUserMock: vi.fn(),
  setStoredUserMock: vi.fn(),
  storeAuthResponseMock: vi.fn(),
  fetchCurrentUserMock: vi.fn(),
  fetchCurrentUserCapabilitiesMock: vi.fn(),
  loginWithPasswordMock: vi.fn(),
  logoutCurrentSessionMock: vi.fn(),
  registerAccountMock: vi.fn(),
  normalizeCapabilitiesMock: vi.fn(),
  normalizeRoleMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
}));

vi.mock("@/lib/api/clients", () => ({
  registerUnauthorizedHandler: registerUnauthorizedHandlerMock,
}));

vi.mock("@/lib/auth/token-storage", () => ({
  clearAuthStorage: clearAuthStorageMock,
  getAccessToken: getAccessTokenMock,
  getStoredUser: getStoredUserMock,
  setStoredUser: setStoredUserMock,
  storeAuthResponse: storeAuthResponseMock,
}));

vi.mock("@/features/auth/api", () => ({
  fetchCurrentUser: fetchCurrentUserMock,
  fetchCurrentUserCapabilities: fetchCurrentUserCapabilitiesMock,
  loginWithPassword: loginWithPasswordMock,
  logoutCurrentSession: logoutCurrentSessionMock,
  registerAccount: registerAccountMock,
}));

vi.mock("@/lib/auth/roles", () => ({
  normalizeCapabilities: normalizeCapabilitiesMock,
  normalizeRole: normalizeRoleMock,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    const replaceMock = vi.fn();

    useRouterMock.mockReturnValue({ replace: replaceMock });
    registerUnauthorizedHandlerMock.mockImplementation((handler) => {
      unauthorizedHandlerRef.current = handler;
      return vi.fn();
    });
    clearAuthStorageMock.mockReset();
    getAccessTokenMock.mockReturnValue(null);
    getStoredUserMock.mockReturnValue(null);
    setStoredUserMock.mockReset();
    storeAuthResponseMock.mockReset();
    fetchCurrentUserMock.mockReset();
    fetchCurrentUserCapabilitiesMock.mockReset();
    loginWithPasswordMock.mockReset();
    logoutCurrentSessionMock.mockReset();
    registerAccountMock.mockReset();
    normalizeCapabilitiesMock.mockImplementation((value) => value ?? null);
    normalizeRoleMock.mockImplementation((value) => value ?? null);
  });

  it("redirects to login when the unauthorized handler reports a revoked session", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      unauthorizedHandlerRef.current?.("session-revoked");
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(clearAuthStorageMock).toHaveBeenCalled();
    expect(useRouterMock.mock.results[0]?.value.replace).toHaveBeenCalledWith(
      "/login?reason=session-revoked",
    );
  });

  it("restores an authenticated session from stored auth and backend profile data", async () => {
    getAccessTokenMock.mockReturnValue("access-token");
    getStoredUserMock.mockReturnValue({
      id: "user-1",
      email: "stored@example.com",
      name: "Stored User",
      role: "DISPATCHER",
      mfaEnabled: false,
      mfaEnabledAt: null,
    });
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "dispatcher@example.com",
      name: "Dispatch Lead",
      role: "DISPATCHER",
      mfaEnabled: true,
      mfaEnabledAt: "2026-04-06T00:00:00.000Z",
    });
    fetchCurrentUserCapabilitiesMock.mockResolvedValue({
      role: "DISPATCHER",
      permissions: ["incidents.read"],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual({
      id: "user-1",
      email: "dispatcher@example.com",
      name: "Dispatch Lead",
      role: "DISPATCHER",
      mfaEnabled: true,
      mfaEnabledAt: "2026-04-06T00:00:00.000Z",
    });
    expect(result.current.capabilities).toEqual({
      role: "DISPATCHER",
      permissions: ["incidents.read"],
    });
    expect(setStoredUserMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "dispatcher@example.com",
      name: "Dispatch Lead",
      role: "DISPATCHER",
      mfaEnabled: true,
      mfaEnabledAt: "2026-04-06T00:00:00.000Z",
    });
  });

  it("falls back to role-derived capabilities when capabilities fetch returns 401", async () => {
    getAccessTokenMock.mockReturnValue("access-token");
    getStoredUserMock.mockReturnValue({
      id: "user-1",
      email: "stored@example.com",
      name: "Stored User",
      role: "SYSTEM_ADMIN",
      mfaEnabled: true,
      mfaEnabledAt: "2026-04-06T00:00:00.000Z",
    });
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      name: "System Admin",
      role: "SYSTEM_ADMIN",
      mfaEnabled: true,
      mfaEnabledAt: "2026-04-06T00:00:00.000Z",
    });
    fetchCurrentUserCapabilitiesMock.mockRejectedValue({
      response: { status: 401 },
    });
    normalizeCapabilitiesMock.mockImplementation((_value, fallbackRole) => ({
      role: fallbackRole,
      permissions: [],
      scope: [],
      canUpdateUser: true,
      canDeleteUser: true,
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(clearAuthStorageMock).not.toHaveBeenCalled();
    expect(result.current.capabilities).toEqual({
      role: "SYSTEM_ADMIN",
      permissions: [],
      scope: [],
      canUpdateUser: true,
      canDeleteUser: true,
    });
  });

  it("clears a stale stored session when profile refresh fails during restore", async () => {
    getAccessTokenMock.mockReturnValue("stale-token");
    getStoredUserMock.mockReturnValue({
      id: "user-1",
      email: "stale@example.com",
      name: "Stale User",
      role: "DISPATCHER",
      mfaEnabled: false,
      mfaEnabledAt: null,
    });
    fetchCurrentUserMock.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(clearAuthStorageMock).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.capabilities).toBeNull();
  });

  it("stores auth payloads and hydrates the active user on successful login", async () => {
    loginWithPasswordMock.mockResolvedValue({
      mfaRequired: false,
      auth: {
        token: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2026-04-06T10:00:00.000Z",
        refreshExpiresAt: "2026-04-07T10:00:00.000Z",
        user: {
          id: "user-1",
          email: "dispatcher@example.com",
          name: "Dispatch Lead",
          role: "DISPATCHER",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
    });
    getAccessTokenMock.mockReturnValue("access-token");
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "dispatcher@example.com",
      name: "Dispatch Lead",
      role: "DISPATCHER",
      mfaEnabled: false,
      mfaEnabledAt: null,
    });
    fetchCurrentUserCapabilitiesMock.mockResolvedValue({
      role: "DISPATCHER",
      permissions: ["incidents.read"],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("dispatcher@example.com", "Password123!");
    });

    expect(storeAuthResponseMock).toHaveBeenCalledWith({
      token: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      sessionId: "session-1",
      expiresAt: "2026-04-06T10:00:00.000Z",
      refreshExpiresAt: "2026-04-07T10:00:00.000Z",
      user: {
        id: "user-1",
        email: "dispatcher@example.com",
        name: "Dispatch Lead",
        role: "DISPATCHER",
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
    });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    expect(result.current.user?.email).toBe("dispatcher@example.com");
    expect(result.current.capabilities).toEqual({
      role: "DISPATCHER",
      permissions: ["incidents.read"],
    });
  });

  it("stores auth payloads and hydrates the active user on successful registration", async () => {
    registerAccountMock.mockResolvedValue({
      emailConfirmationRequired: false,
      auth: {
        token: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        sessionId: "session-3",
        expiresAt: "2026-04-06T10:00:00.000Z",
        refreshExpiresAt: "2026-04-07T10:00:00.000Z",
        user: {
          id: "user-2",
          email: "citizen@example.com",
          name: "Citizen Reporter",
          role: "CITIZEN_REPORTER",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
    });
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-2",
      email: "citizen@example.com",
      name: "Citizen Reporter",
      role: "CITIZEN_REPORTER",
      mfaEnabled: false,
      mfaEnabledAt: null,
    });
    fetchCurrentUserCapabilitiesMock.mockResolvedValue({
      role: "CITIZEN_REPORTER",
      permissions: ["incident:create:self"],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register(
        "Citizen Reporter",
        "citizen@example.com",
        "CitizenPassword123!",
      );
    });

    expect(storeAuthResponseMock).toHaveBeenCalledWith({
      token: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      sessionId: "session-3",
      expiresAt: "2026-04-06T10:00:00.000Z",
      refreshExpiresAt: "2026-04-07T10:00:00.000Z",
      user: {
        id: "user-2",
        email: "citizen@example.com",
        name: "Citizen Reporter",
        role: "CITIZEN_REPORTER",
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
    });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    expect(result.current.user?.email).toBe("citizen@example.com");
  });

  it("clears the optimistic session when post-login hydration fails", async () => {
    const loginError = new Error(
      "Unauthorized: sign in again to satisfy MFA requirements",
    );

    loginWithPasswordMock.mockResolvedValue({
      mfaRequired: false,
      auth: {
        token: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2026-04-06T10:00:00.000Z",
        refreshExpiresAt: "2026-04-07T10:00:00.000Z",
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "System Admin",
          role: "SYSTEM_ADMIN",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
    });
    fetchCurrentUserMock.mockRejectedValue(loginError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login("admin@example.com", "Password123!");
      }),
    ).rejects.toThrow(
      "Unauthorized: sign in again to satisfy MFA requirements",
    );

    expect(clearAuthStorageMock).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.capabilities).toBeNull();
  });

  it("cleans up locally and skips remote logout when revokeRemote is false", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout({
        revokeRemote: false,
        redirectTo: "/login?reason=session-revoked",
      });
    });

    expect(logoutCurrentSessionMock).not.toHaveBeenCalled();
    expect(clearAuthStorageMock).toHaveBeenCalled();
    expect(useRouterMock.mock.results[0]?.value.replace).toHaveBeenCalledWith(
      "/login?reason=session-revoked",
    );
  });
});
