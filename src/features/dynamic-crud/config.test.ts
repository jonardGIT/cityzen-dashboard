import { describe, expect, it } from "vitest";
import { getCrudEndpoint } from "@/features/dynamic-crud/config";
import { Role } from "@/types/auth";

describe("dynamic crud config", () => {
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
      ["regions", "list"],
      ["regions", "get"],
      ["provinces", "list"],
      ["provinces", "get"],
      ["cities-municipalities", "list"],
      ["cities-municipalities", "get"],
      ["barangays", "list"],
      ["barangays", "get"],
      ["assignments", "list"],
      ["assignments", "get"],
      ["users", "capabilities"],
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

  it("keeps geography reads open to configured operational roles and splits writes by level", () => {
    const geographyReadRoles = [
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
      Role.AUDITOR,
    ];

    expect(getCrudEndpoint("regions", "list")?.allowedRoles).toEqual(
      geographyReadRoles,
    );
    expect(getCrudEndpoint("provinces", "get")?.allowedRoles).toEqual(
      geographyReadRoles,
    );
    expect(
      getCrudEndpoint("cities-municipalities", "list")?.allowedRoles,
    ).toEqual(geographyReadRoles);
    expect(getCrudEndpoint("barangays", "get")?.allowedRoles).toEqual(
      geographyReadRoles,
    );

    expect(getCrudEndpoint("regions", "create")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
    ]);
    expect(getCrudEndpoint("provinces", "update")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
    ]);
    expect(
      getCrudEndpoint("cities-municipalities", "create")?.allowedRoles,
    ).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
    ]);
    expect(getCrudEndpoint("barangays", "update")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
  });

  it("exposes restore endpoints for soft-deletable resources", () => {
    expect(getCrudEndpoint("citizens", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("agencies", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("responders", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("statuses", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("categories", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("severities", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("regions", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("provinces", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("cities-municipalities", "restore")?.method).toBe(
      "POST",
    );
    expect(getCrudEndpoint("barangays", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("incidents", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("assignments", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("users", "restore")?.method).toBe("POST");
    expect(getCrudEndpoint("mobile-content", "restore")?.method).toBe("POST");
  });

  it("keeps incident reads on standard operational roles and preserves write restrictions", () => {
    expect(getCrudEndpoint("incidents", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
    ]);
    expect(getCrudEndpoint("incidents", "create")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.DISPATCHER,
      Role.RESPONDER,
    ]);
  });

  it("exposes mobile-content CRUD to admin roles", () => {
    expect(getCrudEndpoint("mobile-content", "list")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
    expect(getCrudEndpoint("mobile-content", "create")?.allowedRoles).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
  });
});
