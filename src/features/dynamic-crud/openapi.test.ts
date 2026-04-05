import { describe, expect, it } from "vitest";
import {
  collectOpenApiOperationKeys,
  isCrudEndpointAvailableInOpenApi,
} from "@/features/dynamic-crud/openapi";

describe("dynamic crud OpenAPI helpers", () => {
  it("collects operation keys from an OpenAPI paths object", () => {
    expect(
      collectOpenApiOperationKeys({
        paths: {
          "/incidents": { get: {}, post: {} },
          "/incidents/{id}/restore": { post: {} },
        },
      }),
    ).toEqual([
      "GET /incidents",
      "POST /incidents",
      "POST /incidents/{id}/restore",
    ]);
  });

  it("treats feature-gated endpoints as unavailable when omitted from the active spec", () => {
    expect(
      isCrudEndpointAvailableInOpenApi(
        {
          method: "POST",
          path: "/incidents/media/upload",
          featureGate: {
            feature: "mediaStorage",
            requires: "supabase-storage",
          },
        },
        ["GET /incidents"],
      ),
    ).toBe(false);
  });

  it("supports feature-gated auth optional endpoints", () => {
    expect(
      isCrudEndpointAvailableInOpenApi(
        {
          method: "POST",
          path: "/auth/mfa/setup",
          featureGate: {
            feature: "mfaMode",
            requiresAnyOf: ["local-totp", "supabase-totp"],
          },
        },
        ["GET /auth/me"],
      ),
    ).toBe(false);
  });
});
