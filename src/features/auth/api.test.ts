import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";

const { publicPostMock, authGetMock, authPostMock, authDeleteMock } =
  vi.hoisted(() => ({
    publicPostMock: vi.fn(),
    authGetMock: vi.fn(),
    authPostMock: vi.fn(),
    authDeleteMock: vi.fn(),
  }));

vi.mock("@/lib/api/clients", () => ({
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
  fetchAuthSessions,
  loginWithPassword,
  logoutCurrentSession,
  refreshAuthSession,
  requestPasswordReset,
} from "@/features/auth/api";

describe("auth feature api", () => {
  beforeEach(() => {
    publicPostMock.mockReset();
    authGetMock.mockReset();
    authPostMock.mockReset();
    authDeleteMock.mockReset();
  });

  it("returns an MFA-required login result when the backend requests a second factor", async () => {
    const error = new AxiosError("MFA required");
    error.response = {
      data: { message: "MFA required", mfaRequired: true },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} },
    };
    publicPostMock.mockRejectedValueOnce(error);

    const result = await loginWithPassword({
      email: "admin@example.com",
      password: "password",
    });

    expect(result).toEqual({ mfaRequired: true });
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

  it("refreshes the authenticated session and returns replacement tokens", async () => {
    publicPostMock.mockResolvedValueOnce({
      data: {
        token: "next-access-token",
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
    });
    expect(authPostMock).toHaveBeenNthCalledWith(2, "/auth/mfa/disable", {
      code: "654321",
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

    expect(authPostMock).toHaveBeenCalledWith("/auth/mfa/setup", undefined, {
      signal: undefined,
    });
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
