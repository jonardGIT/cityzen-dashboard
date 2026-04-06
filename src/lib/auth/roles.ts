import {
  Role,
  type AuthResponse,
  type AuthUser,
  type LegacyRole,
  type UserCapabilities,
} from "@/types/auth";

const LEGACY_ROLE_MAP: Record<LegacyRole, Role> = {
  SUPER_ADMIN: Role.SYSTEM_ADMIN,
  ADMIN: Role.DEPARTMENT_MANAGER,
  VIEWER: Role.CITIZEN_REPORTER,
};

const ROLE_LABELS: Record<Role, string> = {
  [Role.SYSTEM_ADMIN]: "System Admin",
  [Role.DEPARTMENT_MANAGER]: "Department Manager",
  [Role.SUPERVISOR]: "Supervisor",
  [Role.DISPATCHER]: "Dispatcher",
  [Role.RESPONDER]: "Responder",
  [Role.CITIZEN_REPORTER]: "Citizen Reporter",
  [Role.AUDITOR]: "Auditor",
};

const SELF_SERVICE_SCOPE_HINTS = ["self", "own", "citizen", "reporter"];

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

export function normalizePermissionKey(value: string): string {
  return normalizeToken(value);
}

function normalizeStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((entry) => normalizeStringList(entry))
    .filter((entry, index, collection) => collection.indexOf(entry) === index);
}

function collectScopeTokens(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectScopeTokens(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, entry]) => {
      if (typeof entry === "boolean") {
        return entry ? [key] : [];
      }

      return [key, ...collectScopeTokens(entry)];
    },
  );
}

export function normalizeRole(value: unknown): Role | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if ((Object.values(Role) as string[]).includes(trimmed)) {
    return trimmed as Role;
  }

  if (
    (Object.keys(LEGACY_ROLE_MAP) as LegacyRole[]).includes(
      trimmed as LegacyRole,
    )
  ) {
    return LEGACY_ROLE_MAP[trimmed as LegacyRole];
  }

  return undefined;
}

export function normalizeRoleList(values: readonly unknown[]): Role[] {
  const roles = values
    .map((value) => normalizeRole(value))
    .filter((value): value is Role => Boolean(value));

  return roles.filter((value, index) => roles.indexOf(value) === index);
}

export function getRoleLabel(value: unknown): string {
  const normalized = normalizeRole(value);

  if (normalized) {
    return ROLE_LABELS[normalized];
  }

  if (typeof value !== "string") {
    return "Unknown Role";
  }

  return value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeAuthUser(user: AuthUser): AuthUser {
  const normalizedRole = normalizeRole(user.role) ?? Role.CITIZEN_REPORTER;

  return {
    ...user,
    role: normalizedRole,
  };
}

export function normalizeAuthResponse(response: AuthResponse): AuthResponse {
  const normalizedToken = response.token || response.accessToken || "";

  return {
    ...response,
    token: normalizedToken,
    accessToken: normalizedToken,
    tokenType: response.tokenType || "Bearer",
    user: normalizeAuthUser(response.user),
  };
}

export function normalizeCapabilities(
  value: unknown,
  fallbackRole?: unknown,
): UserCapabilities {
  const payload = (value ?? {}) as Partial<UserCapabilities> & {
    role?: unknown;
    label?: unknown;
    permissions?: unknown;
    scope?: unknown;
  };
  const role =
    normalizeRole(payload.role) ??
    normalizeRole(fallbackRole) ??
    Role.CITIZEN_REPORTER;
  const permissions = normalizeStringList(payload.permissions);
  const scope = collectScopeTokens(payload.scope).filter(
    (entry, index, collection) => collection.indexOf(entry) === index,
  );

  return {
    role,
    label:
      typeof payload.label === "string" && payload.label.trim().length > 0
        ? payload.label.trim()
        : getRoleLabel(role),
    permissions,
    scope,
    canUpdateUser: Boolean(payload.canUpdateUser),
    canDeleteUser: Boolean(payload.canDeleteUser),
  };
}

export function permissionListIncludes(
  permissions: readonly string[],
  hints: readonly string[],
): boolean {
  if (permissions.length === 0) {
    return false;
  }

  const normalizedPermissions = permissions.map((entry) =>
    normalizeToken(entry),
  );
  const normalizedHints = hints.map((entry) => normalizeToken(entry));

  return normalizedHints.some((hint) => normalizedPermissions.includes(hint));
}

export function isCitizenSelfServiceUser(
  role: Role | undefined,
  capabilities?: UserCapabilities | null,
): boolean {
  if (role === Role.CITIZEN_REPORTER) {
    return true;
  }

  if (!capabilities) {
    return false;
  }

  if (
    permissionListIncludes(capabilities.permissions, [
      "citizen:link:self",
      "incident:create:self",
      "incident:read:own",
    ])
  ) {
    return true;
  }

  return capabilities.scope.some((entry) =>
    SELF_SERVICE_SCOPE_HINTS.some((hint) =>
      normalizeToken(entry).includes(hint),
    ),
  );
}
