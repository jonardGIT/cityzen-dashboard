import { NextRequest, NextResponse } from "next/server";
import {
  resolveDashboardApiBaseUrl,
  resolveDashboardProxyApiKey,
} from "@/lib/config/runtime-env";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/session-cookies";

const API_BASE_URL = resolveDashboardApiBaseUrl();
const API_KEY = resolveDashboardProxyApiKey();

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getRequestAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [, token] = authHeader.split(/\s+/, 2);
    return token ?? authHeader;
  }

  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function getRequestRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export function hasAuthenticatedRequest(request: NextRequest): boolean {
  return Boolean(getRequestAccessToken(request));
}

export async function requestUpstream(
  request: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");

  const authHeader = request.headers.get("authorization");
  const accessToken = getRequestAccessToken(request);
  if (authHeader) {
    headers.set("Authorization", authHeader);
  } else if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (API_KEY) {
    headers.set("x-api-key", API_KEY);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(buildUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function requestUpstreamWithFallback(
  request: NextRequest,
  paths: string[],
  init?: RequestInit,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (const path of paths) {
    const response = await requestUpstream(request, path, init);
    if (response.status !== 404) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse ?? new Response("Not found", { status: 404 });
}

export async function toJsonResponse(
  upstream: Response,
): Promise<NextResponse> {
  if (upstream.status === 204) {
    return new NextResponse(null, { status: upstream.status });
  }

  const raw = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "";

  if (!raw) {
    return NextResponse.json({}, { status: upstream.status });
  }

  if (contentType.includes("application/json")) {
    try {
      return NextResponse.json(JSON.parse(raw), { status: upstream.status });
    } catch {
      return NextResponse.json({ message: raw }, { status: upstream.status });
    }
  }

  return NextResponse.json({ message: raw }, { status: upstream.status });
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { message: "Missing authenticated session." },
    { status: 401 },
  );
}
