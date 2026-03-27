import { describe, expect, it } from "vitest";
import { CrudRequestError } from "@/features/dynamic-crud/api-client";
import { extractListQueryValidation } from "@/components/crud/list-query-validation";

describe("extractListQueryValidation", () => {
  it("maps indexed filter validation errors back to the active field", () => {
    const error = new CrudRequestError(422, "Invalid query parameters.", {
      message: "Invalid query parameters.",
      errors: [
        {
          field: "filters[0].operator",
          message: "The contains operator is not supported for name.",
        },
      ],
    });

    const result = extractListQueryValidation(
      error,
      [{ field: "name", operator: "contains", value: "Alpha" }],
      "createdAt",
    );

    expect(result).toEqual({
      message: "Invalid query parameters.",
      generalErrors: [],
      filterErrorsByField: {
        name: ["The contains operator is not supported for name."],
      },
      sortErrorsByField: {},
    });
  });

  it("maps sort validation errors to the active sort field", () => {
    const error = new CrudRequestError(422, "Invalid sort.", {
      message: "Invalid sort.",
      errors: [{ field: "sortBy", message: "name cannot be sorted." }],
    });

    const result = extractListQueryValidation(error, [], "name");

    expect(result).toEqual({
      message: "Invalid sort.",
      generalErrors: [],
      filterErrorsByField: {},
      sortErrorsByField: { name: ["name cannot be sorted."] },
    });
  });
});