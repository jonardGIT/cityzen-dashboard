import { Role } from "@/types/auth";

export const CAN_CREATE_INCIDENT: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.DEPARTMENT_MANAGER,
  Role.SUPERVISOR,
  Role.DISPATCHER,
  Role.RESPONDER,
];

export const CAN_VIEW_CITIZENS: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.DEPARTMENT_MANAGER,
];

export const CAN_CREATE_ASSIGNMENT: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.DEPARTMENT_MANAGER,
  Role.SUPERVISOR,
  Role.DISPATCHER,
];

export const CAN_VIEW_AUDIT_LOGS: Role[] = [Role.SYSTEM_ADMIN, Role.AUDITOR];

export const CAN_MANAGE_USERS: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.DEPARTMENT_MANAGER,
];

export const CAN_MANAGE_MFA: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.DEPARTMENT_MANAGER,
  Role.DISPATCHER,
];

const MANAGEABLE_ROLES: Record<Role, Role[]> = {
  [Role.SYSTEM_ADMIN]: [
    Role.DEPARTMENT_MANAGER,
    Role.SUPERVISOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
  ],
  [Role.DEPARTMENT_MANAGER]: [
    Role.SUPERVISOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
  ],
  [Role.SUPERVISOR]: [],
  [Role.DISPATCHER]: [],
  [Role.RESPONDER]: [],
  [Role.CITIZEN_REPORTER]: [],
  [Role.AUDITOR]: [],
};

/**
 * Mirrors the backend's explicit user-management semantics.
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return MANAGEABLE_ROLES[managerRole].includes(targetRole);
}

/**
 * Returns only the roles the current actor can assign or manage according to the backend contract.
 */
export function getAssignableRoles(role: Role): Role[] {
  return [...MANAGEABLE_ROLES[role]];
}
