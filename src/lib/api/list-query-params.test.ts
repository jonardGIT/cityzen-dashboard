import { describe, expect, it } from "vitest";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  buildListQueryParams,
} from "@/lib/api/list-query-params";

describe("buildListQueryParams", () => {
  it("always includes explicit pagination and sort values", () => {
    const result = buildListQueryParams({
      page: 1,
      pageSize: 20,
      sortBy: DEFAULT_SORT_BY,
      sortOrder: DEFAULT_SORT_ORDER,
    });

    expect(result).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("serializes timestamp range filters when provided", () => {
    const result = buildListQueryParams({
      page: 2,
      pageSize: 50,
      sortBy: "updatedAt",
      sortOrder: "asc",
      createdFrom: "2026-03-20T00:00:00.000Z",
      createdTo: "2026-03-20T23:59:59.999Z",
      updatedFrom: "2026-03-21T00:00:00.000Z",
      updatedTo: "2026-03-21T23:59:59.999Z",
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 50,
      sortBy: "updatedAt",
      sortOrder: "asc",
      createdFrom: "2026-03-20T00:00:00.000Z",
      createdTo: "2026-03-20T23:59:59.999Z",
      updatedFrom: "2026-03-21T00:00:00.000Z",
      updatedTo: "2026-03-21T23:59:59.999Z",
    });
  });
});
