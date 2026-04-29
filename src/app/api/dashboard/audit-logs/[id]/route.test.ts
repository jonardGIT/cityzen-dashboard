import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const {
  hasAuthenticatedRequestMock,
  requestUpstreamMock,
  toJsonResponseMock,
  unauthorizedResponseMock,
} = vi.hoisted(() => ({
  hasAuthenticatedRequestMock: vi.fn(),
  requestUpstreamMock: vi.fn(),
  toJsonResponseMock: vi.fn(),
  unauthorizedResponseMock: vi.fn(),
}));

vi.mock("@/app/api/users/proxy", () => ({
  hasAuthenticatedRequest: hasAuthenticatedRequestMock,
  requestUpstream: requestUpstreamMock,
  toJsonResponse: toJsonResponseMock,
  unauthorizedResponse: unauthorizedResponseMock,
}));

import { GET } from "@/app/api/dashboard/audit-logs/[id]/route";

describe("GET /api/dashboard/audit-logs/[id]", () => {
  beforeEach(() => {
    hasAuthenticatedRequestMock.mockReset();
    requestUpstreamMock.mockReset();
    toJsonResponseMock.mockReset();
    unauthorizedResponseMock.mockReset();
  });

  it("returns the shared unauthorized response when the bearer token is missing", async () => {
    const unauthorized = NextResponse.json(
      { message: "Missing authenticated session." },
      { status: 401 },
    );
    hasAuthenticatedRequestMock.mockReturnValueOnce(false);
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
    hasAuthenticatedRequestMock.mockReturnValueOnce(true);
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

  it("returns a 500 response when the upstream detail request throws", async () => {
    hasAuthenticatedRequestMock.mockReturnValueOnce(true);
    requestUpstreamMock.mockRejectedValueOnce(new Error("network failed"));

    const response = await GET(
      {
        headers: new Headers({ authorization: "Bearer token" }),
      } as never,
      { params: Promise.resolve({ id: "audit-1" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Failed to fetch audit log details.",
    });
  });
});
