import { useQuery } from "@tanstack/react-query";
import {
  AuditLogApiClientError,
  getAuditLogById,
  listAuditLogs,
} from "@/lib/api/auditLogs";
import type { PaginatedResponse } from "@/lib/api/pagination";
import type { FetchListParams } from "@/lib/api/list-query-params";
import type { AuditLog } from "@/types/api";

export async function fetchAuditLogs(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AuditLog>> {
  const result = await listAuditLogs(fetchParams, { signal });

  if (!result.success) {
    throw new AuditLogApiClientError(result.error);
  }

  return result.data;
}

export async function fetchAuditLogById(
  auditLogId: string,
  signal?: AbortSignal,
) {
  const result = await getAuditLogById(auditLogId, { signal });

  if (!result.success) {
    throw new AuditLogApiClientError(result.error);
  }

  return result.data;
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
    retry: false,
  });
}

export function useAuditLogQuery(auditLogId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["audit-logs", auditLogId],
    queryFn: ({ signal }) => fetchAuditLogById(String(auditLogId), signal),
    enabled: enabled && Boolean(auditLogId),
    staleTime: 15_000,
    retry: false,
  });
}
