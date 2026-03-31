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
});