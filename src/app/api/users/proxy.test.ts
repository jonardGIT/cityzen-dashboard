import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

describe("users proxy helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards authorization and server API key headers upstream", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.example.test/api/v1");
    vi.stubEnv("API_KEY", "server-api-key");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));

    const { requestUpstream } = await import("@/app/api/users/proxy");

    await requestUpstream(
      {
        headers: new Headers({ authorization: "Bearer token-123" }),
      } as never,
      "/audit-logs",
      { method: "GET" },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.example.test/api/v1/audit-logs",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.any(Headers),
      }),
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("x-api-key")).toBe("server-api-key");
  });

  it("uses the local development API key fallback when no key env is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api/v1");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));

    const { requestUpstream } = await import("@/app/api/users/proxy");

    await requestUpstream(
      {
        headers: new Headers({ authorization: "Bearer token-123" }),
      } as never,
      "/users/capabilities",
      { method: "GET" },
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("x-api-key")).toBe("local-dev-key");
  });

  it("retries fallback paths when the upstream responds with 404", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.example.test/api/v1");
    fetchMock
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "audit-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const { requestUpstreamWithFallback } =
      await import("@/app/api/users/proxy");

    const response = await requestUpstreamWithFallback(
      {
        headers: new Headers({ authorization: "Bearer token-123" }),
      } as never,
      ["/audit-logs/missing", "/audit-logs/audit-1"],
      { method: "GET" },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api.example.test/api/v1/audit-logs/missing",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://api.example.test/api/v1/audit-logs/audit-1",
    );
    expect(response.status).toBe(200);
  });

  it("normalizes non-JSON upstream responses into JSON messages", async () => {
    const { toJsonResponse } = await import("@/app/api/users/proxy");

    const response = await toJsonResponse(
      new Response("Service unavailable", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "Service unavailable",
    });
  });
});
