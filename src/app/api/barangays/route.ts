import { NextRequest, NextResponse } from "next/server";
import {
  requestUpstream,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!request.headers.get("authorization")) {
      return unauthorizedResponse();
    }

    const upstream = await requestUpstream(
      request,
      `/barangays${request.nextUrl.search}`,
      {
        method: "GET",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch barangays." },
      { status: 500 },
    );
  }
}
