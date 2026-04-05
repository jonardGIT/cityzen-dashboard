import type {
  CrudEndpoint,
  ParsedCrudResource,
} from "@/features/dynamic-crud/types";
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

export function canShowCrudNavigationItem(
  resource: ParsedCrudResource,
  role: Role | undefined,
  isAuthenticated: boolean,
): boolean {
  const canList = hasPermission(resource.endpoints.list, role, isAuthenticated);
  const canUseSelfServiceAction = [
    resource.endpoints.linkMe,
    resource.endpoints.report,
  ].some((endpoint) => hasPermission(endpoint, role, isAuthenticated));
  const canUseManagementAction = [
    resource.endpoints.create,
    resource.endpoints.update,
    resource.endpoints.delete,
    resource.endpoints.restore,
  ].some((endpoint) => hasPermission(endpoint, role, isAuthenticated));

  return canList || canUseSelfServiceAction || canUseManagementAction;
}
