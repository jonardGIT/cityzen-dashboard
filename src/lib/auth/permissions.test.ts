import { describe, expect, it } from "vitest";
import {
  CAN_MANAGE_MFA,
  getAssignableRoles,
  canManageRole,
} from "@/lib/auth/permissions";
import { Role } from "@/types/auth";

describe("auth permissions", () => {
  it("allows only explicit system admin management targets", () => {
    expect(getAssignableRoles(Role.SYSTEM_ADMIN)).toEqual([
      Role.DEPARTMENT_MANAGER,
      Role.SUPERVISOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
    ]);
    expect(canManageRole(Role.SYSTEM_ADMIN, Role.DEPARTMENT_MANAGER)).toBe(true);
    expect(canManageRole(Role.SYSTEM_ADMIN, Role.CITIZEN_REPORTER)).toBe(true);
    expect(canManageRole(Role.SYSTEM_ADMIN, Role.AUDITOR)).toBe(false);
    expect(canManageRole(Role.SYSTEM_ADMIN, Role.SYSTEM_ADMIN)).toBe(false);
  });

  it("allows only explicit department manager management targets", () => {
    expect(getAssignableRoles(Role.DEPARTMENT_MANAGER)).toEqual([
      Role.SUPERVISOR,
      Role.DISPATCHER,
      Role.RESPONDER,
      Role.CITIZEN_REPORTER,
    ]);
    expect(canManageRole(Role.DEPARTMENT_MANAGER, Role.SUPERVISOR)).toBe(true);
    expect(canManageRole(Role.DEPARTMENT_MANAGER, Role.AUDITOR)).toBe(false);
    expect(canManageRole(Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_MANAGER)).toBe(false);
  });

  it("denies user management for non-manager roles", () => {
    expect(getAssignableRoles(Role.AUDITOR)).toEqual([]);
    expect(getAssignableRoles(Role.DISPATCHER)).toEqual([]);
    expect(canManageRole(Role.AUDITOR, Role.CITIZEN_REPORTER)).toBe(false);
    expect(canManageRole(Role.SUPERVISOR, Role.RESPONDER)).toBe(false);
  });

  it("limits MFA management to privileged roles", () => {
    expect(CAN_MANAGE_MFA).toEqual([
      Role.SYSTEM_ADMIN,
      Role.DEPARTMENT_MANAGER,
      Role.DISPATCHER,
    ]);
  });
});