"use client";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { ResizableTable } from "@/components/common/ResizableTable";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  useAssignmentsQuery,
  useCreateAssignmentMutation,
} from "@/features/assignments/api";
import { useIncidentsQuery } from "@/features/incidents/api";
import {
  useRespondersQuery,
  useStatusesQuery,
} from "@/features/reference-data/api";
import { CAN_CREATE_ASSIGNMENT } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { ApiErrorPayload, Assignment } from "@/types/api";
import styles from "./page.module.css";

const { Title, Text } = Typography;

interface AssignmentFormValues {
  incidentId: string;
  responderId: string;
  statusId?: string;
  notes?: string;
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatRelativeTime(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const diffMs = parsed.getTime() - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hourMs) {
    return rtf.format(Math.round(diffMs / minuteMs), "minute");
  }

  if (Math.abs(diffMs) < dayMs) {
    return rtf.format(Math.round(diffMs / hourMs), "hour");
  }

  return rtf.format(Math.round(diffMs / dayMs), "day");
}

function getStatusColor(statusName: string): string {
  const normalized = statusName.trim().toLowerCase();

  if (
    ["resolved", "closed", "cancelled", "canceled", "completed"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "green";
  }

  if (
    ["in progress", "dispatched", "responding", "ongoing"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "processing";
  }

  return "gold";
}

export default function AssignmentsPage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const router = useRouter();
  const listQuery = useListQueryParams();
  const optionQueryState: ListQueryState = {
    page: 1,
    pageSize: 200,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
  };

  const assignmentsQuery = useAssignmentsQuery(listQuery);
  const incidentsQuery = useIncidentsQuery(optionQueryState);
  const respondersQuery = useRespondersQuery(optionQueryState);
  const statusesQuery = useStatusesQuery(optionQueryState);
  const createMutation = useCreateAssignmentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<AssignmentFormValues>();
  const incidents = incidentsQuery.data?.data ?? [];
  const responders = respondersQuery.data?.data ?? [];
  const statuses = statusesQuery.data?.data ?? [];
  const rows = useMemo(() => {
    const items = assignmentsQuery.data?.data ?? [];
    if (!listQuery.search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(listQuery.search.toLowerCase()),
    );
  }, [assignmentsQuery.data, listQuery.search]);

  const pagination = assignmentsQuery.data?.pagination;

  if (assignmentsQuery.isLoading) {
    return <LoadingState />;
  }

  if (assignmentsQuery.error) {
    return <ErrorState message={String(assignmentsQuery.error)} />;
  }

  const canCreate = hasRole(...CAN_CREATE_ASSIGNMENT);
  const linkedIncidentCount = rows.filter((item) =>
    Boolean(item.incidentId),
  ).length;
  const unassignedStatusCount = rows.filter((item) => !item.statusId).length;
  const columns = [
    {
      title: "Incident",
      key: "incidentId",
      width: 280,
      render: (_: unknown, row: Assignment) => {
        const incident = incidents.find(
          (item) => String(item.id) === String(row.incidentId ?? ""),
        );

        return (
          <div className={styles.cellStack}>
            <Button
              type="link"
              style={{ paddingInline: 0, justifyContent: "flex-start" }}
              onClick={() => {
                if (row.incidentId) {
                  router.push(`/incidents/${row.incidentId}`);
                }
              }}
            >
              {incident?.description ?? `Incident ${row.incidentId ?? "N/A"}`}
            </Button>
            <Text className={styles.cellMeta}>
              {incident ? "Open workspace" : "Incident record unavailable"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Responder",
      key: "responderId",
      width: 180,
      render: (_: unknown, row: Assignment) => {
        const responder = responders.find(
          (item) => String(item.id) === String(row.responderId ?? ""),
        );
        const label =
          responder?.name ??
          (`${responder?.firstName ?? ""} ${responder?.lastName ?? ""}`.trim() ||
            responder?.email ||
            `Responder ${row.responderId ?? "N/A"}`);

        return (
          <div className={styles.cellStack}>
            <Text>{label}</Text>
            <Text className={styles.cellMeta}>
              {responder?.role ?? "Responder"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "statusId",
      width: 140,
      render: (_: unknown, row: Assignment) => {
        const status = statuses.find(
          (item) => String(item.id) === String(row.statusId ?? ""),
        );
        const label = status?.name ?? "Status not set";
        return <Tag color={getStatusColor(label)}>{label}</Tag>;
      },
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      width: 240,
      render: (value: string | undefined) => value?.trim() || "No notes",
    },
    {
      title: "Assigned",
      dataIndex: "assignedDate",
      key: "assignedDate",
      width: 180,
      render: (value: unknown) => {
        const formatted = formatDateTime(value);
        const relative = formatRelativeTime(value);

        return (
          <div className={styles.cellStack}>
            <Text>{formatted}</Text>
            <Text className={styles.cellMeta}>
              {relative ?? "Assignment time unavailable"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: unknown) => {
        const formatted = formatDateTime(value);
        const relative = formatRelativeTime(value);

        return (
          <div className={styles.cellStack}>
            <Text>{formatted}</Text>
            <Text className={styles.cellMeta}>
              {relative ?? "Created time unavailable"}
            </Text>
          </div>
        );
      },
    },
  ];

  const submit = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync(values);
      message.success("Assignment created");
      form.resetFields();
      setOpen(false);
    } catch (error) {
      const mapped = mapValidationErrorsToForm(form, error);
      if (!mapped) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        if (axiosError.response?.data?.message) {
          message.error(axiosError.response.data.message);
        }
      }
    }
  };

  return (
    <div className={styles.pageShell}>
      <Card className={styles.heroCard}>
        <div className={styles.heroInner}>
          <div className={styles.heroHeader}>
            <div className={styles.heroCopy}>
              <Text className={styles.eyebrow}>Dispatch assignments</Text>
              <Title level={3} className={styles.heroTitle}>
                Coordinate incident handoff and field response from one queue.
              </Title>
              <Text className={styles.heroDescription}>
                Review assignment records with responder, status, and timing
                context so dispatch activity is readable at a glance.
              </Text>
            </div>
            <RoleGuard allowedRoles={CAN_CREATE_ASSIGNMENT} disableOnly>
              <Button
                className={styles.heroAction}
                type="primary"
                size="large"
                onClick={() => setOpen(true)}
                disabled={!canCreate}
              >
                Create Assignment
              </Button>
            </RoleGuard>
          </div>

          <div className={styles.heroMetrics}>
            <div className={styles.metricTile}>
              <Statistic
                title="Assignments"
                value={pagination?.total ?? rows.length}
              />
              <Text className={styles.metricLabel}>
                Current server-backed queue size.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic title="Visible rows" value={rows.length} />
              <Text className={styles.metricLabel}>
                Current page after search and filters.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic title="Linked incidents" value={linkedIncidentCount} />
              <Text className={styles.metricLabel}>
                Assignments that resolve to incident records.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic title="Missing status" value={unassignedStatusCount} />
              <Text className={styles.metricLabel}>
                Assignments needing explicit dispatch state.
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.controlCard}>
        <div className={styles.controlStack}>
          <div className={styles.controlHeader}>
            <Input.Search
              allowClear
              placeholder="Search assignments"
              value={listQuery.search}
              onChange={(event) => listQuery.setSearch(event.target.value)}
              style={{ maxWidth: 420 }}
            />
            <Text className={styles.controlMeta}>
              {rows.length} assignment{rows.length === 1 ? "" : "s"} in the
              current view.
            </Text>
          </div>
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(assignmentsQuery.isFetching)}
          />
        </div>
      </Card>

      <div className={styles.contentGrid}>
        <Card className={`${styles.tableCard} ${styles.compactTable}`}>
          <div className={styles.sectionHeader}>
            <Title level={4} className={styles.sectionTitle}>
              Assignment queue
            </Title>
            <Text className={styles.sectionDescription}>
              Inspect dispatch records with incident, responder, status, and
              timing metadata in one table.
            </Text>
          </div>
          <ResizableTable
            rowKey="id"
            loading={assignmentsQuery.isFetching}
            dataSource={rows}
            storageKey="assignments-queue-widths"
            showColumnVisibilitySelector
            scroll={{ x: 1080 }}
            pagination={{
              current: listQuery.page,
              pageSize: listQuery.pageSize,
              total: pagination?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== listQuery.pageSize) {
                  listQuery.setPageSize(nextPageSize);
                  return;
                }

                listQuery.setPage(nextPage);
              },
            }}
            columns={columns}
          />
        </Card>

        <Card className={styles.sidebarCard}>
          <div className={styles.sectionHeader}>
            <Title level={4} className={styles.sectionTitle}>
              Dispatch guidance
            </Title>
            <Text className={styles.sectionDescription}>
              Keep assignment records clean enough that the dashboard and
              incident workspace can reflect them immediately.
            </Text>
          </div>
          <div className={styles.sidebarList}>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Incident link</Text>
              <Text>
                Assignments should point to the exact incident so workspace
                navigation stays precise.
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Dispatch status</Text>
              <Text>
                Set a status when possible so operators can scan active versus
                completed handoff records.
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Notes</Text>
              <Text>
                Add context that explains the handoff, expected response, or
                operational blockers.
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Current signal</Text>
              <Text>
                {unassignedStatusCount} visible assignments still need an
                explicit assignment status.
              </Text>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title="Create Assignment"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form<AssignmentFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="incidentId"
            label="Incident"
            rules={[{ required: true }]}
          >
            <Select
              options={(incidentsQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.description ?? `Incident ${item.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="responderId"
            label="Responder"
            rules={[{ required: true }]}
          >
            <Select
              options={(respondersQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label:
                  item.name ??
                  (`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
                    `Responder ${item.id}`),
              }))}
            />
          </Form.Item>

          <Form.Item name="statusId" label="Status">
            <Select
              allowClear
              options={(statusesQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Status ${item.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
