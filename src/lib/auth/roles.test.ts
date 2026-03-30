import { describe, expect, it } from "vitest";
import {
  getRoleLabel,
  isCitizenSelfServiceUser,
  normalizeCapabilities,
  normalizeRole,
} from "@/lib/auth/roles";
import { Role } from "@/types/auth";

describe("auth role normalization", () => {
  it("maps legacy cached role names to the new backend roles", () => {
    expect(normalizeRole("SUPER_ADMIN")).toBe(Role.SYSTEM_ADMIN);
    expect(normalizeRole("ADMIN")).toBe(Role.DEPARTMENT_MANAGER);
    expect(normalizeRole("VIEWER")).toBe(Role.CITIZEN_REPORTER);
  });

  it("returns human-readable role labels", () => {
    expect(getRoleLabel(Role.SYSTEM_ADMIN)).toBe("System Admin");
    expect(getRoleLabel(Role.CITIZEN_REPORTER)).toBe("Citizen Reporter");
  });

  it("normalizes capabilities and detects self-service access", () => {
    const capabilities = normalizeCapabilities({
      role: "VIEWER",
      permissions: ["incident:create:self", "citizen:link:self"],
      scope: ["self"],
      canUpdateUser: false,
      canDeleteUser: false,
    });

    expect(capabilities.role).toBe(Role.CITIZEN_REPORTER);
    expect(capabilities.permissions).toEqual([
      "incident:create:self",
      "citizen:link:self",
    ]);
    expect(capabilities.scope).toEqual(["self"]);
    expect(isCitizenSelfServiceUser(capabilities.role, capabilities)).toBe(true);
  });
});