import { Role } from "@/types/auth";

export const CAN_CREATE_INCIDENT: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
  Role.DISPATCHER,
];

export const CAN_UPDATE_INCIDENT: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
  Role.DISPATCHER,
  Role.RESPONDER,
];

export const CAN_VIEW_CITIZENS: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
];

export const CAN_CREATE_ASSIGNMENT: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
  Role.DISPATCHER,
];

export const CAN_VIEW_AUDIT_LOGS: Role[] = [Role.NATIONAL_ADMIN, Role.AUDITOR];

export const CAN_MANAGE_MFA: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
  Role.CITY_CONTENT_EDITOR,
  Role.DISPATCHER,
  Role.AUDITOR,
];

export const CAN_MANAGE_USERS: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
];

const MANAGEABLE_ROLES: Record<Role, Role[]> = {
  [Role.NATIONAL_ADMIN]: [
    Role.REGIONAL_DIRECTOR,
    Role.PROVINCIAL_ADMIN,
    Role.CITY_ADMIN,
    Role.CITY_CONTENT_EDITOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
    Role.AUDITOR,
  ],
  [Role.REGIONAL_DIRECTOR]: [
    Role.PROVINCIAL_ADMIN,
    Role.CITY_ADMIN,
    Role.CITY_CONTENT_EDITOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
  ],
  [Role.PROVINCIAL_ADMIN]: [
    Role.CITY_ADMIN,
    Role.CITY_CONTENT_EDITOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
  ],
  [Role.CITY_ADMIN]: [
    Role.CITY_CONTENT_EDITOR,
    Role.DISPATCHER,
    Role.RESPONDER,
    Role.CITIZEN_REPORTER,
  ],
  [Role.CITY_CONTENT_EDITOR]: [],
  [Role.DISPATCHER]: [],
  [Role.RESPONDER]: [],
  [Role.CITIZEN_REPORTER]: [],
  [Role.AUDITOR]: [],
};

/**
 * Mirrors the backend's explicit user-management semantics.
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return (MANAGEABLE_ROLES[managerRole] ?? []).includes(targetRole);
}

/**
 * Returns only the roles the current actor can assign or manage according to the backend contract.
 */
export function getAssignableRoles(role: Role): Role[] {
  return [...(MANAGEABLE_ROLES[role] ?? [])];
}
