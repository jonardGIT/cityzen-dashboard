import { describe, expect, it } from "vitest";
import { canAccessAuditLogs, canAccessUserManagement, getNavigationItems } from "@/lib/auth/navigation";
import { Role, type UserCapabilities } from "@/types/auth";

function capabilities(overrides: Partial<UserCapabilities>): UserCapabilities {
  return {
    role: Role.DISPATCHER,
    label: "Dispatcher",
    permissions: [],
    scope: [],
    canUpdateUser: false,
    canDeleteUser: false,
    ...overrides,
  };
}

describe("auth navigation", () => {
  it("shows incidents and audit logs for auditors with incident and audit permissions", () => {
    const auditorCaps = capabilities({
      role: Role.AUDITOR,
      label: "Auditor",
      permissions: ["incident:read", "audit:export"],
      scope: ["global"],
    });

    const items = getNavigationItems({
      role: Role.AUDITOR,
      capabilities: auditorCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/incidents")).toBe(true);
    expect(items.some((item) => item.href === "/audit-logs")).toBe(true);
    expect(items.some((item) => item.href === "/users")).toBe(false);
    expect(canAccessAuditLogs({
      role: Role.AUDITOR,
      capabilities: auditorCaps,
      isAuthenticated: true,
    })).toBe(true);
    expect(canAccessUserManagement({
      role: Role.AUDITOR,
      capabilities: auditorCaps,
      isAuthenticated: true,
    })).toBe(false);
  });

  it("routes citizen reporters to self-service incident and citizen pages", () => {
    const citizenCaps = capabilities({
      role: Role.CITIZEN_REPORTER,
      label: "Citizen Reporter",
      permissions: ["incident:create", "incident:read", "incident:update:own"],
      scope: ["own"],
    });

    const items = getNavigationItems({
      role: Role.CITIZEN_REPORTER,
      capabilities: citizenCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/dashboard/incidents")).toBe(true);
    expect(items.some((item) => item.href === "/dashboard/citizens")).toBe(true);
    expect(items.some((item) => item.href === "/dashboard")).toBe(false);
  });
});