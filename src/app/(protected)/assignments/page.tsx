"use client";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Statistic,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { useAuth } from "@/context/AuthContext";
import {
  useAssignmentsQuery,
  useCreateAssignmentMutation,
} from "@/features/assignments/api";
import { useIncidentsQuery } from "@/features/incidents/api";
import { useRespondersQuery } from "@/features/reference-data/api";
import {
  canAccessCrudResource,
  canManageAssignments,
} from "@/lib/auth/navigation";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import {
  formatDisplayDateTime,
  formatDisplayRelativeTime,
} from "@/lib/format/date-time";
import type { ApiErrorPayload, Assignment } from "@/types/api";
import styles from "./page.module.css";

const { Title, Text } = Typography;

interface AssignmentFormValues {
  incidentId: string;
  responderId: string;
  responseStart?: string;
  responseEnd?: string;
  outcome?: string;
  notes?: string;
}

export default function AssignmentsPage() {
  const { message } = App.useApp();
  const { user, capabilities, isAuthenticated } = useAuth();
  const router = useRouter();
  const authNavigationContext = {
    role: user?.role,
    capabilities,
    isAuthenticated,
  };
  const canAccessPage = canAccessCrudResource(
    authNavigationContext,
    "assignments",
  );
  const listQuery = useListQueryParams();
  const optionQueryState: ListQueryState = {
    page: 1,
    pageSize: 200,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
  };

  const assignmentsQuery = useAssignmentsQuery(listQuery, canAccessPage);
  const incidentsQuery = useIncidentsQuery(optionQueryState, canAccessPage);
  const respondersQuery = useRespondersQuery(optionQueryState, canAccessPage);
  const createMutation = useCreateAssignmentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<AssignmentFormValues>();
  const rows = useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data],
  );
  const visibleRows = useMemo(() => {
    if (!listQuery.search) {
      return rows;
    }

    const searchValue = listQuery.search.toLowerCase();
    return rows.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchValue),
    );
  }, [listQuery.search, rows]);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access assignments."
      />
    );
  }

  const pagination = assignmentsQuery.data?.pagination;
  const incidents = incidentsQuery.data?.data ?? [];
  const responders = respondersQuery.data?.data ?? [];
  const incidentLabels = new Map(
    (incidentsQuery.data?.data ?? []).map((item) => [
      String(item.id),
      item.description ?? `Incident ${item.id}`,
    ]),
  );
  const responderLabels = new Map(
    (respondersQuery.data?.data ?? []).map((item) => [
      String(item.id),
      item.name ?? `Responder ${item.id}`,
    ]),
  );

  const columns: Array<SharedTableColumn<Assignment>> = [
    {
      key: "incidentId",
      title: "Incident",
      filterKind: "select",
      selectOptions: incidentLabels,
      width: 280,
      render: (_value, row) => {
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
      key: "responderId",
      title: "Responder",
      filterKind: "select",
      selectOptions: responderLabels,
      width: 180,
      render: (_value, row) => {
        const responder = responders.find(
          (item) => String(item.id) === String(row.responderId ?? ""),
        );
        const label =
          responder?.name ?? `Responder ${row.responderId ?? "N/A"}`;

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
      key: "outcome",
      title: "Outcome",
      filterKind: "text",
      width: 180,
      render: (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value
          : "Pending",
    },
    {
      key: "notes",
      title: "Notes",
      filterKind: "text",
      width: 240,
      render: (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value
          : "No notes",
    },
    {
      key: "assignedDate",
      title: "Assigned",
      filterKind: "date",
      width: 180,
      render: (value) => {
        const formatted = formatDisplayDateTime(value);
        const relative = formatDisplayRelativeTime(value);

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
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      width: 180,
      render: (value) => {
        const formatted = formatDisplayDateTime(value);
        const relative = formatDisplayRelativeTime(value);

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

  if (assignmentsQuery.isLoading) {
    return <LoadingState />;
  }

  if (assignmentsQuery.error) {
    return <ErrorState message={String(assignmentsQuery.error)} />;
  }

  const canCreate = canManageAssignments(authNavigationContext);
  const linkedIncidentCount = visibleRows.filter((item) =>
    Boolean(item.incidentId),
  ).length;
  const outcomeCount = visibleRows.filter((item) =>
    Boolean(item.outcome),
  ).length;

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
            {canCreate ? (
              <Button
                className={styles.heroAction}
                type="primary"
                size="large"
                onClick={() => setOpen(true)}
              >
                Create Assignment
              </Button>
            ) : null}
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
              <Statistic title="Visible rows" value={visibleRows.length} />
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
              <Statistic title="With outcome" value={outcomeCount} />
              <Text className={styles.metricLabel}>
                Assignments that have recorded an outcome.
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
              {visibleRows.length} assignment
              {visibleRows.length === 1 ? "" : "s"} in the current view.
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
          <SharedTable<Assignment>
            rows={rows}
            columns={columns}
            storageKey="assignments-shared-table"
            loading={assignmentsQuery.isFetching}
            page={listQuery.page}
            pageSize={listQuery.pageSize}
            paginationMeta={pagination}
            onPageChange={listQuery.setPage}
            onPageSizeChange={listQuery.setPageSize}
            globalSearch={listQuery.search}
            sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
            onSortChange={(columnKey, order) => {
              if (columnKey === "createdAt" || columnKey === "updatedAt") {
                listQuery.setSort(columnKey, order);
              }
            }}
            serverDateFilters={{
              createdAt: {
                from: listQuery.createdFrom,
                to: listQuery.createdTo,
              },
              updatedAt: {
                from: listQuery.updatedFrom,
                to: listQuery.updatedTo,
              },
            }}
            onServerDateFilterChange={(columnKey, value) => {
              if (columnKey === "createdAt") {
                listQuery.setCreatedRange(value.from, value.to);
                return;
              }

              listQuery.setUpdatedRange(value.from, value.to);
            }}
            topToolbar={null}
            scrollX={1080}
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
                {visibleRows.length - outcomeCount} visible assignments still
                need an outcome recorded.
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
                label: item.name ?? `Responder ${item.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="outcome" label="Outcome">
            <Input />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
