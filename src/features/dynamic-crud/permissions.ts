import type { CrudEndpoint } from "@/features/dynamic-crud/types";
import type { Role } from "@/types/auth";

export function hasPermission(
  endpoint: CrudEndpoint | undefined,
  role: Role | undefined,
  isAuthenticated: boolean,
): boolean {
  if (!endpoint) {
    return false;
  }

  if (!endpoint.authRequired) {
    return true;
  }

  if (!isAuthenticated) {
    return false;
  }

  if (!endpoint.allowedRoles || endpoint.allowedRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  return endpoint.allowedRoles.includes(role);
}
