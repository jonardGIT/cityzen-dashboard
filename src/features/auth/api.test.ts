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
  disableMfa,
  enableMfa,
  fetchAuthSessions,
  loginWithPassword,
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
