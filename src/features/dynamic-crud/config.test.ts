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
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("assignments", "get")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
    ]);
  });

  it("opens read-only reference data to the configured read roles", () => {
    expect(getCrudEndpoint("agencies", "list")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("responders", "get")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
    ]);
    expect(getCrudEndpoint("statuses", "list")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
      Role.AUDITOR,
    ]);
  });

  it("limits citizen reads and create to management roles", () => {
    expect(getCrudEndpoint("citizens", "list")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
    ]);
    expect(getCrudEndpoint("citizens", "get")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
    ]);
    expect(getCrudEndpoint("citizens", "create")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
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

  it("extends incident reads to auditors and preserves write restrictions", () => {
    expect(getCrudEndpoint("incidents", "list")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
      Role.AUDITOR,
    ]);
    expect(getCrudEndpoint("incidents", "create")?.allowedRoles).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
      Role.RESPONDER,
    ]);
  });
});
