import { describe, expect, it } from "vitest";
import {
  CAN_MANAGE_USERS,
  CAN_MANAGE_MFA,
  getAssignableRoles,
  canManageRole,
} from "@/lib/auth/permissions";
import { Role } from "@/types/auth";

describe("auth permissions", () => {
  it("allows national admin management targets", () => {
    expect(getAssignableRoles(Role.NATIONAL_ADMIN)).toEqual([
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.CITY_CONTENT_EDITOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
      Role.AUDITOR,
    ]);
    expect(canManageRole(Role.NATIONAL_ADMIN, Role.REGIONAL_DIRECTOR)).toBe(
      true,
    );
    expect(canManageRole(Role.NATIONAL_ADMIN, Role.CITIZEN_REPORTER)).toBe(
      true,
    );
    expect(canManageRole(Role.NATIONAL_ADMIN, Role.AUDITOR)).toBe(true);
    expect(canManageRole(Role.NATIONAL_ADMIN, Role.NATIONAL_ADMIN)).toBe(false);
  });

  it("allows regional director management targets", () => {
    expect(getAssignableRoles(Role.REGIONAL_DIRECTOR)).toEqual([
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.CITY_CONTENT_EDITOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
    ]);
    expect(canManageRole(Role.REGIONAL_DIRECTOR, Role.PROVINCIAL_ADMIN)).toBe(
      true,
    );
    expect(canManageRole(Role.REGIONAL_DIRECTOR, Role.AUDITOR)).toBe(false);
    expect(canManageRole(Role.REGIONAL_DIRECTOR, Role.REGIONAL_DIRECTOR)).toBe(
      false,
    );
  });

  it("denies user management for non-manager roles", () => {
    expect(CAN_MANAGE_USERS).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
    ]);
    expect(getAssignableRoles(Role.AUDITOR)).toEqual([]);
    expect(getAssignableRoles(Role.CITY_CONTENT_EDITOR)).toEqual([]);
    expect(getAssignableRoles(Role.DISPATCHER)).toEqual([]);
    expect(canManageRole(Role.AUDITOR, Role.CITIZEN_REPORTER)).toBe(false);
    expect(canManageRole(Role.CITY_CONTENT_EDITOR, Role.CITIZEN_REPORTER)).toBe(
      false,
    );
    expect(canManageRole(Role.RESPONDER, Role.DISPATCHER)).toBe(false);
  });

  it("limits MFA management to privileged roles", () => {
    expect(CAN_MANAGE_MFA).toEqual([
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_DIRECTOR,
      Role.PROVINCIAL_ADMIN,
      Role.CITY_ADMIN,
      Role.CITY_CONTENT_EDITOR,
      Role.DISPATCHER,
      Role.AUDITOR,
    ]);
  });
});
