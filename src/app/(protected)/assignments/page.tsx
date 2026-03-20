"use client";

import { Button, Card, Form, Input, Modal, Select, Space, Table, Typography, message } from "antd";
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

const { Title } = Typography;

interface AssignmentFormValues {
  incidentId: string;
  responderId: string;
  statusId?: string;
  notes?: string;
}

export default function AssignmentsPage() {
  const { hasRole } = useAuth();
  const assignmentsQuery = useAssignmentsQuery();
  const incidentsQuery = useIncidentsQuery();
  const respondersQuery = useRespondersQuery();
  const statusesQuery = useStatusesQuery();
  const createMutation = useCreateAssignmentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<AssignmentFormValues>();
  const tableState = useTableQueryParams(10);

  const allRows = useMemo(() => {
    const rows = assignmentsQuery.data ?? [];
    if (!tableState.search) {
      return rows;
    }

    return rows.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(tableState.search.toLowerCase()),
    );
  }, [assignmentsQuery.data, tableState.search]);

  const pagedRows = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return allRows.slice(start, start + tableState.pageSize);
  }, [allRows, tableState.page, tableState.pageSize]);

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
            dataSource={pagedRows}
            scroll={{ x: 920 }}
            pagination={{
              current: tableState.page,
              pageSize: tableState.pageSize,
              total: allRows.length,
              onChange: (page, pageSize) => {
                tableState.setPage(page);
                tableState.setPageSize(pageSize);
              },
            }}
            columns={[
              { title: "ID", dataIndex: "id", key: "id", width: 100 },
              { title: "Incident", dataIndex: "incidentId", key: "incidentId" },
              { title: "Responder", dataIndex: "responderId", key: "responderId" },
              { title: "Status", dataIndex: "statusId", key: "statusId" },
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
              options={(incidentsQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.description ?? `Incident ${item.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="responderId" label="Responder" rules={[{ required: true }]}>
            <Select
              options={(respondersQuery.data ?? []).map((item) => ({
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
              options={(statusesQuery.data ?? []).map((item) => ({
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
