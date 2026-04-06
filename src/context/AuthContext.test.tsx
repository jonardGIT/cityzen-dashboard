import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const {
  useRouterMock,
  registerUnauthorizedHandlerMock,
  clearAuthStorageMock,
  getAccessTokenMock,
  getStoredUserMock,
  setStoredUserMock,
  storeAuthResponseMock,
  fetchCurrentUserMock,
  fetchCurrentUserCapabilitiesMock,
  loginWithPasswordMock,
  logoutCurrentSessionMock,
  normalizeCapabilitiesMock,
  normalizeRoleMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  registerUnauthorizedHandlerMock: vi.fn(),
  clearAuthStorageMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getStoredUserMock: vi.fn(),
  setStoredUserMock: vi.fn(),
  storeAuthResponseMock: vi.fn(),
  fetchCurrentUserMock: vi.fn(),
  fetchCurrentUserCapabilitiesMock: vi.fn(),
  loginWithPasswordMock: vi.fn(),
  logoutCurrentSessionMock: vi.fn(),
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
      registerUnauthorizedHandlerMock.currentHandler = handler;
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
    normalizeCapabilitiesMock.mockImplementation((value) => value ?? null);
    normalizeRoleMock.mockImplementation((value) => value ?? null);
  });

  it("redirects to login when the unauthorized handler reports a revoked session", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      registerUnauthorizedHandlerMock.currentHandler("session-revoked");
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(clearAuthStorageMock).toHaveBeenCalled();
    expect(useRouterMock.mock.results[0]?.value.replace).toHaveBeenCalledWith(
      "/login?reason=session-revoked",
    );
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