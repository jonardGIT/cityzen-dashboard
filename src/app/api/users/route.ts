import { NextRequest, NextResponse } from "next/server";
import {
  getRequestAccessToken,
  requestUpstreamWithFallback,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasAuthenticatedSession(request: NextRequest) {
  return Boolean(getRequestAccessToken(request));
}

export async function GET(request: NextRequest) {
  try {
    if (!hasAuthenticatedSession(request)) {
      return unauthorizedResponse();
    }

    const search = request.nextUrl.search;
    const upstream = await requestUpstreamWithFallback(
      request,
      [`/users${search}`, `/admin/users${search}`],
      {
        method: "GET",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch users." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasAuthenticatedSession(request)) {
      return unauthorizedResponse();
    }

    const payload = await request.json();
    const upstream = await requestUpstreamWithFallback(
      request,
      ["/users", "/admin/users"],
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to create user." },
      { status: 500 },
    );
  }
}
