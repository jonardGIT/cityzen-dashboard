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

import { GET } from "@/app/api/dashboard/audit-logs/[id]/route";

describe("GET /api/dashboard/audit-logs/[id]", () => {
  it("returns the shared unauthorized response when the bearer token is missing", async () => {
    const unauthorized = NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 },
    );
    unauthorizedResponseMock.mockReturnValueOnce(unauthorized);

    const response = await GET(
      {
        headers: new Headers(),
      } as never,
      { params: Promise.resolve({ id: "audit-1" }) },
    );

    expect(response).toBe(unauthorized);
    expect(requestUpstreamMock).not.toHaveBeenCalled();
  });

  it("forwards the audit log id to the upstream API", async () => {
    const upstream = new Response(JSON.stringify({ id: "audit-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const proxied = NextResponse.json({ id: "audit-1" }, { status: 200 });
    requestUpstreamMock.mockResolvedValueOnce(upstream);
    toJsonResponseMock.mockResolvedValueOnce(proxied);

    const request = {
      headers: new Headers({ authorization: "Bearer token" }),
    } as never;

    const response = await GET(request, {
      params: Promise.resolve({ id: "audit-1" }),
    });

    expect(requestUpstreamMock).toHaveBeenCalledWith(
      request,
      "/audit-logs/audit-1",
      { method: "GET" },
    );
    expect(toJsonResponseMock).toHaveBeenCalledWith(upstream);
    expect(response).toBe(proxied);
  });
});
