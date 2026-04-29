import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  axiosCreateMock,
  authRequestUseMock,
  authResponseUseMock,
  authInstanceMock,
  refreshResponseUseMock,
  refreshPostMock,
  clearAuthStorageMock,
  getAccessTokenMock,
  getRefreshTokenMock,
  storeAuthResponseMock,
} = vi.hoisted(() => {
  const refreshRequestUseMock = vi.fn();
  const publicRequestUseMock = vi.fn();
  const publicResponseUseMock = vi.fn();
  const authRequestUseMock = vi.fn();
  const authResponseUseMock = vi.fn();
  const refreshResponseUseMock = vi.fn();
  const refreshPostMock = vi.fn();
  const refreshInstanceMock = {
    post: refreshPostMock,
    interceptors: {
      request: { use: refreshRequestUseMock },
      response: { use: refreshResponseUseMock },
    },
  };
  const authInstanceMock = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: authRequestUseMock },
      response: { use: authResponseUseMock },
    },
  });
  const axiosCreateMock = vi
    .fn()
    .mockReturnValueOnce(refreshInstanceMock)
    .mockReturnValueOnce({
      interceptors: {
        request: { use: publicRequestUseMock },
        response: { use: publicResponseUseMock },
      },
    })
    .mockReturnValueOnce(authInstanceMock);

  return {
    axiosCreateMock,
    authRequestUseMock,
    authResponseUseMock,
    authInstanceMock,
    refreshResponseUseMock,
    refreshPostMock,
    clearAuthStorageMock: vi.fn(),
    getAccessTokenMock: vi.fn(),
    getRefreshTokenMock: vi.fn(),
    storeAuthResponseMock: vi.fn(),
  };
});

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      create: axiosCreateMock,
    },
  };
});

vi.mock("@/lib/auth/token-storage", () => ({
  clearAuthStorage: clearAuthStorageMock,
  getAccessToken: getAccessTokenMock,
  getRefreshToken: getRefreshTokenMock,
  storeAuthResponse: storeAuthResponseMock,
}));

import { registerUnauthorizedHandler } from "@/lib/api/clients";

describe("auth api clients", () => {
  beforeEach(() => {
    clearAuthStorageMock.mockReset();
    getAccessTokenMock.mockReset();
    getRefreshTokenMock.mockReset();
    storeAuthResponseMock.mockReset();
    refreshPostMock.mockReset();
    authInstanceMock.mockReset();
  });

  it("adds the bearer token to authenticated requests", () => {
    getAccessTokenMock.mockReturnValue("access-token");

    const requestInterceptor = authRequestUseMock.mock.calls[0]?.[0] as
      | ((config: { headers?: Record<string, string> }) => {
          headers: {
            Authorization?: string;
            get?: (name: string) => string | undefined;
          };
        })
      | undefined;

    const config = requestInterceptor?.({ headers: {} });
    const authorization =
      typeof config?.headers.get === "function"
        ? config.headers.get("Authorization")
        : config?.headers.Authorization;

    expect(authorization).toBe("Bearer access-token");
  });

  it("uses the local development API key fallback when no public key is configured", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api/v1");

    const axiosModule = await import("axios");
    const createMock = vi.mocked(axiosModule.default.create);
    createMock.mockReset();

    const refreshRequestUseMock = vi.fn();
    const refreshResponseUseMock = vi.fn();
    const publicRequestUseMock = vi.fn();
    const publicResponseUseMock = vi.fn();
    const authRequestUseMockLocal = vi.fn();
    const authResponseUseMockLocal = vi.fn();
    const refreshPostMockLocal = vi.fn();
    const authInstanceMockLocal = Object.assign(vi.fn(), {
      interceptors: {
        request: { use: authRequestUseMockLocal },
        response: { use: authResponseUseMockLocal },
      },
    });
    const extraAuthRequestUseMock = vi.fn();
    const extraAuthResponseUseMock = vi.fn();
    const extraAuthInstanceMock = Object.assign(vi.fn(), {
      interceptors: {
        request: { use: extraAuthRequestUseMock },
        response: { use: extraAuthResponseUseMock },
      },
    });

    createMock
      .mockReturnValueOnce({
        post: refreshPostMockLocal,
        interceptors: {
          request: { use: refreshRequestUseMock },
          response: { use: refreshResponseUseMock },
        },
      } as never)
      .mockReturnValueOnce({
        interceptors: {
          request: { use: publicRequestUseMock },
          response: { use: publicResponseUseMock },
        },
      } as never)
      .mockReturnValueOnce(authInstanceMockLocal as never)
      .mockReturnValueOnce(extraAuthInstanceMock as never);

    const clientsModule = await import("@/lib/api/clients");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "/api/cirs",
        headers: expect.not.objectContaining({
          "x-api-key": expect.any(String),
        }),
      }),
    );

    createMock.mockClear();

    clientsModule.createAuthenticatedClient("http://localhost:3000/api/v1");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:3000/api/v1",
        headers: expect.objectContaining({
          "x-api-key": "local-dev-key",
        }),
      }),
    );
  });

  it("refreshes the session and retries a protected request once on 401", async () => {
    getRefreshTokenMock.mockReturnValue("refresh-token");
    refreshPostMock.mockResolvedValueOnce({
      data: {
        token: "next-access",
        refreshToken: "next-refresh",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2025-01-01T00:00:00.000Z",
        refreshExpiresAt: "2025-01-02T00:00:00.000Z",
        user: {
          id: "user-1",
          name: "Admin User",
          email: "admin@example.com",
          role: "DEPARTMENT_MANAGER",
          mfaEnabled: true,
        },
      },
    });
    authInstanceMock.mockResolvedValueOnce({ data: { ok: true } });

    const responseRejected = authResponseUseMock.mock.calls[0]?.[1] as
      | ((error: {
          response?: { status?: number };
          config?: Record<string, unknown>;
        }) => Promise<unknown>)
      | undefined;

    const result = await responseRejected?.({
      response: { status: 401 },
      config: { url: "/incidents", headers: {} },
    });

    expect(refreshPostMock).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "refresh-token",
    });
    expect(storeAuthResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "next-access",
        refreshToken: "next-refresh",
      }),
    );
    expect(authInstanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        _retry: true,
      }),
    );
    expect(result).toEqual({ data: { ok: true } });
  });

  it("clears auth and notifies listeners when refresh is unavailable", async () => {
    getRefreshTokenMock.mockReturnValue(null);
    const unauthorizedHandler = vi.fn();
    const unregister = registerUnauthorizedHandler(unauthorizedHandler);

    const responseRejected = authResponseUseMock.mock.calls[0]?.[1] as
      | ((error: {
          response?: { status?: number };
          config?: Record<string, unknown>;
        }) => Promise<never>)
      | undefined;

    await expect(
      responseRejected?.({
        response: { status: 401 },
        config: { url: "/incidents", headers: {} },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: { status: 401 },
      }),
    );

    expect(clearAuthStorageMock).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).toHaveBeenCalledWith("session-expired");
    unregister();
  });

  it("classifies revoked-session responses separately from generic expiry", async () => {
    getRefreshTokenMock.mockReturnValue(null);
    const unauthorizedHandler = vi.fn();
    const unregister = registerUnauthorizedHandler(unauthorizedHandler);

    const responseRejected = authResponseUseMock.mock.calls[0]?.[1] as
      | ((error: {
          response?: { status?: number; data?: { message?: string } };
          config?: Record<string, unknown>;
        }) => Promise<never>)
      | undefined;

    await expect(
      responseRejected?.({
        response: {
          status: 401,
          data: { message: "Unauthorized: invalid or revoked session" },
        },
        config: { url: "/incidents", headers: {} },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: {
          status: 401,
          data: { message: "Unauthorized: invalid or revoked session" },
        },
      }),
    );

    expect(unauthorizedHandler).toHaveBeenCalledWith("session-revoked");
    unregister();
  });

  it("classifies password-change responses separately from generic expiry", async () => {
    getRefreshTokenMock.mockReturnValue(null);
    const unauthorizedHandler = vi.fn();
    const unregister = registerUnauthorizedHandler(unauthorizedHandler);

    const responseRejected = authResponseUseMock.mock.calls[0]?.[1] as
      | ((error: {
          response?: { status?: number; data?: { message?: string } };
          config?: Record<string, unknown>;
        }) => Promise<never>)
      | undefined;

    await expect(
      responseRejected?.({
        response: {
          status: 401,
          data: { message: "Unauthorized: password changed" },
        },
        config: { url: "/incidents", headers: {} },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: {
          status: 401,
          data: { message: "Unauthorized: password changed" },
        },
      }),
    );

    expect(unauthorizedHandler).toHaveBeenCalledWith("password-changed");
    unregister();
  });

  it("classifies role-change responses separately from generic expiry", async () => {
    getRefreshTokenMock.mockReturnValue(null);
    const unauthorizedHandler = vi.fn();
    const unregister = registerUnauthorizedHandler(unauthorizedHandler);

    const responseRejected = authResponseUseMock.mock.calls[0]?.[1] as
      | ((error: {
          response?: { status?: number; data?: { message?: string } };
          config?: Record<string, unknown>;
        }) => Promise<never>)
      | undefined;

    await expect(
      responseRejected?.({
        response: {
          status: 401,
          data: { message: "Unauthorized: role changed" },
        },
        config: { url: "/incidents", headers: {} },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: {
          status: 401,
          data: { message: "Unauthorized: role changed" },
        },
      }),
    );

    expect(unauthorizedHandler).toHaveBeenCalledWith("role-changed");
    unregister();
  });

  it("clears auth storage when the refresh client itself receives 401", async () => {
    const refreshRejected = refreshResponseUseMock.mock.calls[0]?.[1] as
      | ((error: { response?: { status?: number } }) => Promise<never>)
      | undefined;

    await expect(
      refreshRejected?.({
        response: { status: 401 },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: { status: 401 },
      }),
    );

    expect(clearAuthStorageMock).toHaveBeenCalledTimes(1);
  });
});
