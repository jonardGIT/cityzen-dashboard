import type { Role } from "@/types/auth";

export type CrudOperation =
  | "list"
  | "get"
  | "create"
  | "linkMe"
  | "report"
  | "update"
  | "delete";

export interface CrudAuthConfig {
  type: "bearer";
  tokenHeader: string;
  tokenPrefix: string;
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
  notes?: string;
}

export interface CrudConfigFlat {
  apiBasePath: string;
  auth: CrudAuthConfig;
  endpoints: CrudEndpoint[];
}

export interface ParsedCrudResource {
  resource: string;
  label: string;
  endpoints: Partial<Record<CrudOperation, CrudEndpoint>> & Record<string, CrudEndpoint | undefined>;
}

export interface NormalizedApiError {
  status: number;
  message: string;
  details?: unknown;
}

export interface NormalizedApiResult<T> {
  success: boolean;
  data: T | null;
  error: NormalizedApiError | null;
}

export type CrudFieldType = "text" | "textarea" | "email" | "password" | "select" | "datetime";

export interface CrudFieldOptionSource {
  resource: string;
  valueField?: string;
  labelField?: string;
}

export interface CrudFieldConfig {
  name: string;
  label: string;
  type: CrudFieldType;
  required?: boolean;
  optionSource?: CrudFieldOptionSource;
}
