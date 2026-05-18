"use client";

import {
  Alert,
  Button,
  Input,
  Result,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useDeferredValue, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { LoadingState } from "@/components/common/PageStates";
import { useAuth } from "@/context/AuthContext";
import {
  AdminSessionInventoryApiClientError,
  useAdminSessionInventoryQuery,
  useRevokeAdminSessionInventoryEntryMutation,
} from "@/features/admin-session-inventory/api";
import { canAccessAdminSessionInventory } from "@/lib/auth/navigation";
import { Role, type AdminSessionInventoryRecord } from "@/types/auth";

const { Paragraph, Text, Title } = Typography;
const SESSION_INVENTORY_ALLOWED_ROLES = [Role.NATIONAL_ADMIN, Role.AUDITOR];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getSessionTitle(session: AdminSessionInventoryRecord) {
  if (session.deviceLabel?.trim()) {
    return session.deviceLabel;
  }

  if (session.browserFamily && session.osFamily) {
    return `${session.browserFamily} on ${session.osFamily}`;
  }

  return `Session ${session.id}`;
}

function getSessionStatusColor(status: AdminSessionInventoryRecord["status"]) {
  switch (status) {
    case "active":
      return "green" as const;
    case "revoked":
      return "red" as const;
    default:
      return "default" as const;
  }
}

function getSessionActivityTimestamp(session: AdminSessionInventoryRecord) {
  const candidates = [session.lastUsedAt, session.updatedAt, session.createdAt];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Number.NEGATIVE_INFINITY;
}

export default function AdminSessionInventoryPage() {
  const { user, capabilities, isAuthenticated, logout } = useAuth();
  const hasSessionInventoryAccess = canAccessAdminSessionInventory({
    role: user?.role,
    capabilities,
    isAuthenticated,
  });
  const sessionsQuery = useAdminSessionInventoryQuery(
    isAuthenticated && hasSessionInventoryAccess,
  );
  const revokeMutation = useRevokeAdminSessionInventoryEntryMutation();
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(
    searchValue.trim().toLowerCase(),
  );

  const filteredRows = useMemo(() => {
    const rows = [...(sessionsQuery.data ?? [])].sort(
      (left, right) =>
        getSessionActivityTimestamp(right) - getSessionActivityTimestamp(left),
    );

    if (!deferredSearchValue) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [
        row.userDisplayName,
        row.userEmail,
        row.userRole,
        row.deviceLabel,
        row.browserFamily,
        row.osFamily,
        row.ipAddressMasked,
        row.id,
        row.authProvider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearchValue);
    });
  }, [deferredSearchValue, sessionsQuery.data]);

  const columns = useMemo<ColumnsType<AdminSessionInventoryRecord>>(() => {
    const baseColumns: ColumnsType<AdminSessionInventoryRecord> = [
      {
        title: "Account",
        key: "account",
        render: (_, session) => (
          <Space orientation="vertical" size={0}>
            <Text strong>
              {session.userDisplayName || session.userEmail || "Unknown user"}
            </Text>
            {session.userDisplayName && session.userEmail ? (
              <Text type="secondary">{session.userEmail}</Text>
            ) : null}
            {session.userRole ? <Tag>{session.userRole}</Tag> : null}
          </Space>
        ),
      },
      {
        title: "Device",
        key: "device",
        render: (_, session) => (
          <Space orientation="vertical" size={0}>
            <Text strong>{getSessionTitle(session)}</Text>
            <Text type="secondary">
              {session.browserFamily || "Unknown browser"}
            </Text>
            <Text type="secondary">Session ID: {session.id}</Text>
          </Space>
        ),
      },
      {
        title: "Network",
        key: "network",
        render: (_, session) => (
          <Space orientation="vertical" size={0}>
            <Text>{session.ipAddressMasked || "Masked"}</Text>
            <Text type="secondary">{session.authProvider}</Text>
            {session.isCurrentActorSession ? (
              <Tag color="blue">Current admin session</Tag>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (value: string) => formatDateTime(value),
      },
      {
        title: "Last Used",
        dataIndex: "lastUsedAt",
        key: "lastUsedAt",
        render: (value: string | null) => formatDateTime(value),
      },
      {
        title: "Expires",
        dataIndex: "expiresAt",
        key: "expiresAt",
        render: (value: string | null) => formatDateTime(value),
      },
      {
        title: "Status",
        key: "status",
        render: (_, session) => (
          <Tag color={getSessionStatusColor(session.status)}>
            {session.status.toUpperCase()}
          </Tag>
        ),
      },
    ];

    if (user?.role === Role.NATIONAL_ADMIN) {
      baseColumns.push({
        title: "Action",
        key: "action",
        render: (_, session) => (
          <Button
            danger
            size="small"
            disabled={session.status === "revoked"}
            loading={
              revokeMutation.isPending &&
              revokeMutation.variables === session.id
            }
            onClick={async () => {
              try {
                await revokeMutation.mutateAsync(session.id);

                if (session.isCurrentActorSession) {
                  await logout({
                    revokeRemote: false,
                    reason: "session-revoked",
                  });
                }
              } catch {
                // mutation state drives the error banner below
              }
            }}
          >
            Revoke
          </Button>
        ),
      });
    }

    return baseColumns;
  }, [logout, revokeMutation, user?.role]);

  if (sessionsQuery.isLoading && !sessionsQuery.data) {
    return (
      <AuthGate allowedRoles={SESSION_INVENTORY_ALLOWED_ROLES}>
        <LoadingState />
      </AuthGate>
    );
  }

  return (
    <AuthGate allowedRoles={SESSION_INVENTORY_ALLOWED_ROLES}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space orientation="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>
            Session Inventory
            <Tag color="volcano" style={{ marginInlineStart: 8 }}>
              Sensitive
            </Tag>
          </Title>
          <Text type="secondary">
            Redacted cross-account session review for National Admin and Auditor
            workflows.
          </Text>
        </Space>

        <Alert
          type="warning"
          showIcon
          title="Administrative session oversight"
          description="This inventory intentionally omits raw user agents and exact IP addresses. Use it for account access review and targeted revocation only."
        />

        {sessionsQuery.error ? (
          sessionsQuery.error instanceof AdminSessionInventoryApiClientError &&
          sessionsQuery.error.status === 403 ? (
            <Result
              status="403"
              title="Forbidden"
              subTitle="Only National Admin and Auditor accounts can access the admin session inventory."
            />
          ) : (
            <Alert
              type="error"
              showIcon
              title="Unable to load session inventory"
              description={
                <Space orientation="vertical" size={8}>
                  <Text>
                    {sessionsQuery.error instanceof Error
                      ? sessionsQuery.error.message
                      : "Request failed."}
                  </Text>
                  <Button onClick={() => void sessionsQuery.refetch()}>
                    Retry
                  </Button>
                </Space>
              }
            />
          )
        ) : null}

        {revokeMutation.error ? (
          <Alert
            type="error"
            showIcon
            title="Unable to revoke session"
            description={
              revokeMutation.error instanceof Error
                ? revokeMutation.error.message
                : "Request failed."
            }
          />
        ) : null}

        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search by account, role, device, provider, IP mask, or session id"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {filteredRows.length} session{filteredRows.length === 1 ? "" : "s"}{" "}
            matched.
          </Paragraph>
        </Space>

        <Table<AdminSessionInventoryRecord>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={sessionsQuery.isFetching}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 1200 }}
        />
      </Space>
    </AuthGate>
  );
}
