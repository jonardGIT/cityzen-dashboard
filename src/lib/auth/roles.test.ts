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
    expect(normalizeRole("system admin")).toBe(Role.SYSTEM_ADMIN);
    expect(normalizeRole("ADMIN")).toBe(Role.DEPARTMENT_MANAGER);
    expect(normalizeRole("VIEWER")).toBe(Role.CITIZEN_REPORTER);
    expect(normalizeRole("SUPERVISOR")).toBe(Role.SUPERVISOR);
    expect(normalizeRole("city content editor")).toBe(Role.CITY_CONTENT_EDITOR);
  });

  it("returns human-readable role labels", () => {
    expect(getRoleLabel(Role.SYSTEM_ADMIN)).toBe("National Admin");
    expect(getRoleLabel(Role.DEPARTMENT_MANAGER)).toBe("City Admin");
    expect(getRoleLabel(Role.SUPERVISOR)).toBe("Provincial Admin");
    expect(getRoleLabel(Role.CITY_CONTENT_EDITOR)).toBe("City Content Editor");
    expect(getRoleLabel(Role.CITIZEN_REPORTER)).toBe("Citizen Reporter");
  });

  it("normalizes capabilities and detects self-service access", () => {
    const capabilities = normalizeCapabilities({
      role: "VIEWER",
      permissions: ["incident:create:self", "citizen:link:self"],
      scope: ["self"],
      canCreateUser: false,
      canUpdateUser: false,
      canDeleteUser: false,
      canManageUsers: false,
    });

    expect(capabilities.role).toBe(Role.CITIZEN_REPORTER);
    expect(capabilities.permissions).toEqual([
      "incident:create:self",
      "citizen:link:self",
    ]);
    expect(capabilities.scope).toEqual(["self"]);
    expect(isCitizenSelfServiceUser(capabilities.role, capabilities)).toBe(
      true,
    );
  });

  it("preserves omitted management booleans during capability normalization", () => {
    const capabilities = normalizeCapabilities({
      role: Role.DEPARTMENT_MANAGER,
      permissions: ["user:create:city"],
      scope: ["city:city-1"],
    });

    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canCreateUser"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canUpdateUser"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canDeleteUser"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canManageUsers"),
    ).toBe(false);
    expect(capabilities.canCreateUser).toBeUndefined();
    expect(capabilities.canUpdateUser).toBeUndefined();
    expect(capabilities.canDeleteUser).toBeUndefined();
    expect(capabilities.canManageUsers).toBeUndefined();
  });

  it("preserves explicit false management booleans during capability normalization", () => {
    const capabilities = normalizeCapabilities({
      role: Role.SUPERVISOR,
      canCreateUser: false,
      canUpdateUser: false,
      canDeleteUser: false,
      canManageUsers: false,
    });

    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canCreateUser"),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canUpdateUser"),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canDeleteUser"),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(capabilities, "canManageUsers"),
    ).toBe(true);
    expect(capabilities.canCreateUser).toBe(false);
    expect(capabilities.canUpdateUser).toBe(false);
    expect(capabilities.canDeleteUser).toBe(false);
    expect(capabilities.canManageUsers).toBe(false);
  });
});
