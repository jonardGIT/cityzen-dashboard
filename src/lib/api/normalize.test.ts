import { describe, expect, it } from "vitest";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";

describe("api normalization", () => {
  it("unwraps list payloads from common backend container keys", () => {
    expect(unwrapListResponse([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(unwrapListResponse({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(unwrapListResponse({ items: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(unwrapListResponse({ results: [{ id: 4 }] })).toEqual([{ id: 4 }]);
    expect(unwrapListResponse({ value: [{ id: 5 }] })).toEqual([{ id: 5 }]);
  });

  it("returns an empty list when no array container is present", () => {
    expect(unwrapListResponse(null)).toEqual([]);
    expect(unwrapListResponse({ data: { id: 1 } })).toEqual([]);
    expect(unwrapListResponse({ item: [{ id: 1 }] })).toEqual([]);
  });

  it("unwraps entity payloads from common backend container keys", () => {
    expect(unwrapEntityResponse({ id: 1 })).toEqual({ id: 1 });
    expect(unwrapEntityResponse({ data: { id: 2 } })).toEqual({ id: 2 });
    expect(unwrapEntityResponse({ item: { id: 3 } })).toEqual({ id: 3 });
    expect(unwrapEntityResponse({ result: { id: 4 } })).toEqual({ id: 4 });
    expect(unwrapEntityResponse({ value: { id: 5 } })).toEqual({ id: 5 });
  });

  it("falls back to the original entity payload when no object container exists", () => {
    expect(unwrapEntityResponse("raw-value")).toBe("raw-value");
    expect(unwrapEntityResponse({ data: ["not-an-object"] })).toEqual({
      data: ["not-an-object"],
    });
  });
});