import type { Role } from "@/types/auth";

export type CrudOperation =
  | "list"
  | "get"
  | "create"
  | "linkMe"
  | "report"
  | "update"
  | "delete"
  | "restore"
  | "capabilities"
  | "mediaAccess"
  | "mediaUpload"
  | (string & {});

export interface CrudAuthConfig {
  type: "bearer";
  tokenHeader: string;
  tokenPrefix: string;
  optionalEndpoints?: CrudAuthOptionalEndpoint[];
}

export interface CrudFeatureGate {
  feature: string;
  requires?: string;
  requiresAnyOf?: string[];
}

export interface CrudPilotConfig {
  scope: string;
  partnerLguExpansion: string;
  governanceBaselineDoc?: string;
  notes?: string;
}

export interface CrudMobileCitizenSurfaceConfig {
  label?: string;
  notes?: string;
  compatibilityOnlyNotes?: string;
}

export interface CrudAuthOptionalEndpoint {
  operation: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  fullPath: string;
  authRequired: boolean;
  allowedRoles?: Role[];
  featureGate?: CrudFeatureGate;
  notes?: string;
}

export interface CrudEndpoint {
  resource: string;
  label: string;
  operation: CrudOperation;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  fullPath: string;
  authRequired: boolean;
  allowedRoles: Role[];
  featureGate?: CrudFeatureGate;
  notes?: string;
  surface?: "dashboard" | "mobile-citizen" | "mobile-citizen-compatibility";
}

export interface CrudConfigFlat {
  apiBasePath: string;
  pilot?: CrudPilotConfig;
  mobileCitizenSurface?: CrudMobileCitizenSurfaceConfig;
  auth: CrudAuthConfig;
  endpoints: CrudEndpoint[];
}

export interface ParsedCrudResource {
  resource: string;
  label: string;
  endpoints: Record<string, CrudEndpoint | undefined>;
}

export interface NormalizedApiError {
  status: number;
  message: string;
  details?: unknown;
  retryAfter?: number;
}

export interface NormalizedApiResult<T> {
  success: boolean;
  data: T | null;
  error: NormalizedApiError | null;
}

export type CrudFieldType =
  | "text"
  | "textarea"
  | "email"
  | "password"
  | "select"
  | "datetime"
  | "integer"
  | "boolean"
  | "json";

export interface CrudFieldOptionSource {
  resource: string;
  valueField?: string;
  labelField?: string;
  pageSize?: number;
  fetchAllPages?: boolean;
  dependencyFilter?: {
    sourceField: string;
    targetField: string;
  };
}

export interface CrudSelectOption {
  value: string;
  label: string;
  description?: string;
  record?: Record<string, unknown>;
}

export interface CrudFieldConfig {
  name: string;
  label: string;
  type: CrudFieldType;
  required?: boolean;
  submit?: boolean;
  optionSource?: CrudFieldOptionSource;
}
