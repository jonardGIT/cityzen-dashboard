import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");

function resolveApiKey(): string {
  const configuredKey =
    process.env.API_KEY?.trim() ??
    process.env.NEXT_PUBLIC_API_KEY?.trim() ??
    "";

  if (configuredKey) {
    return configuredKey;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    API_BASE_URL.startsWith("http://localhost:3000/api/v1")
  ) {
    return "local-dev-key";
  }

  return "";
}

const API_KEY = resolveApiKey();

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function requestUpstream(
  request: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
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
    { message: "Missing Authorization header." },
    { status: 401 },
  );
}
