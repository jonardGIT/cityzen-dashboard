import { getCrudResource } from "@/features/dynamic-crud/config";
import { canShowCrudNavigationItem } from "@/features/dynamic-crud/permissions";
import { CAN_MANAGE_USERS, CAN_VIEW_AUDIT_LOGS } from "@/lib/auth/permissions";
import {
  getRoleLabel,
  isCitizenSelfServiceUser,
  permissionListIncludes,
} from "@/lib/auth/roles";
import { Role, type UserCapabilities } from "@/types/auth";

export interface NavigationContext {
  role?: Role;
  capabilities?: UserCapabilities | null;
  isAuthenticated: boolean;
}

export interface NavigationItemDefinition {
  key: string;
  label: string;
  href: string;
  resource?: string;
  selfServiceHref?: string;
  visible: (context: NavigationContext) => boolean;
}

const AUDIT_PERMISSION_HINTS = ["audit:read:global", "audit:export:global"];

const USER_PERMISSION_HINTS = [
  "user:manage:global",
  "user:manage:national",
  "user:create:region",
  "user:update:region",
  "user:delete:region",
  "user:manage:region",
  "user:create:province",
  "user:update:province",
  "user:delete:province",
  "user:manage:province",
  "user:create:city",
  "user:update:city",
  "user:delete:city",
  "user:manage:city",
  "user:create:barangay",
  "user:update:barangay",
  "user:delete:barangay",
  "user:manage:barangay",
];

const STANDARD_INCIDENT_ACCESS_ROLES: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_DIRECTOR,
  Role.PROVINCIAL_ADMIN,
  Role.CITY_ADMIN,
  Role.DISPATCHER,
  Role.RESPONDER,
  Role.CITIZEN_REPORTER,
];

const INCIDENT_PERMISSION_HINTS = [
  "incident:read:global",
  "incident:read:national",
  "incident:read:region",
  "incident:read:province",
  "incident:read:city",
  "incident:read:assigned",
  "incident:read:self",
  "incident:read:own",
];

const ASSIGNMENT_PERMISSION_HINTS = [
  "assignment:read:global",
  "assignment:read:region",
  "assignment:read:province",
  "assignment:read:city",
  "assignment:read:assigned",
  "assignment:create:city",
  "assignment:override:region",
];

const CITIZEN_SELF_SERVICE_PERMISSION_HINTS = [
  "citizen:link:self",
  "incident:create:self",
  "incident:read:self",
  "incident:read:own",
];

function permissionsAllow(
  capabilities: UserCapabilities | null | undefined,
  hints: readonly string[],
): boolean {
  if (!capabilities || capabilities.permissions.length === 0) {
    return true;
  }

  return permissionListIncludes(capabilities.permissions, hints);
}

function canAccessAssignments(context: NavigationContext): boolean {
  const resource = getCrudResource("assignments");
  const roleAllows = Boolean(
    resource &&
    canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
  );

  if (roleAllows) {
    return true;
  }

  return permissionsAllow(context.capabilities, ASSIGNMENT_PERMISSION_HINTS);
}

function canAccessCitizenSelfService(context: NavigationContext): boolean {
  return permissionsAllow(
    context.capabilities,
    CITIZEN_SELF_SERVICE_PERMISSION_HINTS,
  );
}

function canAccessIncidents(context: NavigationContext): boolean {
  if (!context.role || !STANDARD_INCIDENT_ACCESS_ROLES.includes(context.role)) {
    return false;
  }

  const resource = getCrudResource("incidents");
  const roleAllows = Boolean(
    resource &&
    canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
  );

  if (roleAllows) {
    return true;
  }

  return permissionsAllow(context.capabilities, INCIDENT_PERMISSION_HINTS);
}

export function canAccessAuditLogs(context: NavigationContext): boolean {
  if (!context.role || !CAN_VIEW_AUDIT_LOGS.includes(context.role)) {
    return false;
  }

  return permissionsAllow(context.capabilities, AUDIT_PERMISSION_HINTS);
}

export function canAccessUserManagement(context: NavigationContext): boolean {
  if (!context.role || !CAN_MANAGE_USERS.includes(context.role)) {
    return false;
  }

  if (context.capabilities) {
    if (
      context.capabilities.canUpdateUser ||
      context.capabilities.canDeleteUser
    ) {
      return true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        context.capabilities,
        "canUpdateUser",
      ) ||
      Object.prototype.hasOwnProperty.call(
        context.capabilities,
        "canDeleteUser",
      )
    ) {
      return false;
    }
  }

  return permissionsAllow(context.capabilities, USER_PERMISSION_HINTS);
}

export function getNavigationItems(context: NavigationContext) {
  const isSelfService = isCitizenSelfServiceUser(
    context.role,
    context.capabilities,
  );

  const rules: NavigationItemDefinition[] = [
    {
      key: "/dashboard",
      label: "Dashboard",
      href: "/dashboard",
      visible: () => context.isAuthenticated && !isSelfService,
    },
    {
      key: "/citizens",
      label: isSelfService ? "Link Profile" : "Citizens",
      href: "/citizens",
      selfServiceHref: "/dashboard/citizens",
      resource: "citizens",
      visible: () => {
        const resource = getCrudResource("citizens");
        const roleAllows = Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );

        return (
          roleAllows || (isSelfService && canAccessCitizenSelfService(context))
        );
      },
    },
    {
      key: "/incidents",
      label: isSelfService ? "Report Incident" : "Incidents",
      href: "/incidents",
      selfServiceHref: "/dashboard/incidents",
      resource: "incidents",
      visible: () => canAccessIncidents(context),
    },
    {
      key: "/assignments",
      label: "Assignments",
      href: "/assignments",
      resource: "assignments",
      visible: () => canAccessAssignments(context),
    },
    {
      key: "/dashboard/agencies",
      label: "Agencies",
      href: "/dashboard/agencies",
      resource: "agencies",
      visible: () => {
        const resource = getCrudResource("agencies");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/responders",
      label: "Responders",
      href: "/responders",
      resource: "responders",
      visible: () => {
        const resource = getCrudResource("responders");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/statuses",
      label: "Statuses",
      href: "/statuses",
      resource: "statuses",
      visible: () => {
        const resource = getCrudResource("statuses");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/categories",
      label: "Categories",
      href: "/categories",
      resource: "categories",
      visible: () => {
        const resource = getCrudResource("categories");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/severities",
      label: "Severities",
      href: "/severities",
      resource: "severities",
      visible: () => {
        const resource = getCrudResource("severities");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/users",
      label: "Users",
      href: "/users",
      visible: () => canAccessUserManagement(context),
    },
    {
      key: "/dashboard/mobile-content",
      label: "Mobile Content",
      href: "/dashboard/mobile-content",
      resource: "mobile-content",
      visible: () => {
        const resource = getCrudResource("mobile-content");
        return Boolean(
          resource &&
          canShowCrudNavigationItem(
            resource,
            context.role,
            context.isAuthenticated,
          ),
        );
      },
    },
    {
      key: "/audit-logs",
      label: "Audit Logs",
      href: "/audit-logs",
      visible: () => canAccessAuditLogs(context),
    },
    {
      key: "/profile",
      label: "Account Security",
      href: "/profile",
      visible: () => context.isAuthenticated,
    },
  ];

  return rules
    .filter((rule) => rule.visible(context))
    .map((rule) => ({
      ...rule,
      href:
        isSelfService && rule.selfServiceHref
          ? rule.selfServiceHref
          : rule.href,
      roleLabel: getRoleLabel(context.role),
    }));
}
