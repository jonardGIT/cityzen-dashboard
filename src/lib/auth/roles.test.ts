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
    expect(normalizeRole("SUPER_ADMIN")).toBe(Role.NATIONAL_ADMIN);
    expect(normalizeRole("system admin")).toBe(Role.NATIONAL_ADMIN);
    expect(normalizeRole("ADMIN")).toBe(Role.CITY_ADMIN);
    expect(normalizeRole("VIEWER")).toBe(Role.CITIZEN_REPORTER);
    expect(normalizeRole("SUPERVISOR")).toBe(Role.PROVINCIAL_ADMIN);
    expect(normalizeRole("city content editor")).toBe(Role.CITY_CONTENT_EDITOR);
  });

  it("returns human-readable role labels", () => {
    expect(getRoleLabel(Role.NATIONAL_ADMIN)).toBe("National Admin");
    expect(getRoleLabel(Role.CITY_ADMIN)).toBe("City/Municipal Admin");
    expect(getRoleLabel(Role.CITY_CONTENT_EDITOR)).toBe("City Content Editor");
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
    expect(isCitizenSelfServiceUser(capabilities.role, capabilities)).toBe(
      true,
    );
  });
});
