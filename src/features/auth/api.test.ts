import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

const {
  publicPostMock,
  authGetMock,
  authPostMock,
  authDeleteMock,
  proxiedAuthGetMock,
  createAuthenticatedClientMock,
  getRefreshTokenMock,
} = vi.hoisted(() => ({
  publicPostMock: vi.fn(),
  authGetMock: vi.fn(),
  authPostMock: vi.fn(),
  authDeleteMock: vi.fn(),
  proxiedAuthGetMock: vi.fn(),
  createAuthenticatedClientMock: vi.fn(),
  getRefreshTokenMock: vi.fn(() => "mock-refresh-token"),
}));

vi.mock("@/lib/auth/token-storage", () => ({
  getRefreshToken: getRefreshTokenMock,
}));

vi.mock("@/lib/api/clients", () => ({
  createAuthenticatedClient: createAuthenticatedClientMock.mockReturnValue({
    get: proxiedAuthGetMock,
  }),
  publicClient: {
    post: publicPostMock,
  },
  authClient: {
    get: authGetMock,
    post: authPostMock,
    delete: authDeleteMock,
  },
}));

import {
  confirmPasswordReset,
  createMfaSetup,
  disableMfa,
  enableMfa,
  fetchCurrentUserCapabilities,
  fetchAuthSessions,
  loginWithPassword,
  logoutCurrentSession,
  refreshAuthSession,
  registerAccount,
  requestPasswordReset,
} from "@/features/auth/api";

describe("auth feature api", () => {
  beforeEach(() => {
    publicPostMock.mockReset();
    authGetMock.mockReset();
    authPostMock.mockReset();
    authDeleteMock.mockReset();
    proxiedAuthGetMock.mockReset();
  });

  it("returns an MFA-required login result when the backend requests a second factor", async () => {
    const error = new AxiosError("MFA required");
    error.response = {
      data: { message: "MFA required", mfaRequired: true },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    publicPostMock.mockRejectedValueOnce(error);

    const result = await loginWithPassword({
      email: "admin@example.com",
      password: "password",
    });

    expect(result).toEqual({ mfaRequired: true });
  });

  it("treats a message-only 401 MFA challenge as second-factor required", async () => {
    const error = new AxiosError("Unauthorized");
    error.response = {
      data: { message: "MFA required for this account." },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    publicPostMock.mockRejectedValueOnce(error);

    const result = await loginWithPassword({
      email: "admin@example.com",
      password: "password",
    });

    expect(result).toEqual({ mfaRequired: true });
  });

  it("registers and normalizes an authenticated citizen session", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: {
        token: "citizen-access-token",
        refreshToken: "citizen-refresh-token",
        tokenType: "Bearer",
        sessionId: "session-2",
        expiresAt: "2026-04-06T12:00:00.000Z",
        refreshExpiresAt: "2026-04-07T12:00:00.000Z",
        user: {
          id: "citizen-1",
          email: "citizen@example.com",
          name: "Citizen Reporter",
          role: "CITIZEN_REPORTER",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
    });

    const result = await registerAccount({
      name: "Citizen Reporter",
      email: "citizen@example.com",
      password: "CitizenPassword123!",
    });

    expect(publicPostMock).toHaveBeenCalledWith("/auth/register", {
      name: "Citizen Reporter",
      email: "citizen@example.com",
      password: "CitizenPassword123!",
    });
    expect(result).toEqual({
      emailConfirmationRequired: false,
      auth: {
        token: "citizen-access-token",
        accessToken: "citizen-access-token",
        refreshToken: "citizen-refresh-token",
        tokenType: "Bearer",
        sessionId: "session-2",
        expiresAt: "2026-04-06T12:00:00.000Z",
        refreshExpiresAt: "2026-04-07T12:00:00.000Z",
        user: {
          id: "citizen-1",
          email: "citizen@example.com",
          name: "Citizen Reporter",
          role: "CITIZEN_REPORTER",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
      user: {
        id: "citizen-1",
        email: "citizen@example.com",
        name: "Citizen Reporter",
        role: "CITIZEN_REPORTER",
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
      message: undefined,
    });
  });

  it("returns the email-confirmation registration result when signup is pending verification", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: {
        message:
          "Registration succeeded. Confirm your email before signing in.",
        emailConfirmationRequired: true,
        user: {
          id: "citizen-2",
          email: "pending@example.com",
          name: "Pending Citizen",
          role: "CITIZEN_REPORTER",
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      },
    });

    const result = await registerAccount({
      name: "Pending Citizen",
      email: "pending@example.com",
      password: "CitizenPassword123!",
    });

    expect(result).toEqual({
      emailConfirmationRequired: true,
      message: "Registration succeeded. Confirm your email before signing in.",
      user: {
        id: "citizen-2",
        email: "pending@example.com",
        name: "Pending Citizen",
        role: "CITIZEN_REPORTER",
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
    });
  });

  it("does not treat an invalid submitted MFA code as a missing second factor", async () => {
    const error = new AxiosError("Unauthorized");
    error.response = {
      data: { message: "Invalid MFA code." },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    publicPostMock.mockRejectedValueOnce(error);

    await expect(
      loginWithPassword({
        email: "admin@example.com",
        password: "password",
        mfaCode: "123456",
      }),
    ).rejects.toBe(error);
  });

  it("fetches authenticated sessions from the server", async () => {
    authGetMock.mockResolvedValueOnce({
      data: [{ id: "session-1", isCurrent: true }],
    });

    const result = await fetchAuthSessions();

    expect(authGetMock).toHaveBeenCalledWith("/auth/sessions", {
      signal: undefined,
    });
    expect(result).toEqual([{ id: "session-1", isCurrent: true }]);
  });

  it("fetches current user capabilities through the dashboard users proxy", async () => {
    proxiedAuthGetMock.mockResolvedValueOnce({
      data: {
        role: "NATIONAL_ADMIN",
        permissions: ["user:manage:global"],
        scope: ["global"],
        canUpdateUser: true,
        canDeleteUser: true,
      },
    });

    const result = await fetchCurrentUserCapabilities();

    expect(createAuthenticatedClientMock).toHaveBeenCalledWith("/api");
    expect(proxiedAuthGetMock).toHaveBeenCalledWith("/users/capabilities", {
      signal: undefined,
    });
    expect(result).toEqual({
      role: "NATIONAL_ADMIN",
      label: "National Admin",
      permissions: ["user:manage:global"],
      scope: ["global"],
      canUpdateUser: true,
      canDeleteUser: true,
    });
  });

  it("refreshes the authenticated session and returns replacement tokens", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: {
        accessToken: "next-access-token",
        refreshToken: "next-refresh-token",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2026-04-06T12:00:00.000Z",
        refreshExpiresAt: "2026-04-07T12:00:00.000Z",
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

    const result = await refreshAuthSession({
      refreshToken: "current-refresh-token",
    });

    expect(publicPostMock).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "current-refresh-token",
    });
    expect(result.token).toBe("next-access-token");
    expect(result.accessToken).toBe("next-access-token");
    expect(result.refreshToken).toBe("next-refresh-token");
  });

  it("posts MFA enable and disable requests to the expected endpoints", async () => {
    authPostMock
      .mockResolvedValueOnce({ data: { message: "enabled" } })
      .mockResolvedValueOnce({ data: { message: "disabled" } });

    const enabled = await enableMfa({ code: "123456" });
    const disabled = await disableMfa({ code: "654321" });

    expect(authPostMock).toHaveBeenNthCalledWith(1, "/auth/mfa/enable", {
      code: "123456",
      refreshToken: "mock-refresh-token",
    });
    expect(authPostMock).toHaveBeenNthCalledWith(2, "/auth/mfa/disable", {
      code: "654321",
      refreshToken: "mock-refresh-token",
    });
    expect(enabled).toEqual({ message: "enabled" });
    expect(disabled).toEqual({ message: "disabled" });
  });

  it("requests MFA setup from the authenticated auth endpoint", async () => {
    authPostMock.mockResolvedValueOnce({
      data: {
        issuer: "Xypes CIRS",
        accountName: "dispatcher@example.com",
        secret: "ABC123",
        otpauthUrl: "otpauth://totp/Xypes",
      },
    });

    const result = await createMfaSetup();

    expect(authPostMock).toHaveBeenCalledWith(
      "/auth/mfa/setup",
      { refreshToken: "mock-refresh-token" },
      {
        signal: undefined,
      },
    );
    expect(result).toEqual({
      issuer: "Xypes CIRS",
      accountName: "dispatcher@example.com",
      secret: "ABC123",
      otpauthUrl: "otpauth://totp/Xypes",
    });
  });

  it("posts logout to revoke the current server-side session", async () => {
    authPostMock.mockResolvedValueOnce({ data: undefined });

    await logoutCurrentSession();

    expect(authPostMock).toHaveBeenCalledWith("/auth/logout");
  });

  it("requests password reset using the public auth client", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: {
        message:
          "If an account with that email exists, a password reset token has been created.",
        resetToken: "dev-token",
        resetExpiresAt: "2026-03-29T16:18:16.107Z",
      },
    });

    const result = await requestPasswordReset({
      email: "admin@example.com",
    });

    expect(publicPostMock).toHaveBeenCalledWith(
      "/auth/password-reset/request",
      { email: "admin@example.com" },
    );
    expect(result.resetToken).toBe("dev-token");
  });

  it("confirms password reset using token and new password", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: { message: "Password reset succeeded." },
    });

    const result = await confirmPasswordReset({
      token: "reset-token",
      password: "Password1234!",
    });

    expect(publicPostMock).toHaveBeenCalledWith(
      "/auth/password-reset/confirm",
      {
        token: "reset-token",
        password: "Password1234!",
      },
    );
    expect(result).toEqual({ message: "Password reset succeeded." });
  });
});
