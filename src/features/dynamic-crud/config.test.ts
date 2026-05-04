import { describe, expect, it } from "vitest";
import {
  getCrudConfig,
  getCrudEndpoint,
  getCrudResource,
} from "@/features/dynamic-crud/config";
import { Role } from "@/types/auth";

describe("dynamic crud config", () => {
  it("keeps pilot metadata synced from the API contract", () => {
    expect(getCrudConfig().pilot).toEqual({
      scope: "tuguegarao-first",
      partnerLguExpansion: "planned",
      governanceBaselineDoc: "docs/tuguegarao-pilot-governance-baseline.md",
      notes:
        "CIRS pilot is Tuguegarao-first. City and barangay operations are the canonical scope; partner-LGU expansion is planned. National roles and surfaces are deferred until formal regional governance is enabled. Dashboard and mobile clients should treat this contract as the source of truth for canonical vs compatibility-only routes.",
    });
  });

  it("requires auth for protected resource reads", () => {
    const protectedReads = [
      ["agencies", "list"],
      ["agencies", "get"],
      ["responders", "list"],
      ["responders", "get"],
      ["statuses", "list"],
      ["statuses", "get"],
      ["categories", "list"],
      ["categories", "get"],
      ["severities", "list"],
      ["severities", "get"],
      ["assignments", "list"],
      ["assignments", "get"],
      ["users", "list"],
      ["users", "capabilities"],
      ["adminUsers", "list"],
      ["auditLogs", "list"],
    ] as const;

    for (const [resource, operation] of protectedReads) {
      expect(getCrudEndpoint(resource, operation)?.authRequired).toBe(true);
    }
  });

  it("limits assignment reads to the operational assignment roles", () => {
    expect(getCrudEndpoint("assignments", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("assignments", "get")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
    ]);
  });

  it("opens read-only reference data to the configured read roles", () => {
    expect(getCrudEndpoint("agencies", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("responders", "get")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("statuses", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.CITY_CONTENT_EDITOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
      Role.AUDITOR,
    ]);
  });

  it("limits citizen reads and create to management roles", () => {
    expect(getCrudEndpoint("citizens", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
    expect(getCrudEndpoint("citizens", "get")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
    expect(getCrudEndpoint("citizens", "create")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
  });

  it("keeps pilot admin and audit resources aligned to the API contract", () => {
    expect(getCrudEndpoint("adminUsers", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
    ]);
    expect(
      getCrudEndpoint("adminUserMfaCompliance", "list")?.allowedRoles,
    ).toEqual([Role.NATIONAL_ADMIN]);
    expect(
      getCrudEndpoint("adminUserAccessReview", "list")?.allowedRoles,
    ).toEqual([Role.NATIONAL_ADMIN]);
    expect(
      getCrudEndpoint("adminSecurityDataGovernance", "get")?.allowedRoles,
    ).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.AUDITOR,
    ]);
    expect(getCrudEndpoint("auditLogs", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.AUDITOR,
    ]);
  });

  it("exposes restore endpoints for soft-deletable resources", () => {
    expect(getCrudEndpoint("citizens", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("agencies", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("responders", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("statuses", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("categories", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("severities", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("incidents", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("assignments", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("users", "restore")?.method).toBe("POST");
  });

  it("keeps incident reads on standard operational roles and preserves write restrictions", () => {
    expect(getCrudEndpoint("incidents", "list")?.allowedRoles).toEqual([
      Role.CITIZEN_REPORTER,
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
      Role.RESPONDER,
    ]);
    expect(getCrudEndpoint("incidents", "create")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
    ]);
  });

  it("keeps dashboard user reads at the LGU admin boundary", () => {
    expect(getCrudEndpoint("users", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
    expect(getCrudEndpoint("users", "capabilities")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.CITY_CONTENT_EDITOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
      Role.AUDITOR,
    ]);
  });

  it("does not expose mobile citizen endpoints as dashboard CRUD resources", () => {
    expect(getCrudResource("mobileCitizen")).toBeUndefined();
    expect(getCrudEndpoint("mobileCitizen", "reportIncident")).toBeUndefined();
    expect(getCrudEndpoint("mobileCitizen", "linkMeAlias")).toBeUndefined();
  });
});
