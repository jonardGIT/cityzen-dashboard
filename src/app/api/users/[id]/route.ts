import { NextRequest, NextResponse } from "next/server";
import {
  getRequestAccessToken,
  requestUpstream,
  requestUpstreamWithFallback,
  toJsonResponse,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasAuthenticatedSession(request: NextRequest) {
  return Boolean(getRequestAccessToken(request));
}

export async function GET(
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
      [`/users/${id}`, `/admin/users/${id}`],
      {
        method: "GET",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch user details." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasAuthenticatedSession(request)) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const payload = await request.json();

    const primaryPath = `/users/${id}`;
    const fallbackPath = `/admin/users/${id}`;
    const primaryPatch = await requestUpstream(request, primaryPath, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (primaryPatch.status === 404) {
      const fallbackPatch = await requestUpstream(request, fallbackPath, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      return toJsonResponse(fallbackPatch);
    }

    if (primaryPatch.status === 405) {
      const fallbackPatch = await requestUpstream(request, fallbackPath, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (fallbackPatch.status !== 404 && fallbackPatch.status !== 405) {
        return toJsonResponse(fallbackPatch);
      }

      const primaryPut = await requestUpstream(request, primaryPath, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      return toJsonResponse(primaryPut);
    }

    return toJsonResponse(primaryPatch);
  } catch {
    return NextResponse.json(
      { message: "Failed to update user." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
      [`/users/${id}`, `/admin/users/${id}`],
      {
        method: "DELETE",
      },
    );

    return toJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "Failed to delete user." },
      { status: 500 },
    );
  }
}
