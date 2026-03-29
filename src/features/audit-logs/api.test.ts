import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getMock,
  requestUseMock,
  responseUseMock,
  clearAuthStorageMock,
  getAccessTokenMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  requestUseMock: vi.fn(),
  responseUseMock: vi.fn(),
  clearAuthStorageMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: getMock,
      interceptors: {
        request: { use: requestUseMock },
        response: { use: responseUseMock },
      },
    })),
  },
  AxiosError: class AxiosError extends Error {},
}));

vi.mock("@/lib/auth/token-storage", () => ({
  clearAuthStorage: clearAuthStorageMock,
  getAccessToken: getAccessTokenMock,
}));

import { fetchAuditLogById, fetchAuditLogs } from "@/features/audit-logs/api";

describe("audit log api client", () => {
  beforeEach(() => {
    getMock.mockReset();
    clearAuthStorageMock.mockReset();
    getAccessTokenMock.mockReset();
  });

  it("requests paginated audit logs with the shared list-query contract", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [{ id: "audit-1", action: "login" }],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const result = await fetchAuditLogs({
      page: 1,
      pageSize: 20,
      search: "",
      sortBy: "timestamp",
      sortOrder: "desc",
      filters: [],
    });

    expect(getMock).toHaveBeenCalledWith("/audit-logs", {
      params: {
        page: 1,
        pageSize: 20,
        sortBy: "timestamp",
        sortOrder: "desc",
      },
      signal: undefined,
    });
    expect(result).toEqual({
      data: [{ id: "audit-1", action: "login" }],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  it("unwraps audit log detail responses", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          id: "audit-2",
          action: "delete",
          summary: "delete users succeeded",
        },
      },
    });

    const result = await fetchAuditLogById("audit-2");

    expect(getMock).toHaveBeenCalledWith("/audit-logs/audit-2", {
      signal: undefined,
    });
    expect(result).toEqual({
      id: "audit-2",
      action: "delete",
      summary: "delete users succeeded",
    });
  });

  it("adds the bearer token on requests and clears auth on unauthorized responses", async () => {
    getAccessTokenMock.mockReturnValue("jwt-token");

    const requestInterceptor = requestUseMock.mock.calls[0]?.[0] as
      | ((config: { headers: Record<string, string> }) => {
          headers: Record<string, string>;
        })
      | undefined;
    const responseRejected = responseUseMock.mock.calls[0]?.[1] as
      | ((error: { response?: { status?: number } }) => Promise<never>)
      | undefined;

    const config = requestInterceptor?.({ headers: {} });
    expect(config?.headers.Authorization).toBe("Bearer jwt-token");

    await expect(
      responseRejected?.({ response: { status: 401 } }),
    ).rejects.toEqual({ response: { status: 401 } });
    expect(clearAuthStorageMock).toHaveBeenCalledTimes(1);
  });
});
