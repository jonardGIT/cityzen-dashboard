import { describe, expect, it } from "vitest";
import {
  collectContractDriftIssues,
  collectOpenApiOperationKeys,
  getCheckedInOpenApiOperationKeys,
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

  it("includes documented auth operations in the checked-in contract", () => {
    expect(getCheckedInOpenApiOperationKeys()).toEqual(
      expect.arrayContaining([
        "POST /auth/password-reset/request",
        "POST /auth/password-reset/confirm",
        "POST /auth/mfa/setup",
        "POST /auth/mfa/enable",
        "POST /auth/mfa/disable",
      ]),
    );
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

  it("treats feature-gated endpoints as unavailable until operation keys load", () => {
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
        undefined,
      ),
    ).toBe(false);
  });

  it("treats feature-gated endpoints as available once the active spec includes them", () => {
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
        ["POST /incidents/media/upload"],
      ),
    ).toBe(true);
  });

  it("keeps non-gated endpoints available before operation keys load", () => {
    expect(
      isCrudEndpointAvailableInOpenApi(
        {
          method: "GET",
          path: "/citizens",
        },
        undefined,
      ),
    ).toBe(true);
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

  it("reports active config operations that are missing from the active spec", () => {
    expect(collectContractDriftIssues(["GET /citizens"])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing-active-config-operation",
          operationKey: "GET /citizens/{id}",
        }),
      ]),
    );
  });

  it("reports active OpenAPI operations that belong to configured resources but are absent from config", () => {
    expect(
      collectContractDriftIssues([
        "GET /citizens",
        "GET /citizens/{id}",
        "POST /citizens",
        "POST /citizens/link-me",
        "PATCH /citizens/{id}",
        "DELETE /citizens/{id}",
        "GET /citizens/export",
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "unconfigured-openapi-operation",
          operationKey: "GET /citizens/export",
        }),
      ]),
    );
  });

  it("includes mobile-content operations in the checked-in contract", () => {
    expect(getCheckedInOpenApiOperationKeys()).toEqual(
      expect.arrayContaining([
        "GET /mobile-content",
        "POST /mobile-content",
        "PATCH /mobile-content/{id}",
      ]),
    );
  });
});
