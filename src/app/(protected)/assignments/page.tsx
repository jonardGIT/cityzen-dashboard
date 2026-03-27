"use client";

import { App, Button, Form, Input, Modal, Select, Space, Typography } from "antd";
import { AxiosError } from "axios";
import { useState } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SharedTable, type SharedTableColumn } from "@/components/crud/SharedTable";
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

export default function AssignmentsPage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
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
  const rows = assignmentsQuery.data?.data ?? [];

  const pagination = assignmentsQuery.data?.pagination;
  const incidentLabels = new Map(
    (incidentsQuery.data?.data ?? []).map((item) => [String(item.id), item.description ?? `Incident ${item.id}`]),
  );
  const responderLabels = new Map(
    (respondersQuery.data?.data ?? []).map((item) => [
      String(item.id),
      item.name ??
        (`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || `Responder ${item.id}`),
    ]),
  );
  const statusLabels = new Map(
    (statusesQuery.data?.data ?? []).map((item) => [String(item.id), item.name ?? `Status ${item.id}`]),
  );

  const columns: Array<SharedTableColumn<Assignment>> = [
    { key: "incidentId", title: "Incident", filterKind: "select", selectOptions: incidentLabels },
    { key: "responderId", title: "Responder", filterKind: "select", selectOptions: responderLabels },
    { key: "statusId", title: "Status", filterKind: "select", selectOptions: statusLabels },
    { key: "notes", title: "Notes", filterKind: "text" },
    {
      key: "assignedDate",
      title: "Assigned",
      filterKind: "date",
      render: (value) => {
        const formatted = formatDateTime(value);
        const relative = formatRelativeTime(value);

        return (
          <Space direction="vertical" size={0}>
            <Text>{formatted}</Text>
            {relative ? <Text type="secondary">{relative}</Text> : null}
          </Space>
        );
      },
    },
    {
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      render: (value) => {
        const formatted = formatDateTime(value);
        const relative = formatRelativeTime(value);

        return (
          <Space direction="vertical" size={0}>
            <Text>{formatted}</Text>
            {relative ? <Text type="secondary">{relative}</Text> : null}
          </Space>
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

  const canCreate = hasRole(...CAN_CREATE_ASSIGNMENT);

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
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Assignments
        </Title>
        <RoleGuard allowedRoles={CAN_CREATE_ASSIGNMENT} disableOnly>
          <Button type="primary" onClick={() => setOpen(true)} disabled={!canCreate}>
            Create Assignment
          </Button>
        </RoleGuard>
      </Space>

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
        onGlobalSearchChange={listQuery.setSearch}
        globalSearchPlaceholder="Search assignments"
        sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
        onSortChange={(columnKey, order) => {
          if (columnKey === "createdAt" || columnKey === "updatedAt") {
            listQuery.setSort(columnKey, order);
          }
        }}
        serverDateFilters={{
          createdAt: { from: listQuery.createdFrom, to: listQuery.createdTo },
          updatedAt: { from: listQuery.updatedFrom, to: listQuery.updatedTo },
        }}
        onServerDateFilterChange={(columnKey, value) => {
          if (columnKey === "createdAt") {
            listQuery.setCreatedRange(value.from, value.to);
            return;
          }

          listQuery.setUpdatedRange(value.from, value.to);
        }}
        topToolbar={
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(assignmentsQuery.isFetching)}
          />
        }
        scrollX={920}
      />

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
    </Space>
  );
}
