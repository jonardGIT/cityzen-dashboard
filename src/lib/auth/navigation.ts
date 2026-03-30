import { getCrudResource } from "@/features/dynamic-crud/config";
import { canShowCrudNavigationItem } from "@/features/dynamic-crud/permissions";
import { CAN_MANAGE_USERS, CAN_VIEW_AUDIT_LOGS } from "@/lib/auth/permissions";
import {
  getRoleLabel,
  isCitizenSelfServiceUser,
  permissionListIncludes,
} from "@/lib/auth/roles";
import type { Role, UserCapabilities } from "@/types/auth";

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

const AUDIT_PERMISSION_HINTS = [
  "audit:read:global",
  "audit:export:global",
];

const USER_PERMISSION_HINTS = [
  "user:read:global",
  "user:read:department",
  "user:update:department",
  "user:manage:global",
];

const INCIDENT_PERMISSION_HINTS = [
  "incident:read:global",
  "incident:read:department",
  "incident:read:assigned",
  "incident:read:own",
];

const ASSIGNMENT_PERMISSION_HINTS = [
  "assignment:read:global",
  "assignment:read:department",
  "assignment:read:assigned",
  "assignment:create:department",
  "assignment:override:region",
];

const CITIZEN_SELF_SERVICE_PERMISSION_HINTS = [
  "citizen:link:self",
  "incident:create:self",
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
  return permissionsAllow(context.capabilities, CITIZEN_SELF_SERVICE_PERMISSION_HINTS);
}

function canAccessIncidents(context: NavigationContext): boolean {
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

  if (context.capabilities?.canUpdateUser || context.capabilities?.canDeleteUser) {
    return true;
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
        );

        return roleAllows || (isSelfService && canAccessCitizenSelfService(context));
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
        isSelfService && rule.selfServiceHref ? rule.selfServiceHref : rule.href,
      roleLabel: getRoleLabel(context.role),
    }));
}