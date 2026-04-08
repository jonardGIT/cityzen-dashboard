"use client";

import { useQuery } from "@tanstack/react-query";
import { checkedInOpenApiDocument } from "../../docs/openapi";
import { publicClient } from "@/lib/api/clients";
import { getCrudConfig } from "@/features/dynamic-crud/config";
import type {
  CrudAuthOptionalEndpoint,
  CrudEndpoint,
} from "@/features/dynamic-crud/types";
import type { OpenApiDocument } from "../../docs/openapi";

function buildEndpointKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

function parseEndpointKey(operationKey: string) {
  const separatorIndex = operationKey.indexOf(" ");

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    method: operationKey.slice(0, separatorIndex),
    path: operationKey.slice(separatorIndex + 1),
  };
}

export interface ContractDriftIssue {
  type: "missing-active-config-operation" | "unconfigured-openapi-operation";
  operationKey: string;
  message: string;
}

function isRelevantOpenApiPath(
  path: string,
  resourcePrefixes: readonly string[],
  configuredAuthPaths: ReadonlySet<string>,
) {
  if (configuredAuthPaths.has(path)) {
    return true;
  }

  return resourcePrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
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

export function getCheckedInOpenApiOperationKeys() {
  return collectOpenApiOperationKeys(checkedInOpenApiDocument);
}

async function fetchLiveOpenApiOperationKeys() {
  const response = await publicClient.get<OpenApiDocument>("/openapi.json");
  return collectOpenApiOperationKeys(response.data);
}

export async function fetchOpenApiOperationKeys() {
  if (process.env.NEXT_PUBLIC_OPENAPI_SOURCE !== "live") {
    return getCheckedInOpenApiOperationKeys();
  }

  try {
    return await fetchLiveOpenApiOperationKeys();
  } catch {
    return getCheckedInOpenApiOperationKeys();
  }
}

export function collectContractDriftIssues(
  operationKeys: readonly string[] | undefined,
): ContractDriftIssue[] {
  if (!operationKeys) {
    return [];
  }

  const config = getCrudConfig();
  const configuredEndpoints = [
    ...config.endpoints,
    ...(config.auth.optionalEndpoints ?? []),
  ];
  const configuredOperationKeys = new Set(
    configuredEndpoints.map((endpoint) =>
      buildEndpointKey(endpoint.method, endpoint.path),
    ),
  );
  const configuredAuthPaths = new Set(
    (config.auth.optionalEndpoints ?? []).map((endpoint) => endpoint.path),
  );
  const resourcePrefixes = Array.from(
    new Set(config.endpoints.map((endpoint) => `/${endpoint.resource}`)),
  );

  const missingActiveConfigOperations = configuredEndpoints
    .filter((endpoint) => !endpoint.featureGate)
    .map((endpoint) => buildEndpointKey(endpoint.method, endpoint.path))
    .filter((operationKey) => !operationKeys.includes(operationKey))
    .map((operationKey) => ({
      type: "missing-active-config-operation" as const,
      operationKey,
      message: `${operationKey} is configured but absent from the active OpenAPI document.`,
    }));

  const unconfiguredOpenApiOperations = operationKeys
    .map(parseEndpointKey)
    .filter((entry): entry is { method: string; path: string } =>
      Boolean(entry),
    )
    .filter((entry) =>
      isRelevantOpenApiPath(entry.path, resourcePrefixes, configuredAuthPaths),
    )
    .map((entry) => buildEndpointKey(entry.method, entry.path))
    .filter((operationKey) => !configuredOperationKeys.has(operationKey))
    .map((operationKey) => ({
      type: "unconfigured-openapi-operation" as const,
      operationKey,
      message: `${operationKey} is exposed by the active OpenAPI document but missing from dashboard config.`,
    }));

  return [...missingActiveConfigOperations, ...unconfiguredOpenApiOperations];
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

export function useOpenApiContractDrift() {
  const openApiQuery = useQuery({
    queryKey: ["openapi", "operations"],
    queryFn: fetchOpenApiOperationKeys,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const issues = collectContractDriftIssues(openApiQuery.data);

  return {
    ...openApiQuery,
    issues,
    hasDrift: issues.length > 0,
  };
}
