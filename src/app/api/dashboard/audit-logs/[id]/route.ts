import { NextRequest, NextResponse } from "next/server";
import {
  requestUpstream,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!request.headers.get("authorization")) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const upstream = await requestUpstream(request, `/audit-logs/${id}`, {
      method: "GET",
    });

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch audit log details." },
      { status: 500 },
    );
  }
}
