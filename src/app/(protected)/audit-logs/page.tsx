"use client";

import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Result,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { AuditLogDetailDrawer } from "@/components/audit/AuditLogDetailDrawer";
import { AuthGate } from "@/components/auth/AuthGate";
import { EmptyState, LoadingState } from "@/components/common/PageStates";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { useAuditLogQuery, useAuditLogsQuery } from "@/features/audit-logs/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import type { ListFilter } from "@/lib/api/list-query-params";
import { CAN_VIEW_AUDIT_LOGS } from "@/lib/auth/permissions";
import {
  formatDisplayDateTime,
  formatDisplayRelativeTime,
} from "@/lib/format/date-time";
import type { ApiErrorPayload, AuditLog } from "@/types/api";

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const message = axiosError.response?.data?.message;
  const validationSummary = axiosError.response?.data?.errors
    ?.map((issue) => {
      if (!issue.message) {
        return null;
      }

      return issue.field ? `${issue.field}: ${issue.message}` : issue.message;
    })
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return validationSummary || message || fallback;
}

function outcomeColor(value: string | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "success") {
    return "green";
  }

  if (normalized === "failure") {
    return "red";
  }

  return "default";
}

function getFilterValue(
  filters: ListFilter[],
  field: string,
): string | undefined {
  const match = filters.find((filter) => filter.field === field);

  if (!match || Array.isArray(match.value)) {
    return undefined;
  }

  return String(match.value);
}

function getBetweenFilterValue(
  filters: ListFilter[],
  field: string,
): [dayjs.Dayjs | null, dayjs.Dayjs | null] {
  const match = filters.find((filter) => filter.field === field);

  if (!match) {
    return [null, null];
  }

  if (match.operator === "gte" && !Array.isArray(match.value)) {
    return [typeof match.value === "string" ? dayjs(match.value) : null, null];
  }

  if (match.operator === "lte" && !Array.isArray(match.value)) {
    return [null, typeof match.value === "string" ? dayjs(match.value) : null];
  }

  if (!Array.isArray(match.value)) {
    return [null, null];
  }

  return [
    typeof match.value[0] === "string" ? dayjs(match.value[0]) : null,
    typeof match.value[1] === "string" ? dayjs(match.value[1]) : null,
  ];
}

export default function AuditLogsPage() {
  const listQuery = useListQueryParams({
    defaultPageSize: 20,
    defaultSortBy: "timestamp",
    defaultSortOrder: "desc",
  });
  const auditLogsQuery = useAuditLogsQuery(listQuery);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailQuery = useAuditLogQuery(selectedAuditLogId, isDetailOpen);

  const rows = auditLogsQuery.data?.data ?? [];
  const paginationMeta = auditLogsQuery.data?.pagination;
  const timestampRange = getBetweenFilterValue(listQuery.filters, "timestamp");
  const statusCodeFilter = getFilterValue(listQuery.filters, "statusCode");

  const actionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.action)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ value, label: value })),
    [rows],
  );

  const resourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.resource)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ value, label: value })),
    [rows],
  );

  const columns: Array<SharedTableColumn<AuditLog>> = [
    {
      key: "timestamp",
      title: "Timestamp",
      sortable: true,
      width: 220,
      render: (value) => {
        const relative = formatDisplayRelativeTime(value);

        return (
          <Space direction="vertical" size={0}>
            <Text>{formatDisplayDateTime(value)}</Text>
            {relative ? <Text type="secondary">{relative}</Text> : null}
          </Space>
        );
      },
    },
    {
      key: "outcome",
      title: "Outcome",
      sortable: true,
      width: 120,
      render: (value) => (
        <Tag
          color={outcomeColor(typeof value === "string" ? value : undefined)}
        >
          {String(value ?? "N/A")}
        </Tag>
      ),
    },
    { key: "action", title: "Action", sortable: true, width: 140 },
    { key: "resource", title: "Resource", sortable: true, width: 140 },
    { key: "summary", title: "Summary", width: 360 },
    { key: "actorEmail", title: "Actor", sortable: true, width: 220 },
    { key: "actorRole", title: "Role", sortable: true, width: 140 },
    {
      key: "method",
      title: "Method",
      sortable: true,
      width: 120,
      render: (value) => <Tag>{String(value ?? "N/A")}</Tag>,
    },
    { key: "path", title: "Path", width: 280 },
    { key: "statusCode", title: "Status", sortable: true, width: 120 },
    {
      key: "requestId",
      title: "Request ID",
      width: 220,
      render: (value) => {
        if (typeof value !== "string" || value.trim().length === 0) {
          return <Text type="secondary">N/A</Text>;
        }

        return (
          <Paragraph copyable={{ text: value }} style={{ marginBottom: 0 }}>
            {value}
          </Paragraph>
        );
      },
    },
  ];

  const updateFilter = (
    field: string,
    value: string | number | null,
    operator: ListFilter["operator"] = "equals",
  ) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim().length === 0
    ) {
      listQuery.removeFilter(field);
      return;
    }

    listQuery.upsertFilter({
      field,
      operator,
      value: typeof value === "number" ? value : String(value).trim(),
    });
  };

  if (auditLogsQuery.isLoading && !auditLogsQuery.data) {
    return (
      <AuthGate allowedRoles={CAN_VIEW_AUDIT_LOGS}>
        <LoadingState />
      </AuthGate>
    );
  }

  return (
    <AuthGate allowedRoles={CAN_VIEW_AUDIT_LOGS}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space direction="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>
            Audit Logs
          </Title>
          <Text type="secondary">
            Server-backed audit history for admin and super admin users.
          </Text>
        </Space>

        <Alert
          type="warning"
          showIcon
          message="Sensitive operational data"
          description="Audit entries come from the API and may include actor, request, and metadata context. Avoid storing or sharing them outside approved workflows."
        />

        {auditLogsQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load audit logs"
            description={
              <Space direction="vertical" size={8}>
                <Text>
                  {getErrorMessage(auditLogsQuery.error, "Request failed.")}
                </Text>
                <Button onClick={() => void auditLogsQuery.refetch()}>
                  Retry
                </Button>
              </Space>
            }
          />
        ) : null}

        <SharedTable<AuditLog>
          rows={rows}
          columns={columns}
          storageKey="audit-logs-table"
          loading={auditLogsQuery.isFetching}
          page={listQuery.page}
          pageSize={listQuery.pageSize}
          paginationMeta={paginationMeta}
          onPageChange={listQuery.setPage}
          onPageSizeChange={listQuery.setPageSize}
          globalSearch={listQuery.search}
          onGlobalSearchChange={listQuery.setSearch}
          globalSearchPlaceholder="Search audit logs"
          sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
          onSortChange={(columnKey, order) =>
            listQuery.setSort(columnKey, order)
          }
          emptyText={
            <EmptyState description="No audit logs match the current filters." />
          }
          scrollX={1680}
          topToolbar={
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Select
                  allowClear
                  placeholder="Outcome"
                  style={{ width: 160 }}
                  value={getFilterValue(listQuery.filters, "outcome")}
                  options={[
                    { value: "success", label: "Success" },
                    { value: "failure", label: "Failure" },
                  ]}
                  onChange={(value) => updateFilter("outcome", value, "equals")}
                />
                <Select
                  allowClear
                  placeholder="Action"
                  style={{ width: 180 }}
                  value={getFilterValue(listQuery.filters, "action")}
                  options={actionOptions}
                  onChange={(value) => updateFilter("action", value, "equals")}
                />
                <Select
                  allowClear
                  placeholder="Resource"
                  style={{ width: 180 }}
                  value={getFilterValue(listQuery.filters, "resource")}
                  options={resourceOptions}
                  onChange={(value) =>
                    updateFilter("resource", value, "equals")
                  }
                />
                <Select
                  allowClear
                  placeholder="Method"
                  style={{ width: 160 }}
                  value={getFilterValue(listQuery.filters, "method")}
                  options={[
                    { value: "POST", label: "POST" },
                    { value: "PATCH", label: "PATCH" },
                    { value: "PUT", label: "PUT" },
                    { value: "DELETE", label: "DELETE" },
                    { value: "GET", label: "GET" },
                  ]}
                  onChange={(value) => updateFilter("method", value, "equals")}
                />
                <Input
                  allowClear
                  placeholder="Actor email"
                  style={{ width: 220 }}
                  value={getFilterValue(listQuery.filters, "actorEmail")}
                  onChange={(event) =>
                    updateFilter("actorEmail", event.target.value, "contains")
                  }
                />
                <Input
                  allowClear
                  placeholder="Request ID"
                  style={{ width: 220 }}
                  value={getFilterValue(listQuery.filters, "requestId")}
                  onChange={(event) =>
                    updateFilter("requestId", event.target.value, "contains")
                  }
                />
                <Input
                  allowClear
                  placeholder="Target ID"
                  style={{ width: 220 }}
                  value={getFilterValue(listQuery.filters, "targetId")}
                  onChange={(event) =>
                    updateFilter("targetId", event.target.value, "equals")
                  }
                />
                <InputNumber
                  placeholder="Status code"
                  style={{ width: 140 }}
                  value={
                    statusCodeFilter ? Number(statusCodeFilter) : undefined
                  }
                  onChange={(value) =>
                    updateFilter(
                      "statusCode",
                      typeof value === "number" ? value : null,
                      "equals",
                    )
                  }
                />
                <RangePicker
                  allowEmpty={[true, true]}
                  value={timestampRange}
                  onChange={(dates) => {
                    const from = dates?.[0]?.toISOString();
                    const to = dates?.[1]?.toISOString();

                    if (!from && !to) {
                      listQuery.removeFilter("timestamp");
                      return;
                    }

                    listQuery.upsertFilter({
                      field: "timestamp",
                      operator: from && to ? "between" : from ? "gte" : "lte",
                      value: from && to ? [from, to] : (from ?? to ?? ""),
                    });
                  }}
                />
                <Button
                  onClick={() => {
                    listQuery.setFilters(
                      listQuery.filters.filter(
                        (filter) =>
                          ![
                            "outcome",
                            "action",
                            "resource",
                            "method",
                            "actorEmail",
                            "requestId",
                            "targetId",
                            "statusCode",
                            "timestamp",
                          ].includes(filter.field),
                      ),
                    );
                  }}
                >
                  Clear filters
                </Button>
              </Space>
              {auditLogsQuery.error ? null : (
                <Text type="secondary">
                  Default sort is newest event first. Open a row to inspect full
                  metadata.
                </Text>
              )}
            </Space>
          }
          actionColumn={{
            title: "Details",
            width: 110,
            render: (record) => (
              <Button
                size="small"
                onClick={() => {
                  setSelectedAuditLogId(record.id);
                  setIsDetailOpen(true);
                }}
              >
                View
              </Button>
            ),
          }}
        />

        <AuditLogDetailDrawer
          open={isDetailOpen}
          auditLog={detailQuery.data}
          loading={detailQuery.isLoading || detailQuery.isFetching}
          errorMessage={
            detailQuery.error
              ? getErrorMessage(detailQuery.error, "Request failed.")
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
