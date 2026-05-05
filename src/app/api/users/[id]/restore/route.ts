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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasAuthenticatedSession(request)) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const upstream = await requestUpstreamWithFallback(
      request,
      [`/users/${id}/restore`, `/admin/users/${id}/restore`],
      {
        method: "POST",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to restore user." },
      { status: 500 },
    );
  }
}
