import flatConfig from "../../../dashboard-crud-config.flat.json";
import { normalizeRoleList } from "@/lib/auth/roles";
import type { CrudConfigFlat, CrudEndpoint, CrudOperation, ParsedCrudResource } from "@/features/dynamic-crud/types";

const parsedConfig = flatConfig as CrudConfigFlat;

function ensureEndpointOperationShape(endpoint: CrudEndpoint): CrudEndpoint {
  return {
    ...endpoint,
    allowedRoles: normalizeRoleList(endpoint.allowedRoles ?? []),
  };
}

export function getCrudConfig(): CrudConfigFlat {
  return {
    ...parsedConfig,
    endpoints: parsedConfig.endpoints.map(ensureEndpointOperationShape),
  };
}

export function getAllCrudResources(): ParsedCrudResource[] {
  const config = getCrudConfig();
  const resources = new Map<string, ParsedCrudResource>();

  for (const endpoint of config.endpoints) {
    const existing = resources.get(endpoint.resource);

    if (!existing) {
      resources.set(endpoint.resource, {
        resource: endpoint.resource,
        label: endpoint.label,
        endpoints: {
          [endpoint.operation]: endpoint,
        },
      });
      continue;
    }

    existing.endpoints[endpoint.operation] = endpoint;
  }

  return Array.from(resources.values());
}

export function getCrudResource(resourceName: string): ParsedCrudResource | undefined {
  return getAllCrudResources().find((resource) => resource.resource === resourceName);
}

export function getCrudEndpoint(
  resourceName: string,
  operation: CrudOperation,
): CrudEndpoint | undefined {
  return getCrudResource(resourceName)?.endpoints[operation];
}
