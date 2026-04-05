"use client";

import { useQuery } from "@tanstack/react-query";
import { publicClient } from "@/lib/api/clients";
import type {
  CrudAuthOptionalEndpoint,
  CrudEndpoint,
} from "@/features/dynamic-crud/types";

type OpenApiDocument = {
  paths?: Record<string, Record<string, unknown> | undefined>;
};

function buildEndpointKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

export function collectOpenApiOperationKeys(spec: OpenApiDocument): string[] {
  const keys: string[] = [];

  for (const [specPath, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of Object.keys(methods ?? {})) {
      const upperMethod = method.toUpperCase();
      if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(upperMethod)) {
        continue;
      }

      keys.push(buildEndpointKey(upperMethod, specPath));
    }
  }

  return keys;
}

export async function fetchOpenApiOperationKeys() {
  const response = await publicClient.get<OpenApiDocument>("/openapi.json");
  return collectOpenApiOperationKeys(response.data);
}

type OpenApiAwareEndpoint = Pick<
  CrudEndpoint | CrudAuthOptionalEndpoint,
  "method" | "path" | "featureGate"
>;

export function isCrudEndpointAvailableInOpenApi(
  endpoint: OpenApiAwareEndpoint | undefined,
  operationKeys: readonly string[] | undefined,
): boolean {
  if (!endpoint) {
    return false;
  }

  if (!endpoint.featureGate) {
    return true;
  }

  if (!operationKeys) {
    return true;
  }

  return operationKeys.includes(
    buildEndpointKey(endpoint.method, endpoint.path),
  );
}

export function useCrudEndpointAvailability(
  endpoint: OpenApiAwareEndpoint | undefined,
) {
  const openApiQuery = useQuery({
    queryKey: ["openapi", "operations"],
    queryFn: fetchOpenApiOperationKeys,
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: Boolean(endpoint?.featureGate),
  });

  return {
    ...openApiQuery,
    isAvailable: isCrudEndpointAvailableInOpenApi(endpoint, openApiQuery.data),
  };
}
