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

    const query = request.nextUrl.search || "";
    const upstream = await requestUpstream(request, `/audit-logs${query}`, {
      method: "GET",
    });

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch audit logs." },
      { status: 500 },
    );
  }
}
