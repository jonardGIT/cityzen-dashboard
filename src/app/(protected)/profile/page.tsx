"use client";

import {
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Popover,
  QRCode,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ResizableTable } from "@/components/common/ResizableTable";
import { useAuth } from "@/context/AuthContext";
import {
  useAuthSessionsQuery,
  useCreateMfaSetupMutation,
  useDisableMfaMutation,
  useEnableMfaMutation,
  useRevokeAuthSessionMutation,
} from "@/features/auth/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import type {
  ListFilter,
  ListFilterOperator,
  ListSortOrder,
} from "@/lib/api/list-query-params";
import { DEFAULT_SORT_ORDER } from "@/lib/api/list-query-params";
import { CAN_MANAGE_MFA } from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";
import type {
  AuthSessionSummary,
  MfaCodeRequest,
  MfaSetupResponse,
} from "@/types/auth";

const { Paragraph, Text, Title } = Typography;
const { RangePicker } = DatePicker;

type SessionField =
  | "userAgent"
  | "status"
  | "ipAddress"
  | "createdAt"
  | "lastUsedAt"
  | "expiresAt"
  | "refreshExpiresAt"
  | "revokedAt";

type SessionFilterKind = "text" | "date" | "select";

const SESSION_COLUMN_LABELS: Record<SessionField, string> = {
  userAgent: "Device",
  status: "Status",
  ipAddress: "IP Address",
  createdAt: "Created",
  lastUsedAt: "Last Used",
  expiresAt: "Session Expires",
  refreshExpiresAt: "Refresh Expires",
  revokedAt: "Revoked At",
};

const SESSION_COLUMN_KINDS: Record<SessionField, SessionFilterKind> = {
  userAgent: "text",
  status: "select",
  ipAddress: "text",
  createdAt: "date",
  lastUsedAt: "date",
  expiresAt: "date",
  refreshExpiresAt: "date",
  revokedAt: "date",
};

const SESSION_STATUS_OPTIONS = [
  { label: "Current", value: "Current" },
  { label: "Active", value: "Active" },
  { label: "Revoked", value: "Revoked" },
];

const SESSION_STATUS_SORT_ORDER: Record<string, number> = {
  Current: 0,
  Active: 1,
  Revoked: 2,
};

const DEFAULT_SESSION_SORT_BY: SessionField = "createdAt";
const DEFAULT_SESSION_PAGE_SIZE = 10;

function getDisplayError(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return axiosError.response?.data?.message ?? axiosError.message ?? fallback;
}

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

function getSessionTitle(session: AuthSessionSummary) {
  return session.userAgent?.trim() || `Session ${session.id}`;
}

function getSessionActionLabel(session: AuthSessionSummary) {
  return session.isCurrent ? "Sign Out This Session" : "Revoke Session";
}

function getSessionActionDescription(session: AuthSessionSummary) {
  if (session.isCurrent) {
    return "This immediately signs out the current device and returns you to the login screen.";
  }

  return "This removes access for that device session immediately. The user must sign in again to continue.";
}

function getSessionStatus(session: AuthSessionSummary) {
  if (session.revokedAt) {
    return { label: "Revoked", color: "red" as const };
  }

  if (session.isCurrent) {
    return { label: "Current", color: "blue" as const };
  }

  return { label: "Active", color: "green" as const };
}

function getSessionFieldValue(
  session: AuthSessionSummary,
  field: SessionField,
): string | null {
  switch (field) {
    case "userAgent":
      return getSessionTitle(session);
    case "status":
      return getSessionStatus(session).label;
    case "ipAddress":
      return session.ipAddress?.trim() || null;
    case "createdAt":
      return session.createdAt;
    case "lastUsedAt":
      return session.lastUsedAt;
    case "expiresAt":
      return session.expiresAt;
    case "refreshExpiresAt":
      return session.refreshExpiresAt;
    case "revokedAt":
      return session.revokedAt;
    default:
      return null;
  }
}

function getSessionFilterOptions(kind: SessionFilterKind) {
  switch (kind) {
    case "date":
      return [
        { label: "Equals", value: "equals" },
        { label: "After", value: "gt" },
        { label: "On or after", value: "gte" },
        { label: "Before", value: "lt" },
        { label: "On or before", value: "lte" },
        { label: "Between", value: "between" },
      ] as Array<{ label: string; value: ListFilterOperator }>;
    case "select":
      return [
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ] as Array<{ label: string; value: ListFilterOperator }>;
    default:
      return [
        { label: "Contains", value: "contains" },
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ] as Array<{ label: string; value: ListFilterOperator }>;
  }
}

function getDefaultSessionOperator(
  kind: SessionFilterKind,
): ListFilterOperator {
  switch (kind) {
    case "date":
      return "between";
    case "select":
      return "equals";
    default:
      return "contains";
  }
}

function formatSessionFilterTagValue(filter: ListFilter): string {
  if (Array.isArray(filter.value)) {
    return filter.value
      .map((value) => String(value))
      .join(filter.operator === "between" ? " to " : ", ");
  }

  return String(filter.value);
}

function matchesSessionFilter(
  session: AuthSessionSummary,
  filter: ListFilter,
): boolean {
  const rawValue = getSessionFieldValue(session, filter.field as SessionField);
  const kind = SESSION_COLUMN_KINDS[filter.field as SessionField];

  if (kind === "date") {
    const candidate = rawValue ? Date.parse(rawValue) : Number.NaN;

    if (Number.isNaN(candidate)) {
      return false;
    }

    if (filter.operator === "between" && Array.isArray(filter.value)) {
      if (filter.value.length !== 2) {
        return true;
      }

      const start = Date.parse(String(filter.value[0]));
      const end = Date.parse(String(filter.value[1]));
      return !Number.isNaN(start) && !Number.isNaN(end)
        ? candidate >= start && candidate <= end
        : true;
    }

    const target = Date.parse(String(filter.value));
    if (Number.isNaN(target)) {
      return true;
    }

    switch (filter.operator) {
      case "equals":
        return candidate === target;
      case "gt":
        return candidate > target;
      case "gte":
        return candidate >= target;
      case "lt":
        return candidate < target;
      case "lte":
        return candidate <= target;
      default:
        return true;
    }
  }

  const candidate = (rawValue ?? "").toLowerCase();

  if (filter.operator === "in" && Array.isArray(filter.value)) {
    const allowedValues = filter.value.map((value) =>
      String(value).toLowerCase(),
    );
    return allowedValues.includes(candidate);
  }

  const target = String(filter.value).toLowerCase();

  switch (filter.operator) {
    case "equals":
      return candidate === target;
    case "contains":
      return candidate.includes(target);
    default:
      return true;
  }
}

function compareSessionValues(
  left: AuthSessionSummary,
  right: AuthSessionSummary,
  field: SessionField,
): number {
  if (field === "status") {
    return (
      SESSION_STATUS_SORT_ORDER[getSessionStatus(left).label] -
      SESSION_STATUS_SORT_ORDER[getSessionStatus(right).label]
    );
  }

  const kind = SESSION_COLUMN_KINDS[field];
  const leftValue = getSessionFieldValue(left, field);
  const rightValue = getSessionFieldValue(right, field);

  if (kind === "date") {
    const leftTimestamp = leftValue ? Date.parse(leftValue) : Number.NaN;
    const rightTimestamp = rightValue ? Date.parse(rightValue) : Number.NaN;

    if (Number.isNaN(leftTimestamp) && Number.isNaN(rightTimestamp)) {
      return 0;
    }

    if (Number.isNaN(leftTimestamp)) {
      return 1;
    }

    if (Number.isNaN(rightTimestamp)) {
      return -1;
    }

    return leftTimestamp - rightTimestamp;
  }

  return String(leftValue ?? "").localeCompare(
    String(rightValue ?? ""),
    undefined,
    {
      sensitivity: "base",
    },
  );
}

function MfaSetupCard({ setup }: { setup: MfaSetupResponse }) {
  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Text strong>Scan this code in your authenticator app</Text>
        <QRCode value={setup.otpauthUrl} size={180} />
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Issuer">{setup.issuer}</Descriptions.Item>
          <Descriptions.Item label="Account">
            {setup.accountName}
          </Descriptions.Item>
          <Descriptions.Item label="Secret">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {setup.secret}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="Enrollment URL">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {setup.otpauthUrl}
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

export default function ProfilePage() {
  const { message } = App.useApp();
  const [enableForm] = Form.useForm<MfaCodeRequest>();
  const [disableForm] = Form.useForm<MfaCodeRequest>();
  const [mfaSetupIssue, setMfaSetupIssue] = useState<string | null>(null);
  const [sessionDraftOperators, setSessionDraftOperators] = useState<
    Partial<Record<SessionField, ListFilterOperator>>
  >({});
  const sessionListQuery = useListQueryParams({
    defaultPageSize: DEFAULT_SESSION_PAGE_SIZE,
    defaultSortBy: DEFAULT_SESSION_SORT_BY,
    defaultSortOrder: DEFAULT_SORT_ORDER,
  });
  const { user, logout } = useAuth();
  const sessionsQuery = useAuthSessionsQuery(Boolean(user));
  const revokeSessionMutation = useRevokeAuthSessionMutation();
  const createMfaSetupMutation = useCreateMfaSetupMutation();
  const enableMfaMutation = useEnableMfaMutation();
  const disableMfaMutation = useDisableMfaMutation();

  const pendingSetup = createMfaSetupMutation.data;
  const canManageMfa = Boolean(
    user?.role && CAN_MANAGE_MFA.includes(user.role),
  );
  const sessionSortBy = (
    Object.hasOwn(SESSION_COLUMN_LABELS, sessionListQuery.sortBy)
      ? sessionListQuery.sortBy
      : DEFAULT_SESSION_SORT_BY
  ) as SessionField;
  const sessionSortOrder: ListSortOrder =
    sessionListQuery.sortOrder === "asc" ? "asc" : "desc";
  const sessionFilters = useMemo(
    () =>
      sessionListQuery.filters.filter(
        (filter): filter is ListFilter & { field: SessionField } =>
          Object.hasOwn(SESSION_COLUMN_LABELS, filter.field),
      ),
    [sessionListQuery.filters],
  );
  const filtersByField = useMemo(
    () =>
      Object.fromEntries(
        sessionFilters.map((filter) => [filter.field, filter]),
      ) as Partial<Record<SessionField, ListFilter>>,
    [sessionFilters],
  );

  const setDraftOperator = (
    field: SessionField,
    operator: ListFilterOperator,
  ) => {
    setSessionDraftOperators((current) => ({
      ...current,
      [field]: operator,
    }));
  };

  const removeSessionFilter = (field: SessionField) => {
    sessionListQuery.removeFilter(field);
  };

  const applySessionFilter = (
    field: SessionField,
    operator: ListFilterOperator,
    value: ListFilter["value"] | undefined,
  ) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      removeSessionFilter(field);
      return;
    }

    sessionListQuery.upsertFilter({ field, operator, value });
  };

  const clearSessionSort = () => {
    sessionListQuery.setSort(DEFAULT_SESSION_SORT_BY, DEFAULT_SORT_ORDER);
  };

  const hasCustomSort =
    sessionSortBy !== DEFAULT_SESSION_SORT_BY ||
    sessionSortOrder !== DEFAULT_SORT_ORDER;

  const handleRevokeSession = async (session: AuthSessionSummary) => {
    try {
      await revokeSessionMutation.mutateAsync(session.id);

      if (session.isCurrent) {
        await logout({
          revokeRemote: false,
          redirectTo: "/login?reason=session-revoked",
        });
        return;
      }

      message.success("Session revoked.");
    } catch (error) {
      message.error(getDisplayError(error, "Failed to revoke session."));
    }
  };

  const sessionRows = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const normalizedSearch = sessionListQuery.search.trim().toLowerCase();
    const searchedSessions = normalizedSearch
      ? sessions.filter((session) => {
          const searchFields = [
            session.id,
            getSessionTitle(session),
            session.ipAddress ?? "",
            getSessionStatus(session).label,
            formatDateTime(session.createdAt),
            formatDateTime(session.lastUsedAt),
            formatDateTime(session.expiresAt),
            formatDateTime(session.refreshExpiresAt),
            formatDateTime(session.revokedAt),
          ];

          return searchFields.some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          );
        })
      : sessions;

    const filteredSessions = searchedSessions.filter((session) =>
      sessionFilters.every((filter) => matchesSessionFilter(session, filter)),
    );

    const sortedSessions = [...filteredSessions].sort((left, right) => {
      const comparison = compareSessionValues(left, right, sessionSortBy);
      return sessionSortOrder === "asc" ? comparison : -comparison;
    });

    return sortedSessions;
  }, [
    sessionFilters,
    sessionListQuery.search,
    sessionSortBy,
    sessionSortOrder,
    sessionsQuery.data,
  ]);
  const renderColumnTitle = (field: SessionField) => {
    const kind = SESSION_COLUMN_KINDS[field];
    const activeFilter = filtersByField[field];
    const selectedOperator =
      activeFilter?.operator ??
      sessionDraftOperators[field] ??
      getDefaultSessionOperator(kind);

    return (
      <Space size={4} wrap>
        <span>{SESSION_COLUMN_LABELS[field]}</span>
        <Tooltip
          title={
            sessionSortBy === field
              ? sessionSortOrder === "asc"
                ? "Sorted ascending"
                : "Sorted descending"
              : "Sort column"
          }
        >
          <Button
            size="small"
            type={sessionSortBy === field ? "primary" : "default"}
            aria-label={`Sort ${SESSION_COLUMN_LABELS[field]}`}
            icon={
              sessionSortBy === field ? (
                sessionSortOrder === "asc" ? (
                  <SortAscendingOutlined />
                ) : (
                  <SortDescendingOutlined />
                )
              ) : (
                <SwapOutlined />
              )
            }
            onClick={() => {
              if (sessionSortBy !== field) {
                sessionListQuery.setSort(field, "asc");
                return;
              }

              if (sessionSortOrder === "asc") {
                sessionListQuery.setSort(field, "desc");
                return;
              }

              clearSessionSort();
            }}
          />
        </Tooltip>
        <Popover
          trigger="click"
          content={
            <Space direction="vertical" size={8} style={{ minWidth: 240 }}>
              <Select
                value={selectedOperator}
                options={getSessionFilterOptions(kind)}
                onChange={(nextOperator) => {
                  setDraftOperator(field, nextOperator);
                  if (activeFilter) {
                    removeSessionFilter(field);
                  }
                }}
              />
              {kind === "select" ? (
                <Select
                  allowClear
                  showSearch
                  mode={selectedOperator === "in" ? "multiple" : undefined}
                  placeholder={`Filter ${SESSION_COLUMN_LABELS[field]}`}
                  value={activeFilter?.value as string | string[] | undefined}
                  options={SESSION_STATUS_OPTIONS}
                  onChange={(value) => {
                    applySessionFilter(
                      field,
                      selectedOperator,
                      value as ListFilter["value"] | undefined,
                    );
                  }}
                />
              ) : null}
              {kind === "date" ? (
                selectedOperator === "between" ? (
                  <RangePicker
                    showTime
                    value={
                      Array.isArray(activeFilter?.value) &&
                      activeFilter.value.length === 2
                        ? [
                            dayjs(String(activeFilter.value[0])),
                            dayjs(String(activeFilter.value[1])),
                          ]
                        : null
                    }
                    onChange={(value) => {
                      if (!value?.[0] || !value?.[1]) {
                        removeSessionFilter(field);
                        return;
                      }

                      applySessionFilter(field, selectedOperator, [
                        value[0].toISOString(),
                        value[1].toISOString(),
                      ]);
                    }}
                  />
                ) : (
                  <DatePicker
                    showTime
                    value={
                      activeFilter && !Array.isArray(activeFilter.value)
                        ? dayjs(String(activeFilter.value))
                        : null
                    }
                    onChange={(value) => {
                      applySessionFilter(
                        field,
                        selectedOperator,
                        value ? value.toISOString() : undefined,
                      );
                    }}
                  />
                )
              ) : null}
              {kind === "text" ? (
                <Input
                  allowClear
                  autoFocus
                  placeholder={
                    selectedOperator === "in"
                      ? "Comma-separated values"
                      : `Search ${SESSION_COLUMN_LABELS[field]}`
                  }
                  value={
                    Array.isArray(activeFilter?.value)
                      ? activeFilter.value.join(", ")
                      : typeof activeFilter?.value === "string"
                        ? activeFilter.value
                        : ""
                  }
                  onChange={(event) => {
                    const raw = event.target.value;

                    if (!raw.trim()) {
                      removeSessionFilter(field);
                      return;
                    }

                    if (selectedOperator === "in") {
                      applySessionFilter(
                        field,
                        selectedOperator,
                        raw
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      );
                      return;
                    }

                    applySessionFilter(field, selectedOperator, raw);
                  }}
                />
              ) : null}
              <Button size="small" onClick={() => removeSessionFilter(field)}>
                Clear {SESSION_COLUMN_LABELS[field]} filter
              </Button>
            </Space>
          }
        >
          <Button
            size="small"
            type={activeFilter ? "primary" : "default"}
            aria-label={`Filter ${SESSION_COLUMN_LABELS[field]}`}
            icon={<FilterOutlined />}
          />
        </Popover>
      </Space>
    );
  };

  const sessionColumns = [
    {
      title: renderColumnTitle("userAgent"),
      dataIndex: "userAgent",
      key: "userAgent",
      width: 320,
      render: (_value: string | null, session: AuthSessionSummary) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Text strong>{getSessionTitle(session)}</Text>
          <Text type="secondary">{session.id}</Text>
        </Space>
      ),
    },
    {
      title: renderColumnTitle("status"),
      key: "status",
      width: 140,
      render: (_value: unknown, session: AuthSessionSummary) => {
        const status = getSessionStatus(session);

        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: renderColumnTitle("ipAddress"),
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 160,
      render: (value: string | null) => value?.trim() || "Not reported",
    },
    {
      title: renderColumnTitle("createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: renderColumnTitle("lastUsedAt"),
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      width: 180,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: renderColumnTitle("expiresAt"),
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: renderColumnTitle("refreshExpiresAt"),
      dataIndex: "refreshExpiresAt",
      key: "refreshExpiresAt",
      width: 190,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: renderColumnTitle("revokedAt"),
      dataIndex: "revokedAt",
      key: "revokedAt",
      width: 180,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_value: unknown, session: AuthSessionSummary) => {
        const isRevoking =
          revokeSessionMutation.isPending &&
          revokeSessionMutation.variables === session.id;

        return (
          <Button
            danger
            loading={isRevoking}
            disabled={Boolean(session.revokedAt)}
            title={getSessionActionDescription(session)}
            onClick={() => void handleRevokeSession(session)}
          >
            {getSessionActionLabel(session)}
          </Button>
        );
      },
    },
  ];

  const handleCreateMfaSetup = async () => {
    setMfaSetupIssue(null);

    try {
      await createMfaSetupMutation.mutateAsync();
      message.success("MFA setup generated.");
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const issueMessage = getDisplayError(
        error,
        "MFA setup is unavailable until the API environment is configured.",
      );

      if (axiosError.response?.status === 503) {
        setMfaSetupIssue(issueMessage);
        return;
      }

      message.error(issueMessage);
    }
  };

  const handleEnableMfa = async (values: MfaCodeRequest) => {
    try {
      const response = await enableMfaMutation.mutateAsync(values);
      message.success(response.message || "MFA enabled.");
      enableForm.resetFields();
      await logout({
        revokeRemote: false,
        redirectTo: "/login?reason=mfa-updated",
      });
    } catch (error) {
      message.error(getDisplayError(error, "Failed to enable MFA."));
    }
  };

  const handleDisableMfa = async (values: MfaCodeRequest) => {
    try {
      const response = await disableMfaMutation.mutateAsync(values);
      message.success(response.message || "MFA disabled.");
      disableForm.resetFields();
      await logout({
        revokeRemote: false,
        redirectTo: "/login?reason=mfa-updated",
      });
    } catch (error) {
      message.error(getDisplayError(error, "Failed to disable MFA."));
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Account Security
      </Title>

      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label="ID">
            {String(user?.id ?? "N/A")}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {user?.email ?? "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            {user?.role ? getRoleLabel(user.role) : "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            {user?.name ?? "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="MFA status">
            {user?.mfaEnabled ? (
              <Tag color="green">Enabled</Tag>
            ) : (
              <Tag>Disabled</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="MFA enabled at">
            {formatDateTime(user?.mfaEnabledAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Device Sessions"
        extra={
          <Button
            onClick={() => void sessionsQuery.refetch()}
            loading={sessionsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      >
        <Alert
          style={{ marginBottom: 16 }}
          type="warning"
          showIcon
          message="Session controls affect live access"
          description="Revoking another session ends access on that device immediately. Signing out the current session returns you to the login screen."
        />

        {sessionsQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load sessions"
            description={getDisplayError(
              sessionsQuery.error,
              "Failed to load account sessions.",
            )}
          />
        ) : (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {sessionFilters.length > 0 || hasCustomSort ? (
              <Space wrap>
                {sessionFilters.map((filter) => (
                  <Tag
                    key={filter.field}
                    closable
                    color="blue"
                    onClose={() =>
                      removeSessionFilter(filter.field as SessionField)
                    }
                  >
                    {SESSION_COLUMN_LABELS[filter.field as SessionField]}:{" "}
                    {formatSessionFilterTagValue(filter)}
                  </Tag>
                ))}
                {hasCustomSort ? (
                  <Tag closable color="processing" onClose={clearSessionSort}>
                    Sorted by {SESSION_COLUMN_LABELS[sessionSortBy]} (
                    {sessionSortOrder === "asc" ? "ascending" : "descending"})
                  </Tag>
                ) : null}
                <Button
                  size="small"
                  onClick={() => {
                    sessionListQuery.clearFilters();
                    clearSessionSort();
                  }}
                >
                  Clear column filters
                </Button>
              </Space>
            ) : null}
            <Input.Search
              allowClear
              placeholder="Search device sessions"
              value={sessionListQuery.search}
              onChange={(event) => {
                sessionListQuery.setSearch(event.target.value);
              }}
            />
            <ResizableTable
              rowKey="id"
              loading={sessionsQuery.isLoading || sessionsQuery.isFetching}
              dataSource={sessionRows}
              columns={sessionColumns}
              storageKey="profile-device-sessions-table-widths"
              showColumnVisibilitySelector
              stickyEdgeColumnCount={{ left: 1, right: 1 }}
              scroll={{ x: 1450 }}
              locale={{
                emptyText: sessionListQuery.search
                  ? "No device sessions match your search."
                  : "No server-side sessions found.",
              }}
              pagination={{
                current: sessionListQuery.page,
                pageSize: sessionListQuery.pageSize,
                total: sessionRows.length,
                onChange: (nextPage, nextPageSize) => {
                  if (nextPageSize !== sessionListQuery.pageSize) {
                    sessionListQuery.setPageSize(nextPageSize);
                    return;
                  }

                  sessionListQuery.setPage(nextPage);
                },
              }}
            />
          </Space>
        )}
      </Card>

      <Card title="Multi-Factor Authentication">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            type={user?.mfaEnabled ? "success" : "info"}
            showIcon
            message={user?.mfaEnabled ? "MFA is enabled" : "MFA is not enabled"}
            description={
              canManageMfa
                ? "Privileged accounts can enroll an authenticator app and must sign in again after security settings change."
                : "MFA enrollment is only available to privileged accounts in this dashboard."
            }
          />

          {canManageMfa ? (
            <Alert
              type="warning"
              showIcon
              message="Security changes will sign out all active sessions"
              description="After MFA is enabled or disabled, the backend revokes active sessions and you must sign in again with the updated security settings."
            />
          ) : null}

          {mfaSetupIssue ? (
            <Alert
              type="error"
              showIcon
              message="MFA setup is unavailable on the API"
              description={`${mfaSetupIssue} Operator action is required on the backend before MFA enrollment can be used.`}
            />
          ) : null}

          {canManageMfa ? (
            user?.mfaEnabled ? (
              <Form<MfaCodeRequest>
                form={disableForm}
                layout="vertical"
                onFinish={(values) => void handleDisableMfa(values)}
                requiredMark={false}
              >
                <Form.Item
                  name="code"
                  label="Authentication code"
                  rules={[
                    {
                      required: true,
                      message: "Authentication code is required",
                    },
                    {
                      len: 6,
                      message:
                        "Enter the 6-digit code from your authenticator app",
                    },
                  ]}
                >
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter 6-digit code to disable MFA"
                  />
                </Form.Item>

                <Button
                  danger
                  htmlType="submit"
                  loading={disableMfaMutation.isPending}
                >
                  Disable MFA
                </Button>
              </Form>
            ) : (
              <>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => void handleCreateMfaSetup()}
                    loading={createMfaSetupMutation.isPending}
                  >
                    {pendingSetup ? "Regenerate Setup" : "Generate Setup"}
                  </Button>
                </Space>

                {pendingSetup ? <MfaSetupCard setup={pendingSetup} /> : null}

                {pendingSetup ? (
                  <Form<MfaCodeRequest>
                    form={enableForm}
                    layout="vertical"
                    onFinish={(values) => void handleEnableMfa(values)}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="code"
                      label="Authentication code"
                      rules={[
                        {
                          required: true,
                          message: "Authentication code is required",
                        },
                        {
                          len: 6,
                          message:
                            "Enter the 6-digit code from your authenticator app",
                        },
                      ]}
                    >
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="Enter 6-digit code to enable MFA"
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={enableMfaMutation.isPending}
                    >
                      Enable MFA
                    </Button>
                  </Form>
                ) : null}
              </>
            )
          ) : null}
        </Space>
      </Card>
    </Space>
  );
}
