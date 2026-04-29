import { NextRequest, NextResponse } from "next/server";
import {
  hasAuthenticatedRequest,
  requestUpstream,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!hasAuthenticatedRequest(request)) {
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
