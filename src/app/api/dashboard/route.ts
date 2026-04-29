import { NextRequest, NextResponse } from "next/server";
import { unwrapListResponse } from "@/lib/api/normalize";
import {
  hasAuthenticatedRequest,
  requestUpstream,
  requestUpstreamWithFallback,
  unauthorizedResponse,
} from "@/app/api/users/proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardListResult<T> =
  | { data: T[]; error?: never }
  | { data?: never; error: NextResponse };

async function parseUpstreamList<T>(
  response: Response,
): Promise<DashboardListResult<T>> {
  if (response.status === 404) {
    return { data: [] };
  }

  if (!response.ok) {
    const raw = await response.text();
    let details: unknown;

    if (raw) {
      try {
        details = JSON.parse(raw) as unknown;
      } catch {
        details = { message: raw };
      }
    }

    const payload =
      typeof details === "object" && details !== null ? details : undefined;
    const message =
      payload && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed with ${response.status}`;

    return {
      error: NextResponse.json(
        {
          message,
          status: response.status,
          details: payload,
        },
        { status: response.status },
      ),
    };
  }

  const data = (await response.json()) as unknown;
  return { data: unwrapListResponse<T>(data) };
}

export async function GET(request: NextRequest) {
  if (!hasAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const [
      incidents,
      assignments,
      responders,
      statuses,
      categories,
      severities,
      users,
    ] = await Promise.all([
      requestUpstream(request, "/incidents", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstream(request, "/assignments", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstream(request, "/responders", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstream(request, "/statuses", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstream(request, "/categories", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstream(request, "/severities", { method: "GET" }).then(
        parseUpstreamList,
      ),
      requestUpstreamWithFallback(request, ["/users"], { method: "GET" }).then(
        parseUpstreamList,
      ),
    ]);

    const failedResult = [
      incidents,
      assignments,
      responders,
      statuses,
      categories,
      severities,
      users,
    ].find((result) => "error" in result);

    if (failedResult && "error" in failedResult) {
      return failedResult.error;
    }

    return NextResponse.json({
      incidents: incidents.data,
      assignments: assignments.data,
      responders: responders.data,
      statuses: statuses.data,
      categories: categories.data,
      severities: severities.data,
      users: users.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to load CIRS dashboard data.",
      },
      { status: 500 },
    );
  }
}
