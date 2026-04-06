import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/lib/api/clients", () => ({
  createAuthenticatedClient: vi.fn(() => ({
    get: getMock,
  })),
}));

import { AuditLogApiClientError, listAuditLogs } from "@/lib/api/auditLogs";
import { fetchAuditLogById, fetchAuditLogs } from "@/features/audit-logs/api";

describe("audit log api client", () => {
  beforeEach(() => {
    getMock.mockReset();
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

  it("normalizes audit list validation failures into a typed error result", async () => {
    getMock.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: "Invalid query parameters.",
          errors: [
            {
              field: "filters[0].operator",
              message: "The contains operator is not supported for statusCode.",
            },
          ],
        },
      },
      message: "Request failed with status code 422",
    });

    const result = await listAuditLogs({
      page: 1,
      pageSize: 20,
      search: "",
      sortBy: "timestamp",
      sortOrder: "desc",
      filters: [{ field: "statusCode", operator: "contains", value: "500" }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      status: 422,
      message: "Invalid query parameters.",
      details: {
        message: "Invalid query parameters.",
        errors: [
          {
            field: "filters[0].operator",
            message: "The contains operator is not supported for statusCode.",
          },
        ],
      },
    });
  });

  it("throws a typed audit client error from the feature-layer fetch wrapper", async () => {
    getMock.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          message: "Forbidden",
        },
      },
      message: "Request failed with status code 403",
    });

    await expect(
      fetchAuditLogs({
        page: 1,
        pageSize: 20,
        search: "",
        sortBy: "timestamp",
        sortOrder: "desc",
        filters: [],
      }),
    ).rejects.toBeInstanceOf(AuditLogApiClientError);
  });
});
