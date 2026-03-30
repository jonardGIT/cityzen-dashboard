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

  it("limits citizen reads and create to admin roles", () => {
    expect(getCrudEndpoint("citizens", "list")?.allowedRoles).toEqual([
      Role.SUPER_ADMIN,
      Role.ADMIN,
    ]);
    expect(getCrudEndpoint("citizens", "get")?.allowedRoles).toEqual([
      Role.SUPER_ADMIN,
      Role.ADMIN,
    ]);
    expect(getCrudEndpoint("citizens", "create")?.allowedRoles).toEqual([
      Role.SUPER_ADMIN,
      Role.ADMIN,
    ]);
  });
});