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
      search: "",
      sortBy: DEFAULT_SORT_BY,
      sortOrder: DEFAULT_SORT_ORDER,
      filters: [],
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
      search: "citizen",
      sortBy: "updatedAt",
      sortOrder: "asc",
      filters: [
        {
          field: "statusId",
          operator: "equals",
          value: "OPEN",
        },
      ],
      createdFrom: "2026-03-20T00:00:00.000Z",
      createdTo: "2026-03-20T23:59:59.999Z",
      updatedFrom: "2026-03-21T00:00:00.000Z",
      updatedTo: "2026-03-21T23:59:59.999Z",
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 50,
      search: "citizen",
      sortBy: "updatedAt",
      sortOrder: "asc",
      filters:
        '[{"field":"statusId","operator":"equals","value":"OPEN"}]',
      createdFrom: "2026-03-20T00:00:00.000Z",
      createdTo: "2026-03-20T23:59:59.999Z",
      updatedFrom: "2026-03-21T00:00:00.000Z",
      updatedTo: "2026-03-21T23:59:59.999Z",
    });
  });

  it("serializes combined search, filters, sort, and pagination consistently", () => {
    const result = buildListQueryParams({
      page: 3,
      pageSize: 25,
      search: "responder",
      sortBy: "name",
      sortOrder: "desc",
      filters: [
        { field: "name", operator: "contains", value: "alpha" },
        {
          field: "createdAt",
          operator: "between",
          value: [
            "2026-03-01T00:00:00.000Z",
            "2026-03-31T23:59:59.999Z",
          ],
        },
      ],
    });

    expect(result).toEqual({
      page: 3,
      pageSize: 25,
      search: "responder",
      sortBy: "name",
      sortOrder: "desc",
      filters:
        '[{"field":"name","operator":"contains","value":"alpha"},{"field":"createdAt","operator":"between","value":["2026-03-01T00:00:00.000Z","2026-03-31T23:59:59.999Z"]}]',
    });
  });
});
