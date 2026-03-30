import { Role } from "@/types/auth";

export const CAN_CREATE_INCIDENT: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.DISPATCHER,
  Role.RESPONDER,
];

export const CAN_VIEW_CITIZENS: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

export const CAN_CREATE_ASSIGNMENT: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.DISPATCHER,
];

export const CAN_VIEW_AUDIT_LOGS: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

export const CAN_MANAGE_USERS: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

export const CAN_MANAGE_MFA: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.DISPATCHER,
];

/**
 * Role hierarchy levels. Higher numbers indicate higher privilege.
 * Users can only create, edit, or delete users with strictly lower privilege levels.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 5,
  [Role.ADMIN]: 4,
  [Role.DISPATCHER]: 3,
  [Role.RESPONDER]: 2,
  [Role.VIEWER]: 1,
};

/**
 * Determine if a user can manage another user based on role hierarchy.
 * @param managerRole The role attempting to manage
 * @param targetRole The role being managed
 * @returns true if manager has a higher privilege level than target
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get assignable roles for a given role.
 * Users can only assign roles strictly lower than their own.
 */
export function getAssignableRoles(role: Role): Role[] {
  const managerLevel = ROLE_HIERARCHY[role];
  return Object.values(Role).filter((r) => ROLE_HIERARCHY[r] < managerLevel);
}
