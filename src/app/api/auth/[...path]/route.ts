import { NextRequest, NextResponse } from "next/server";
import {
  getRequestRefreshToken,
  hasAuthenticatedRequest,
  requestUpstream,
  unauthorizedResponse,
} from "@/app/api/users/proxy";
import {
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/auth/session-cookies";
import type { AuthResponse } from "@/types/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/password-reset/request",
  "/auth/password-reset/confirm",
]);

const REFRESH_TOKEN_BODY_PATHS = new Set([
  "/auth/refresh",
  "/auth/mfa/setup",
  "/auth/mfa/enable",
  "/auth/mfa/disable",
]);

function requiresAuthenticatedSession(path: string) {
  return !PUBLIC_AUTH_PATHS.has(path);
}

function shouldStripAuthTokens(payload: unknown): payload is AuthResponse {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "user" in payload &&
    ("token" in payload ||
      "accessToken" in payload ||
      "refreshToken" in payload),
  );
}

function sanitizeAuthPayload(payload: AuthResponse) {
  return {
    ...payload,
    token: undefined,
    accessToken: undefined,
    refreshToken: undefined,
  };
}

function shouldClearCookies(path: string, status: number) {
  return (
    path === "/auth/logout" || (path === "/auth/refresh" && status === 401)
  );
}

async function buildRequestBody(
  request: NextRequest,
  upstreamPath: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
) {
  if (method === "GET" || method === "DELETE") {
    return {
      body: undefined as string | undefined,
      contentType: null as string | null,
    };
  }

  const contentType = request.headers.get("content-type");
  const rawBody = await request.text();

  if (
    !REFRESH_TOKEN_BODY_PATHS.has(upstreamPath) ||
    !contentType?.includes("application/json")
  ) {
    return {
      body: rawBody.length > 0 ? rawBody : undefined,
      contentType,
    };
  }

  let payload: Record<string, unknown> = {};
  if (rawBody.length > 0) {
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {
        body: rawBody,
        contentType,
      };
    }
  }

  if (!payload.refreshToken) {
    const refreshToken = getRequestRefreshToken(request);
    if (refreshToken) {
      payload.refreshToken = refreshToken;
    }
  }

  return {
    body: JSON.stringify(payload),
    contentType,
  };
}

async function toAuthJsonResponse(
  upstream: Response,
  upstreamPath: string,
): Promise<NextResponse> {
  if (upstream.status === 204) {
    const response = new NextResponse(null, { status: upstream.status });
    if (shouldClearCookies(upstreamPath, upstream.status)) {
      clearSessionCookies(response);
    }
    return response;
  }

  const raw = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "";

  if (!raw) {
    const response = NextResponse.json({}, { status: upstream.status });
    if (shouldClearCookies(upstreamPath, upstream.status)) {
      clearSessionCookies(response);
    }
    return response;
  }

  if (!contentType.includes("application/json")) {
    const response = NextResponse.json(
      { message: raw },
      { status: upstream.status },
    );
    if (shouldClearCookies(upstreamPath, upstream.status)) {
      clearSessionCookies(response);
    }
    return response;
  }

  try {
    const payload = JSON.parse(raw) as unknown;
    const response = NextResponse.json(
      shouldStripAuthTokens(payload) ? sanitizeAuthPayload(payload) : payload,
      { status: upstream.status },
    );

    if (shouldStripAuthTokens(payload)) {
      setSessionCookies(response, payload);
    }

    if (shouldClearCookies(upstreamPath, upstream.status)) {
      clearSessionCookies(response);
    }

    return response;
  } catch {
    const response = NextResponse.json(
      { message: raw },
      { status: upstream.status },
    );
    if (shouldClearCookies(upstreamPath, upstream.status)) {
      clearSessionCookies(response);
    }
    return response;
  }
}

async function forwardAuthRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
) {
  const { path } = await context.params;
  const upstreamPath = `/auth/${path.join("/")}`;

  if (
    requiresAuthenticatedSession(upstreamPath) &&
    !hasAuthenticatedRequest(request)
  ) {
    return unauthorizedResponse();
  }

  const { body, contentType } = await buildRequestBody(
    request,
    upstreamPath,
    method,
  );
  const upstream = await requestUpstream(
    request,
    `${upstreamPath}${request.nextUrl.search}`,
    {
      method,
      body,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    },
  );

  return toAuthJsonResponse(upstream, upstreamPath);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardAuthRequest(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardAuthRequest(request, context, "POST");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardAuthRequest(request, context, "PATCH");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardAuthRequest(request, context, "PUT");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardAuthRequest(request, context, "DELETE");
}
