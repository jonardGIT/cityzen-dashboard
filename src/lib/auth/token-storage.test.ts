import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getStoredAuthSession,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredAuthSession,
  setStoredUser,
  storeAuthResponse,
} from "@/lib/auth/token-storage";
import type { AuthResponse, AuthUser, StoredAuthSession } from "@/types/auth";

const ACCESS_TOKEN_KEY = "xypes_access_token";
const REFRESH_TOKEN_KEY = "xypes_refresh_token";
const AUTH_SESSION_KEY = "xypes_auth_session";
const AUTH_USER_KEY = "xypes_auth_user";

describe("auth token storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and reads auth tokens, session metadata, and user records", () => {
    const session: StoredAuthSession = {
      tokenType: "Bearer",
      sessionId: "session-1",
      expiresAt: "2026-04-06T12:00:00.000Z",
      refreshExpiresAt: "2026-04-07T12:00:00.000Z",
    };
    const user: AuthUser = {
      id: "user-1",
      email: "dispatcher@example.com",
      name: "Dispatch Lead",
      role: "DISPATCHER",
      mfaEnabled: false,
      mfaEnabledAt: null,
    } as AuthUser;

    setAccessToken("access-token");
    setRefreshToken("refresh-token");
    setStoredAuthSession(session);
    setStoredUser(user);

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
    expect(getStoredAuthSession()).toEqual(session);
    expect(getStoredUser<AuthUser>()).toEqual(user);
  });

  it("normalizes the stored auth user when persisting a login response", () => {
    const response = {
      token: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      sessionId: "session-1",
      expiresAt: "2026-04-06T12:00:00.000Z",
      refreshExpiresAt: "2026-04-07T12:00:00.000Z",
      user: {
        id: "user-1",
        email: "citizen@example.com",
        name: "Citizen Reporter",
        role: "VIEWER",
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
    } as unknown as AuthResponse;

    storeAuthResponse(response);

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
    expect(getStoredAuthSession()).toEqual({
      tokenType: "Bearer",
      sessionId: "session-1",
      expiresAt: "2026-04-06T12:00:00.000Z",
      refreshExpiresAt: "2026-04-07T12:00:00.000Z",
    });
    expect(getStoredUser<AuthUser>()).toEqual(
      expect.objectContaining({
        role: "CITIZEN_REPORTER",
      }),
    );
  });

  it("returns null when stored session JSON is corrupt", () => {
    window.localStorage.setItem(AUTH_SESSION_KEY, "{not-json");

    expect(getStoredAuthSession()).toBeNull();
  });

  it("returns null when stored user JSON is corrupt", () => {
    window.localStorage.setItem(AUTH_USER_KEY, "{not-json");

    expect(getStoredUser()).toBeNull();
  });

  it("clears all auth storage keys", () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "access-token");
    window.localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");
    window.localStorage.setItem(AUTH_SESSION_KEY, '{"sessionId":"session-1"}');
    window.localStorage.setItem(AUTH_USER_KEY, '{"id":"user-1"}');

    clearAuthStorage();

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });
});