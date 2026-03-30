"use client";

import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { formatDisplayDateTime } from "@/lib/format/date-time";
import { formatDisplayValue, humanizeKey } from "@/lib/format/display";
import type { AuditLog } from "@/types/api";

const { Paragraph, Text } = Typography;

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

function renderMetadata(value: AuditLog["metadata"]) {
  if (!value || typeof value !== "object") {
    return <Text type="secondary">No metadata</Text>;
  }

  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        background: "#fafafa",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

interface AuditLogDetailDrawerProps {
  open: boolean;
  auditLog?: AuditLog;
  loading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function AuditLogDetailDrawer({
  open,
  auditLog,
  loading,
  errorMessage,
  onClose,
  onRetry,
}: AuditLogDetailDrawerProps) {
  return (
    <Drawer
      open={open}
      title="Audit Log Details"
      width={720}
      onClose={onClose}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          message="Sensitive admin data"
          description="Audit logs may contain operational metadata. Handle exports and screenshots carefully."
        />

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load audit log details"
            description={
              <Space direction="vertical" size={8}>
                <Text>{errorMessage}</Text>
                <Button onClick={onRetry}>Retry</Button>
              </Space>
            }
          />
        ) : null}

        <Skeleton active loading={loading} paragraph={{ rows: 8 }}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Timestamp">
              {formatDisplayDateTime(auditLog?.timestamp)}
            </Descriptions.Item>
            <Descriptions.Item label="Outcome">
              <Tag color={outcomeColor(auditLog?.outcome)}>
                {formatDisplayValue(auditLog?.outcome)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Summary">
              {formatDisplayValue(auditLog?.summary)}
            </Descriptions.Item>
            <Descriptions.Item label="Action">
              {formatDisplayValue(auditLog?.action)}
            </Descriptions.Item>
            <Descriptions.Item label="Resource">
              {formatDisplayValue(auditLog?.resource)}
            </Descriptions.Item>
            <Descriptions.Item label="Actor Email">
              {formatDisplayValue(auditLog?.actorEmail)}
            </Descriptions.Item>
            <Descriptions.Item label="Actor Role">
              {formatDisplayValue(auditLog?.actorRole)}
            </Descriptions.Item>
            <Descriptions.Item label="Actor User ID">
              {formatDisplayValue(auditLog?.actorUserId)}
            </Descriptions.Item>
            <Descriptions.Item label="Method">
              {formatDisplayValue(auditLog?.method)}
            </Descriptions.Item>
            <Descriptions.Item label="Path">
              {formatDisplayValue(auditLog?.path)}
            </Descriptions.Item>
            <Descriptions.Item label="Status Code">
              {formatDisplayValue(auditLog?.statusCode)}
            </Descriptions.Item>
            <Descriptions.Item label="Target ID">
              {formatDisplayValue(auditLog?.targetId)}
            </Descriptions.Item>
            <Descriptions.Item label="Request ID">
              {auditLog?.requestId ? (
                <Paragraph
                  copyable={{ text: auditLog.requestId }}
                  style={{ marginBottom: 0 }}
                >
                  {auditLog.requestId}
                </Paragraph>
              ) : (
                formatDisplayValue(auditLog?.requestId)
              )}
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              {formatDisplayValue(auditLog?.ipAddress)}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent">
              {formatDisplayValue(auditLog?.userAgent)}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {formatDisplayDateTime(auditLog?.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {formatDisplayDateTime(auditLog?.updatedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Metadata">
              {renderMetadata(auditLog?.metadata ?? null)}
            </Descriptions.Item>
          </Descriptions>
        </Skeleton>

        {auditLog?.metadata && typeof auditLog.metadata === "object" ? (
          <Descriptions
            bordered
            column={1}
            size="small"
            title="Metadata Fields"
          >
            {Object.entries(auditLog.metadata).map(([key, value]) => (
              <Descriptions.Item key={key} label={humanizeKey(key)}>
                {formatDisplayValue(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Space>
    </Drawer>
  );
}
