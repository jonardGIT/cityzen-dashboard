import { describe, expect, it } from "vitest";
import {
  canAccessAuditLogs,
  canManageAssignments,
  canAccessUserManagement,
  getNavigationItems,
} from "@/lib/auth/navigation";
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

function capabilitiesWithoutManagementBooleans(
  overrides: Partial<UserCapabilities>,
): UserCapabilities {
  const next = capabilities(overrides) as UserCapabilities & {
    canUpdateUser?: boolean;
    canDeleteUser?: boolean;
  };

  delete next.canUpdateUser;
  delete next.canDeleteUser;

  return next as UserCapabilities;
}

describe("auth navigation", () => {
  it("shows users navigation for a regional director with explicit management access", () => {
    const regionalDirectorCaps = capabilitiesWithoutManagementBooleans({
      role: Role.REGIONAL_DIRECTOR,
      label: "Regional Director",
      permissions: ["user:manage:global"],
      scope: ["region:region-1"],
    });

    const items = getNavigationItems({
      role: Role.REGIONAL_DIRECTOR,
      capabilities: regionalDirectorCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/users")).toBe(true);
    expect(
      canAccessUserManagement({
        role: Role.REGIONAL_DIRECTOR,
        capabilities: regionalDirectorCaps,
        isAuthenticated: true,
      }),
    ).toBe(true);
  });

  it("shows users navigation for a city admin when the backend returns canManageUsers", () => {
    const cityAdminCaps = capabilities({
      role: Role.CITY_ADMIN,
      label: "City/Municipal Admin",
      permissions: ["user:create:city"],
      scope: ["city:city-1"],
      canManageUsers: true,
    });

    const items = getNavigationItems({
      role: Role.CITY_ADMIN,
      capabilities: cityAdminCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/users")).toBe(true);
    expect(
      canAccessUserManagement({
        role: Role.CITY_ADMIN,
        capabilities: cityAdminCaps,
        isAuthenticated: true,
      }),
    ).toBe(true);
  });

  it("does not treat read-only user permissions as management access when booleans deny it", () => {
    const provincialAdminCaps = capabilities({
      role: Role.PROVINCIAL_ADMIN,
      label: "Provincial Admin",
      permissions: ["user:read:province"],
      scope: ["province:province-1"],
      canUpdateUser: false,
      canDeleteUser: false,
    });

    const items = getNavigationItems({
      role: Role.PROVINCIAL_ADMIN,
      capabilities: provincialAdminCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/users")).toBe(false);
    expect(
      canAccessUserManagement({
        role: Role.PROVINCIAL_ADMIN,
        capabilities: provincialAdminCaps,
        isAuthenticated: true,
      }),
    ).toBe(false);
  });

  it("shows audit logs and the auditor-safe incident list for auditors", () => {
    const auditorCaps = capabilities({
      role: Role.AUDITOR,
      label: "Auditor",
      permissions: ["incident:read:global", "audit:export:global"],
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
    expect(
      canAccessAuditLogs({
        role: Role.AUDITOR,
        capabilities: auditorCaps,
        isAuthenticated: true,
      }),
    ).toBe(true);
    expect(
      canAccessUserManagement({
        role: Role.AUDITOR,
        capabilities: auditorCaps,
        isAuthenticated: true,
      }),
    ).toBe(false);
  });

  it("routes citizen reporters to self-service incident and citizen pages", () => {
    const citizenCaps = capabilities({
      role: Role.CITIZEN_REPORTER,
      label: "Citizen Reporter",
      permissions: [
        "incident:create:self",
        "incident:read:self",
        "citizen:link:self",
      ],
      scope: ["own"],
    });

    const items = getNavigationItems({
      role: Role.CITIZEN_REPORTER,
      capabilities: citizenCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/dashboard/incidents")).toBe(
      true,
    );
    expect(items.some((item) => item.href === "/dashboard/citizens")).toBe(
      true,
    );
    expect(items.some((item) => item.href === "/dashboard")).toBe(false);
    expect(items.some((item) => item.href === "/assignments")).toBe(false);
    expect(items.some((item) => item.href === "/audit-logs")).toBe(false);
  });

  it("hides capability-scoped resource tabs for a national admin with no matching permissions", () => {
    const nationalAdminCaps = capabilities({
      role: Role.NATIONAL_ADMIN,
      label: "National Admin",
      permissions: [],
      scope: ["global"],
      canUpdateUser: true,
      canDeleteUser: true,
    });

    const items = getNavigationItems({
      role: Role.NATIONAL_ADMIN,
      capabilities: nationalAdminCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/incidents")).toBe(false);
    expect(items.some((item) => item.href === "/assignments")).toBe(false);
    expect(items.some((item) => item.href === "/dashboard/agencies")).toBe(
      false,
    );
    expect(items.some((item) => item.href === "/statuses")).toBe(false);
    expect(items.some((item) => item.href === "/categories")).toBe(false);
    expect(items.some((item) => item.href === "/severities")).toBe(false);
    expect(items.some((item) => item.href === "/users")).toBe(true);
  });

  it("keeps dispatch-tier navigation focused on the current pilot resource set", () => {
    const dispatcherCaps = capabilities({
      role: Role.DISPATCHER,
      label: "Dispatcher",
      permissions: [],
      scope: ["city:city-1"],
    });

    const items = getNavigationItems({
      role: Role.DISPATCHER,
      capabilities: dispatcherCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/assignments")).toBe(false);
    expect(items.some((item) => item.href === "/dashboard/agencies")).toBe(
      false,
    );
    expect(items.some((item) => item.href === "/statuses")).toBe(false);
    expect(items.some((item) => item.href === "/dashboard/regions")).toBe(
      false,
    );
    expect(items.some((item) => item.href === "/dashboard/provinces")).toBe(
      false,
    );
    expect(
      items.some((item) => item.href === "/dashboard/cities-municipalities"),
    ).toBe(false);
    expect(items.some((item) => item.href === "/dashboard/barangays")).toBe(
      false,
    );
  });

  it("keeps geography hidden from primary navigation for city-admin pilot operators", () => {
    const cityAdminCaps = capabilities({
      role: Role.CITY_ADMIN,
      label: "City Admin",
      permissions: [
        "incident:read:city",
        "assignment:create:city",
        "user:manage:city",
      ],
      scope: ["city:city-1"],
      canManageUsers: true,
    });

    const items = getNavigationItems({
      role: Role.CITY_ADMIN,
      capabilities: cityAdminCaps,
      isAuthenticated: true,
    });

    expect(items.some((item) => item.href === "/dashboard")).toBe(true);
    expect(items.some((item) => item.href === "/incidents")).toBe(true);
    expect(items.some((item) => item.href === "/assignments")).toBe(true);
    expect(items.some((item) => item.href === "/users")).toBe(true);
    expect(items.some((item) => item.href === "/dashboard/regions")).toBe(
      false,
    );
    expect(items.some((item) => item.href === "/dashboard/provinces")).toBe(
      false,
    );
    expect(
      items.some((item) => item.href === "/dashboard/cities-municipalities"),
    ).toBe(false);
    expect(items.some((item) => item.href === "/dashboard/barangays")).toBe(
      false,
    );
  });

  it("requires assignment management capabilities before showing create actions", () => {
    expect(
      canManageAssignments({
        role: Role.CITY_ADMIN,
        capabilities: capabilities({
          role: Role.CITY_ADMIN,
          label: "City Admin",
          permissions: ["assignment:read:own"],
          scope: ["city:city-1"],
        }),
        isAuthenticated: true,
      }),
    ).toBe(false);

    expect(
      canManageAssignments({
        role: Role.CITY_ADMIN,
        capabilities: capabilities({
          role: Role.CITY_ADMIN,
          label: "City Admin",
          permissions: ["assignment:create:city"],
          scope: ["city:city-1"],
        }),
        isAuthenticated: true,
      }),
    ).toBe(true);
  });
});
