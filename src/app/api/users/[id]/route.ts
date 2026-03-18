import { NextRequest, NextResponse } from "next/server";
import {
  requestUpstream,
  requestUpstreamWithFallback,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!request.headers.get("authorization")) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const payload = await request.json();

    const upstreamPatch = await requestUpstreamWithFallback(
      request,
      [`/admin/users/${id}`, `/users/${id}`],
      {
      method: "PATCH",
      body: JSON.stringify(payload),
      },
    );

    if (upstreamPatch.status !== 404 && upstreamPatch.status !== 405) {
      return toJsonResponse(upstreamPatch);
    }

    if (upstreamPatch.status === 404) {
      return NextResponse.json(
        {
          message: "User update endpoint is not available in the connected backend.",
        },
        { status: 501 },
      );
    }

    const upstreamPut =
      upstreamPatch.url.includes("/admin/users/")
        ? await requestUpstream(request, `/admin/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await requestUpstream(request, `/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });

    return toJsonResponse(upstreamPut);
  } catch {
    return NextResponse.json({ message: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!request.headers.get("authorization")) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const upstream = await requestUpstreamWithFallback(
      request,
      [`/admin/users/${id}`, `/users/${id}`],
      {
        method: "DELETE",
      },
    );

    if (upstream.status === 404) {
      return NextResponse.json(
        {
          message: "User delete endpoint is not available in the connected backend.",
        },
        { status: 501 },
      );
    }

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json({ message: "Failed to delete user." }, { status: 500 });
  }
}
