import axios, { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import {
  buildListQueryParams,
  type FetchListParams,
} from "@/lib/api/list-query-params";
import { clearAuthStorage, getAccessToken } from "@/lib/auth/token-storage";
import type { ApiErrorPayload, AuditLog } from "@/types/api";

const auditLogsApiClient = axios.create({
  baseURL: "/api/dashboard",
  headers: {
    "Content-Type": "application/json",
  },
});

auditLogsApiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

auditLogsApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      clearAuthStorage();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export async function fetchAuditLogs(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AuditLog>> {
  const response = await auditLogsApiClient.get<unknown>("/audit-logs", {
    params: buildListQueryParams(fetchParams),
    signal,
  });

  return adaptPaginatedResponse<AuditLog>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchAuditLogById(
  auditLogId: string,
  signal?: AbortSignal,
) {
  const response = await auditLogsApiClient.get<unknown>(
    `/audit-logs/${auditLogId}`,
    {
      signal,
    },
  );

  return unwrapEntityResponse<AuditLog>(response.data);
}

export function useAuditLogsQuery(
  fetchParams: FetchListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ["audit-logs", fetchParams],
    queryFn: ({ signal }) => fetchAuditLogs(fetchParams, signal),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
}

export function useAuditLogQuery(auditLogId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["audit-logs", auditLogId],
    queryFn: ({ signal }) => fetchAuditLogById(String(auditLogId), signal),
    enabled: enabled && Boolean(auditLogId),
    staleTime: 15_000,
  });
}
