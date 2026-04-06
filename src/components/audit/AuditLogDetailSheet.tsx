"use client";

import {
  Alert,
  Button,
  Collapse,
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

function renderRequestId(value: string | null | undefined) {
  if (!value) {
    return <Text type="secondary">N/A</Text>;
  }

  return (
    <Paragraph copyable={{ text: value }} style={{ marginBottom: 0 }}>
      {value}
    </Paragraph>
  );
}

function renderMetadataJson(value: AuditLog["metadata"]) {
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

interface AuditLogDetailSheetProps {
  open: boolean;
  auditLog?: AuditLog;
  loading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function AuditLogDetailSheet({
  open,
  auditLog,
  loading,
  errorMessage,
  onClose,
  onRetry,
}: AuditLogDetailSheetProps) {
  const metadataItems =
    auditLog?.metadata && typeof auditLog.metadata === "object"
      ? Object.entries(auditLog.metadata)
      : [];

  return (
    <Drawer
      open={open}
      title="Audit Log Details"
      width={760}
      onClose={onClose}
      destroyOnClose
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          title="Sensitive admin data"
          description="Audit logs may include actor identity, request context, and sanitized backend metadata. Treat exports and screenshots as controlled material."
        />

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            title="Unable to load audit log details"
            description={
              <Space orientation="vertical" size={8}>
                <Text>{errorMessage}</Text>
                <Button onClick={onRetry}>Retry</Button>
              </Space>
            }
          />
        ) : null}

        <Skeleton active loading={loading} paragraph={{ rows: 10 }}>
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
              {renderRequestId(auditLog?.requestId)}
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
          </Descriptions>

          <Collapse
            style={{ marginTop: 16 }}
            items={[
              {
                key: "metadata-json",
                label: "Metadata JSON",
                children: renderMetadataJson(auditLog?.metadata ?? null),
              },
              {
                key: "metadata-fields",
                label: "Metadata Fields",
                children:
                  metadataItems.length > 0 ? (
                    <Descriptions bordered column={1} size="small">
                      {metadataItems.map(([key, value]) => (
                        <Descriptions.Item key={key} label={humanizeKey(key)}>
                          {formatDisplayValue(value)}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  ) : (
                    <Text type="secondary">No metadata fields available.</Text>
                  ),
              },
            ]}
          />
        </Skeleton>
      </Space>
    </Drawer>
  );
}
