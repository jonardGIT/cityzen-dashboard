import { NextRequest, NextResponse } from "next/server";
import {
  hasAuthenticatedRequest,
  requestUpstream,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasAuthenticatedRequest(request)) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const upstream = await requestUpstream(
      request,
      `/admin/session-inventory/${id}`,
      {
        method: "DELETE",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to revoke session." },
      { status: 500 },
    );
  }
}
