"use client";

import { Alert, Button, Result, Space, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { AuditLogDetailSheet } from "@/components/audit/AuditLogDetailSheet";
import { AuditLogFilters } from "@/components/audit/AuditLogFilters";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { AuthGate } from "@/components/auth/AuthGate";
import { LoadingState } from "@/components/common/PageStates";
import { useAuditLogQuery, useAuditLogsQuery } from "@/features/audit-logs/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { useAuth } from "@/context/AuthContext";
import { canAccessAuditLogs } from "@/lib/auth/navigation";
import {
  extractAuditLogListValidation,
  getAuditLogErrorMessage,
} from "@/lib/api/auditLogs";
import { Role } from "@/types/auth";

const { Text, Title } = Typography;
const AUDIT_LOG_ALLOWED_ROLES = [Role.NATIONAL_ADMIN, Role.AUDITOR];

export default function AuditLogsPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const hasAuditAccess = canAccessAuditLogs({
    role: user?.role,
    capabilities,
    isAuthenticated,
  });
  const listQuery = useListQueryParams({
    defaultPageSize: 20,
    defaultSortBy: "timestamp",
    defaultSortOrder: "desc",
  });
  const auditLogsQuery = useAuditLogsQuery(
    listQuery,
    isAuthenticated && hasAuditAccess,
  );
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailQuery = useAuditLogQuery(
    selectedAuditLogId,
    isDetailOpen && isAuthenticated && hasAuditAccess,
  );

  const rows = useMemo(
    () => auditLogsQuery.data?.data ?? [],
    [auditLogsQuery.data],
  );
  const paginationMeta = auditLogsQuery.data?.pagination;
  const listValidationState = useMemo(
    () =>
      extractAuditLogListValidation(
        auditLogsQuery.error,
        listQuery.filters,
        listQuery.sortBy,
      ),
    [auditLogsQuery.error, listQuery.filters, listQuery.sortBy],
  );
  if (auditLogsQuery.isLoading && !auditLogsQuery.data) {
    return (
      <AuthGate allowedRoles={AUDIT_LOG_ALLOWED_ROLES}>
        <LoadingState />
      </AuthGate>
    );
  }

  return (
    <AuthGate allowedRoles={AUDIT_LOG_ALLOWED_ROLES}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space orientation="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>
            Audit Logs
            <Tag color="red" style={{ marginInlineStart: 8 }}>
              Sensitive
            </Tag>
          </Title>
          <Text type="secondary">
            Server-backed audit history for National Admin and Auditor users.
          </Text>
        </Space>

        <Alert
          type="warning"
          showIcon
          title="Sensitive operational data"
          description="Audit entries come from the API and may include actor, request, and metadata context. Avoid storing or sharing them outside approved workflows."
        />

        {auditLogsQuery.error && !listValidationState ? (
          auditLogsQuery.error instanceof Error &&
          "status" in auditLogsQuery.error &&
          auditLogsQuery.error.status === 403 ? (
            <Result
              status="403"
              title="Forbidden"
              subTitle="Only National Admin and Auditor accounts can access audit logs."
            />
          ) : (
            <Alert
              type="error"
              showIcon
              title="Unable to load audit logs"
              description={
                <Space orientation="vertical" size={8}>
                  <Text>
                    {getAuditLogErrorMessage(
                      auditLogsQuery.error,
                      "Request failed.",
                    )}
                  </Text>
                  <Button onClick={() => void auditLogsQuery.refetch()}>
                    Retry
                  </Button>
                </Space>
              }
            />
          )
        ) : null}

        <AuditLogFilters
          rows={rows}
          state={listQuery}
          loading={auditLogsQuery.isFetching}
          validationState={listValidationState}
        />

        <AuditLogTable
          rows={rows}
          loading={auditLogsQuery.isFetching}
          paginationMeta={paginationMeta}
          state={listQuery}
          onOpenDetail={(auditLogId) => {
            setSelectedAuditLogId(auditLogId);
            setIsDetailOpen(true);
          }}
        />

        <AuditLogDetailSheet
          open={isDetailOpen}
          auditLog={detailQuery.data}
          loading={detailQuery.isLoading || detailQuery.isFetching}
          errorMessage={
            detailQuery.error
              ? getAuditLogErrorMessage(detailQuery.error, "Request failed.")
              : null
          }
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedAuditLogId(null);
          }}
          onRetry={() => void detailQuery.refetch()}
        />
      </Space>
    </AuthGate>
  );
}
