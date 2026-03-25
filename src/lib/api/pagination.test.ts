import { describe, expect, it } from "vitest";
import { adaptPaginatedResponse } from "@/lib/api/pagination";

describe("adaptPaginatedResponse", () => {
  it("adapts legacy array payloads", () => {
    const result = adaptPaginatedResponse([{ id: 1 }, { id: 2 }], 2, 25);

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 25,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it("uses pagination metadata when provided", () => {
    const result = adaptPaginatedResponse(
      {
        data: [{ id: 1 }],
        pagination: {
          page: 3,
          pageSize: 10,
          total: 45,
          totalPages: 5,
          hasNextPage: true,
          hasPrevPage: true,
        },
      },
      1,
      10,
    );

    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.total).toBe(45);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPrevPage).toBe(true);
  });

  it("falls back when payload is object without metadata", () => {
    const result = adaptPaginatedResponse({ data: [{ id: "a" }, { id: "b" }] }, 1, 10);

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it("returns empty data when payload is invalid", () => {
    const result = adaptPaginatedResponse(null, 1, 10);

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});
