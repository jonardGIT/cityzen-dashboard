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

const INCIDENT_PERMISSION_HINTS = [
  "incident:create:self",
  "incident:read:self",
  "incident:update:self",
  "incident:read:assigned",
  "incident:update:assigned",
  "incident:read:region",
  "incident:reassign:region",
  "incident:close:region",
  "incident:read:province",
  "incident:escalate:province",
  "incident:read:city",
  "incident:assign:city",
  "incident:update:priority:city",
  "incident:manage:global",
  "incident:read:global",
];

const ASSIGNMENT_PERMISSION_HINTS = [
  "assignment:create:city",
  "assignment:update:city",
  "assignment:read:own",
];

const AGENCY_PERMISSION_HINTS = [
  "agency:manage:city",
  "agency:manage:province",
  "agency:manage:region",
];

const REFERENCE_DATA_PERMISSION_HINTS = ["reference:manage:city"];

const MOBILE_CONTENT_PERMISSION_HINTS = [
  "mobile_content:create:city",
  "mobile_content:read:city",
  "mobile_content:update:city",
  "mobile_content:publish:city",
  "mobile_content:archive:city",
];

const CRUD_RESOURCE_PERMISSION_HINTS: Partial<
  Record<string, readonly string[]>
> = {
  incidents: INCIDENT_PERMISSION_HINTS,
  assignments: ASSIGNMENT_PERMISSION_HINTS,
  agencies: AGENCY_PERMISSION_HINTS,
  statuses: REFERENCE_DATA_PERMISSION_HINTS,
  categories: REFERENCE_DATA_PERMISSION_HINTS,
  severities: REFERENCE_DATA_PERMISSION_HINTS,
  "mobile-content": MOBILE_CONTENT_PERMISSION_HINTS,
};

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
  if (!capabilities) {
    return false;
  }

  if (
    !Array.isArray(capabilities.permissions) ||
    capabilities.permissions.length === 0
  ) {
    return false;
  }

  return permissionListIncludes(capabilities.permissions, hints);
}

export function canAccessCrudResource(
  context: NavigationContext,
  resourceKey: string,
): boolean {
  const resource = getCrudResource(resourceKey);
  const roleAllows = Boolean(
    resource &&
    canShowCrudNavigationItem(resource, context.role, context.isAuthenticated),
  );

  if (!roleAllows) {
    return false;
  }

  const hints = CRUD_RESOURCE_PERMISSION_HINTS[resourceKey];
  if (!hints) {
    return true;
  }

  return permissionsAllow(context.capabilities, hints);
}

function canAccessCitizenSelfService(context: NavigationContext): boolean {
  return permissionsAllow(
    context.capabilities,
    CITIZEN_SELF_SERVICE_PERMISSION_HINTS,
  );
}

function canAccessIncidents(context: NavigationContext): boolean {
  if (context.role === Role.AUDITOR) {
    return permissionsAllow(context.capabilities, INCIDENT_PERMISSION_HINTS);
  }

  return canAccessCrudResource(context, "incidents");
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
        return (
          canAccessCrudResource(context, "citizens") ||
          (isSelfService && canAccessCitizenSelfService(context))
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
      visible: () => canAccessCrudResource(context, "assignments"),
    },
    {
      key: "/dashboard/agencies",
      label: "Agencies",
      href: "/dashboard/agencies",
      resource: "agencies",
      visible: () => canAccessCrudResource(context, "agencies"),
    },
    {
      key: "/responders",
      label: "Responders",
      href: "/responders",
      resource: "responders",
      visible: () => canAccessCrudResource(context, "responders"),
    },
    {
      key: "/statuses",
      label: "Statuses",
      href: "/statuses",
      resource: "statuses",
      visible: () => canAccessCrudResource(context, "statuses"),
    },
    {
      key: "/categories",
      label: "Categories",
      href: "/categories",
      resource: "categories",
      visible: () => canAccessCrudResource(context, "categories"),
    },
    {
      key: "/severities",
      label: "Severities",
      href: "/severities",
      resource: "severities",
      visible: () => canAccessCrudResource(context, "severities"),
    },
    {
      key: "/dashboard/regions",
      label: "Regions",
      href: "/dashboard/regions",
      resource: "regions",
      visible: () => canAccessCrudResource(context, "regions"),
    },
    {
      key: "/dashboard/provinces",
      label: "Provinces",
      href: "/dashboard/provinces",
      resource: "provinces",
      visible: () => canAccessCrudResource(context, "provinces"),
    },
    {
      key: "/dashboard/cities-municipalities",
      label: "Cities / Municipalities",
      href: "/dashboard/cities-municipalities",
      resource: "cities-municipalities",
      visible: () => canAccessCrudResource(context, "cities-municipalities"),
    },
    {
      key: "/dashboard/barangays",
      label: "Barangays",
      href: "/dashboard/barangays",
      resource: "barangays",
      visible: () => canAccessCrudResource(context, "barangays"),
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
      visible: () => canAccessCrudResource(context, "mobile-content"),
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
