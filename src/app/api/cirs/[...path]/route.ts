import { NextRequest } from "next/server";
import {
  hasAuthenticatedRequest,
  requestUpstream,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPublicProxyPath(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
) {
  if (method !== "GET") {
    return false;
  }

  return (
    path === "/health" || path === "/openapi.json" || path.startsWith("/docs")
  );
}

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join("/")}${request.nextUrl.search}`;
  const upstreamPathname = `/${path.join("/")}`;

  if (
    !isPublicProxyPath(method, upstreamPathname) &&
    !hasAuthenticatedRequest(request)
  ) {
    return unauthorizedResponse();
  }

  const contentType = request.headers.get("content-type");
  const body = method === "GET" ? undefined : await request.text();

  const upstream = await requestUpstream(request, upstreamPath, {
    method,
    body: body && body.length > 0 ? body : undefined,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });

  return toJsonResponse(upstream);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context, "POST");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context, "PATCH");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context, "PUT");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context, "DELETE");
}
