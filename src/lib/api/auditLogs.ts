import { AxiosError } from "axios";
import { createAuthenticatedClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import {
  buildListQueryParams,
  type FetchListParams,
  type ListFilter,
} from "@/lib/api/list-query-params";
import type { ApiErrorPayload, AuditLog } from "@/types/api";

const auditLogsApiClient = createAuthenticatedClient("/api/dashboard");

export interface AuditLogRequestOptions {
  signal?: AbortSignal;
}

export interface AuditLogApiError {
  status: number;
  message: string;
  details?: ApiErrorPayload;
}

export type AuditLogApiResult<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: AuditLogApiError;
    };

export interface AuditLogListValidationState {
  message: string;
  generalErrors: string[];
  filterErrorsByField: Record<string, string[]>;
  sortErrorsByField: Record<string, string[]>;
}

export class AuditLogApiClientError extends Error {
  status: number;
  details?: ApiErrorPayload;

  constructor(error: AuditLogApiError) {
    super(error.message);
    this.name = "AuditLogApiClientError";
    this.status = error.status;
    this.details = error.details;
  }
}

function normalizeAuditLogError(
  error: unknown,
  fallback: string,
): AuditLogApiError {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const payload = axiosError.response?.data;

  return {
    status: axiosError.response?.status ?? 500,
    message: payload?.message ?? axiosError.message ?? fallback,
    details: payload,
  };
}

function appendFieldError(
  target: Record<string, string[]>,
  field: string,
  message: string,
) {
  target[field] = [...(target[field] ?? []), message];
}

export function extractAuditLogListValidation(
  error: unknown,
  filters: ListFilter[],
  sortBy: string,
): AuditLogListValidationState | null {
  if (!(error instanceof AuditLogApiClientError) || error.status !== 422) {
    return null;
  }

  const payload = error.details;
  const issues = Array.isArray(payload?.errors) ? payload.errors : [];
  const generalErrors: string[] = [];
  const filterErrorsByField: Record<string, string[]> = {};
  const sortErrorsByField: Record<string, string[]> = {};
  const fallbackMessage =
    payload?.message ?? error.message ?? "Invalid query parameters.";

  for (const issue of issues) {
    const message = issue.message ?? fallbackMessage;
    const issueField = issue.field ?? "";
    const filterIndexMatch = issueField.match(
      /^filters\[(\d+)\]\.(field|operator|value)$/,
    );

    if (filterIndexMatch) {
      const filterIndex = Number(filterIndexMatch[1]);
      const filterField = filters[filterIndex]?.field;

      if (filterField) {
        appendFieldError(filterErrorsByField, filterField, message);
        continue;
      }
    }

    if (issueField === "filters") {
      generalErrors.push(message);
      continue;
    }

    if (issueField === "sortBy" || issueField === "sortOrder") {
      appendFieldError(sortErrorsByField, sortBy, message);
      continue;
    }

    if (issueField === "createdFrom" || issueField === "createdTo") {
      appendFieldError(filterErrorsByField, "createdAt", message);
      continue;
    }

    if (issueField === "updatedFrom" || issueField === "updatedTo") {
      appendFieldError(filterErrorsByField, "updatedAt", message);
      continue;
    }

    if (filters.some((filter) => filter.field === issueField)) {
      appendFieldError(filterErrorsByField, issueField, message);
      continue;
    }

    generalErrors.push(message);
  }

  if (
    generalErrors.length === 0 &&
    Object.keys(filterErrorsByField).length === 0 &&
    Object.keys(sortErrorsByField).length === 0
  ) {
    generalErrors.push(fallbackMessage);
  }

  return {
    message: fallbackMessage,
    generalErrors,
    filterErrorsByField,
    sortErrorsByField,
  };
}

export function getAuditLogErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AuditLogApiClientError) {
    return error.message || fallback;
  }

  return fallback;
}

export async function listAuditLogs(
  params: FetchListParams,
  options?: AuditLogRequestOptions,
): Promise<AuditLogApiResult<PaginatedResponse<AuditLog>>> {
  try {
    const response = await auditLogsApiClient.get<unknown>("/audit-logs", {
      params: buildListQueryParams(params),
      signal: options?.signal,
    });

    return {
      success: true,
      data: adaptPaginatedResponse<AuditLog>(
        response.data,
        params.page,
        params.pageSize,
      ),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: normalizeAuditLogError(error, "Failed to fetch audit logs."),
    };
  }
}

export async function getAuditLogById(
  auditLogId: string,
  options?: AuditLogRequestOptions,
): Promise<AuditLogApiResult<AuditLog>> {
  try {
    const response = await auditLogsApiClient.get<unknown>(
      `/audit-logs/${auditLogId}`,
      {
        signal: options?.signal,
      },
    );

    return {
      success: true,
      data: unwrapEntityResponse<AuditLog>(response.data),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: normalizeAuditLogError(
        error,
        "Failed to fetch audit log details.",
      ),
    };
  }
}
