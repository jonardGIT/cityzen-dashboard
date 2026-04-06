"use client";

import { Button, Space, Tag, Typography } from "antd";
import { ResizableTable } from "@/components/common/ResizableTable";
import { EmptyState } from "@/components/common/PageStates";
import type { ListQueryResult } from "@/hooks/useListQueryParams";
import type { PaginationMeta } from "@/lib/api/pagination";
import {
  formatDisplayDateTime,
  formatDisplayRelativeTime,
} from "@/lib/format/date-time";
import type { AuditLog } from "@/types/api";

const { Paragraph, Text } = Typography;

function outcomeColor(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "success") {
    return "green";
  }

  if (normalized === "failure") {
    return "red";
  }

  return "default";
}

interface AuditLogTableProps {
  rows: AuditLog[];
  loading?: boolean;
  paginationMeta?: PaginationMeta;
  state: ListQueryResult;
  onOpenDetail: (auditLogId: string) => void;
}

export function AuditLogTable({
  rows,
  loading,
  paginationMeta,
  state,
  onOpenDetail,
}: AuditLogTableProps) {
  return (
    <ResizableTable<AuditLog>
      rowKey="id"
      loading={loading}
      dataSource={rows}
      storageKey="audit-logs-table"
      showColumnVisibilitySelector
      stickyEdgeColumnCount={{ left: 1, right: 1 }}
      scroll={{ x: 1760 }}
      onRow={(record) => ({
        onClick: () => onOpenDetail(record.id),
        style: { cursor: "pointer" },
      })}
      locale={{
        emptyText: (
          <EmptyState description="No audit logs match the current query or filters." />
        ),
      }}
      pagination={{
        current: state.page,
        pageSize: state.pageSize,
        total: paginationMeta?.total ?? rows.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        onChange: (nextPage, nextPageSize) => {
          if (nextPageSize !== state.pageSize) {
            state.setPageSize(nextPageSize);
            return;
          }

          state.setPage(nextPage);
        },
      }}
      columns={[
        {
          title: "Timestamp",
          dataIndex: "timestamp",
          key: "timestamp",
          width: 220,
          render: (value: string | null | undefined) => {
            const relative = formatDisplayRelativeTime(value);

            return (
              <Space orientation="vertical" size={0}>
                <Text>{formatDisplayDateTime(value)}</Text>
                {relative ? <Text type="secondary">{relative}</Text> : null}
              </Space>
            );
          },
        },
        {
          title: "Outcome",
          dataIndex: "outcome",
          key: "outcome",
          width: 120,
          render: (value: string | undefined) => (
            <Tag color={outcomeColor(value)}>{value ?? "N/A"}</Tag>
          ),
        },
        { title: "Action", dataIndex: "action", key: "action", width: 160 },
        {
          title: "Resource",
          dataIndex: "resource",
          key: "resource",
          width: 140,
        },
        { title: "Summary", dataIndex: "summary", key: "summary", width: 360 },
        {
          title: "Actor Email",
          dataIndex: "actorEmail",
          key: "actorEmail",
          width: 220,
        },
        {
          title: "Actor Role",
          dataIndex: "actorRole",
          key: "actorRole",
          width: 150,
        },
        {
          title: "Method",
          dataIndex: "method",
          key: "method",
          width: 110,
          render: (value: string | undefined) => <Tag>{value ?? "N/A"}</Tag>,
        },
        { title: "Path", dataIndex: "path", key: "path", width: 280 },
        {
          title: "Status",
          dataIndex: "statusCode",
          key: "statusCode",
          width: 120,
          render: (value: number | null | undefined) => value ?? "N/A",
        },
        {
          title: "Request ID",
          dataIndex: "requestId",
          key: "requestId",
          width: 240,
          render: (value: string | null | undefined) =>
            value ? (
              <Paragraph copyable={{ text: value }} style={{ marginBottom: 0 }}>
                {value}
              </Paragraph>
            ) : (
              <Text type="secondary">N/A</Text>
            ),
        },
        {
          title: "Details",
          key: "details",
          width: 110,
          fixed: "right",
          render: (_value: unknown, record: AuditLog) => (
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenDetail(record.id);
              }}
            >
              View
            </Button>
          ),
        },
      ]}
    />
  );
}
