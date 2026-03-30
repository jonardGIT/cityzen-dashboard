import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { requestUpstreamMock, toJsonResponseMock, unauthorizedResponseMock } =
  vi.hoisted(() => ({
    requestUpstreamMock: vi.fn(),
    toJsonResponseMock: vi.fn(),
    unauthorizedResponseMock: vi.fn(),
  }));

vi.mock("@/app/api/users/proxy", () => ({
  requestUpstream: requestUpstreamMock,
  toJsonResponse: toJsonResponseMock,
  unauthorizedResponse: unauthorizedResponseMock,
}));

import { GET } from "@/app/api/dashboard/audit-logs/route";

describe("GET /api/dashboard/audit-logs", () => {
  it("returns the shared unauthorized response when the bearer token is missing", async () => {
    const unauthorized = NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 },
    );
    unauthorizedResponseMock.mockReturnValueOnce(unauthorized);

    const response = await GET({
      headers: new Headers(),
      nextUrl: new URL("http://localhost:3001/api/dashboard/audit-logs"),
    } as never);

    expect(response).toBe(unauthorized);
    expect(requestUpstreamMock).not.toHaveBeenCalled();
  });

  it("forwards the audit list query string to the upstream API", async () => {
    const upstream = new Response(
      JSON.stringify({ data: [], pagination: {} }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
    const proxied = NextResponse.json(
      { data: [], pagination: {} },
      { status: 200 },
    );
    requestUpstreamMock.mockResolvedValueOnce(upstream);
    toJsonResponseMock.mockResolvedValueOnce(proxied);

    const request = {
      headers: new Headers({ authorization: "Bearer token" }),
      nextUrl: new URL(
        "http://localhost:3001/api/dashboard/audit-logs?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc",
      ),
    } as never;

    const response = await GET(request);

    expect(requestUpstreamMock).toHaveBeenCalledWith(
      request,
      "/audit-logs?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc",
      { method: "GET" },
    );
    expect(toJsonResponseMock).toHaveBeenCalledWith(upstream);
    expect(response).toBe(proxied);
  });
});
