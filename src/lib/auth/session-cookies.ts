import { NextResponse } from "next/server";
import type { AuthResponse } from "@/types/auth";

export const ACCESS_TOKEN_COOKIE = "xypes_access_token";
export const REFRESH_TOKEN_COOKIE = "xypes_refresh_token";

function resolveCookieSecurity() {
  return process.env.NODE_ENV === "production";
}

function buildCookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: resolveCookieSecurity(),
    path: "/",
    ...(expiresAt ? { expires: new Date(expiresAt) } : {}),
  };
}

export function setSessionCookies(
  response: NextResponse,
  payload: Pick<
    AuthResponse,
    "token" | "accessToken" | "refreshToken" | "expiresAt" | "refreshExpiresAt"
  >,
) {
  const accessToken = payload.token || payload.accessToken;

  if (accessToken) {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      buildCookieOptions(payload.expiresAt),
    );
  }

  if (payload.refreshToken) {
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      payload.refreshToken,
      buildCookieOptions(payload.refreshExpiresAt),
    );
  }
}

export function clearSessionCookies(response: NextResponse) {
  const expiredOptions = {
    ...buildCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", expiredOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", expiredOptions);
}
