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
  "audit_logs_read",
  "audit_read",
  "audit",
];

const USER_PERMISSION_HINTS = [
  "users_manage",
  "users_read",
  "admin_users",
  "users_capabilities",
];

const INCIDENT_PERMISSION_HINTS = [
  "incident_read",
  "incident_assign",
  "incident_create",
  "incident_update",
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
        return Boolean(
          resource &&
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
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
      visible: () => {
        const resource = getCrudResource("assignments");
        return Boolean(
          resource &&
            canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
        );
      },
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