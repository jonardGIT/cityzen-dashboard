"use client";

import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Typography } from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useAssignmentsQuery, useCreateAssignmentMutation } from "@/features/assignments/api";
import { useIncidentsQuery } from "@/features/incidents/api";
import { useRespondersQuery, useStatusesQuery } from "@/features/reference-data/api";
import { CAN_CREATE_ASSIGNMENT } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import type { ApiErrorPayload } from "@/types/api";

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
  const tableState = useTableQueryParams(10);
  const assignmentsQuery = useAssignmentsQuery(tableState.page, tableState.pageSize);
  const incidentsQuery = useIncidentsQuery(1, 200);
  const respondersQuery = useRespondersQuery(1, 200);
  const statusesQuery = useStatusesQuery(1, 200);
  const createMutation = useCreateAssignmentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<AssignmentFormValues>();
  const rows = useMemo(() => {
    const items = assignmentsQuery.data?.data ?? [];
    if (!tableState.search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(tableState.search.toLowerCase()),
    );
  }, [assignmentsQuery.data, tableState.search]);

  const pagination = assignmentsQuery.data?.pagination;

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

      <Card>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search assignments"
            value={tableState.search}
            onChange={(event) => tableState.setSearch(event.target.value)}
          />
          <Table
            rowKey="id"
            loading={assignmentsQuery.isFetching}
            dataSource={rows}
            scroll={{ x: 920 }}
            pagination={{
              current: tableState.page,
              pageSize: tableState.pageSize,
              total: pagination?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== tableState.pageSize) {
                  tableState.setPageSize(nextPageSize);
                  return;
                }

                tableState.setPage(nextPage);
              },
            }}
            columns={[
              { title: "Incident", dataIndex: "incidentId", key: "incidentId" },
              { title: "Responder", dataIndex: "responderId", key: "responderId" },
              { title: "Status", dataIndex: "statusId", key: "statusId" },
              {
                title: "Assigned",
                dataIndex: "assignedDate",
                key: "assignedDate",
                render: (value: unknown) => {
                  const formatted = formatDateTime(value);
                  const relative = formatRelativeTime(value);

                  return (
                    <Space orientation="vertical" size={0}>
                      <Text>{formatted}</Text>
                      {relative ? <Text type="secondary">{relative}</Text> : null}
                    </Space>
                  );
                },
              },
              {
                title: "Created",
                dataIndex: "createdAt",
                key: "createdAt",
                render: (value: unknown) => {
                  const formatted = formatDateTime(value);
                  const relative = formatRelativeTime(value);

                  return (
                    <Space orientation="vertical" size={0}>
                      <Text>{formatted}</Text>
                      {relative ? <Text type="secondary">{relative}</Text> : null}
                    </Space>
                  );
                },
              },
              { title: "Notes", dataIndex: "notes", key: "notes" },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title="Create Assignment"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form<AssignmentFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="incidentId" label="Incident" rules={[{ required: true }]}>
            <Select
              options={(incidentsQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.description ?? `Incident ${item.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="responderId" label="Responder" rules={[{ required: true }]}>
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
