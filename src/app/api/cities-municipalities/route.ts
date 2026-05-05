import { NextRequest, NextResponse } from "next/server";
import {
  getRequestAccessToken,
  requestUpstream,
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

    const upstream = await requestUpstream(
      request,
      `/cities-municipalities${request.nextUrl.search}`,
      {
        method: "GET",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch cities and municipalities." },
      { status: 500 },
    );
  }
}
