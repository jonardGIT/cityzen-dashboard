"use client";

import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Typography } from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCreateIncidentMutation, useIncidentsQuery } from "@/features/incidents/api";
import {
  useCategoriesQuery,
  useCitizensQuery,
  useLocationsQuery,
  useSeveritiesQuery,
  useStatusesQuery,
} from "@/features/reference-data/api";
import { CAN_CREATE_INCIDENT } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import type { ApiErrorPayload } from "@/types/api";

const { Title } = Typography;

interface IncidentFormValues {
  description: string;
  citizenId: string;
  locationId: string;
  categoryId: string;
  severityId: string;
  statusId: string;
}

export default function IncidentsPage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const incidentsQuery = useIncidentsQuery();
  const citizensQuery = useCitizensQuery();
  const locationsQuery = useLocationsQuery();
  const categoriesQuery = useCategoriesQuery();
  const severitiesQuery = useSeveritiesQuery();
  const statusesQuery = useStatusesQuery();
  const createMutation = useCreateIncidentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<IncidentFormValues>();

  const tableState = useTableQueryParams(10);

  const allRows = useMemo(() => {
    const rows = incidentsQuery.data ?? [];
    if (!tableState.search) {
      return rows;
    }

    return rows.filter((item) =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(tableState.search.toLowerCase()),
    );
  }, [incidentsQuery.data, tableState.search]);

  const pagedRows = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return allRows.slice(start, start + tableState.pageSize);
  }, [allRows, tableState.page, tableState.pageSize]);

  if (incidentsQuery.isLoading) {
    return <LoadingState />;
  }

  if (incidentsQuery.error) {
    return <ErrorState message={String(incidentsQuery.error)} />;
  }

  const canCreate = hasRole(...CAN_CREATE_INCIDENT);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync({
        description: values.description,
        citizenId: values.citizenId,
        locationId: values.locationId,
        categoryId: values.categoryId,
        severityId: values.severityId,
        statusId: values.statusId,
      });
      message.success("Incident created");
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
          Incidents
        </Title>
        <RoleGuard allowedRoles={CAN_CREATE_INCIDENT} disableOnly>
          <Button type="primary" onClick={() => setOpen(true)} disabled={!canCreate}>
            Create Incident
          </Button>
        </RoleGuard>
      </Space>

      <Card>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search incidents"
            value={tableState.search}
            onChange={(event) => tableState.setSearch(event.target.value)}
          />
          <Table
            rowKey="id"
            dataSource={pagedRows}
            scroll={{ x: 980 }}
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
              { title: "Description", dataIndex: "description", key: "description" },
              { title: "Citizen ID", dataIndex: "citizenId", key: "citizenId" },
              { title: "Location ID", dataIndex: "locationId", key: "locationId" },
              { title: "Status ID", dataIndex: "statusId", key: "statusId" },
              {
                title: "Reported",
                dataIndex: "dateReported",
                key: "dateReported",
                render: (value: string) => (value ? new Date(value).toLocaleString() : "N/A"),
              },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title="Create Incident"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form<IncidentFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Description is required" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="citizenId" label="Citizen" rules={[{ required: true }]}>
            <Select
              options={(citizensQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Citizen ${item.id}`,
              }))}
              loading={citizensQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="locationId" label="Location" rules={[{ required: true }]}>
            <Select
              options={(locationsQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Location ${item.id}`,
              }))}
              loading={locationsQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select
              options={(categoriesQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Category ${item.id}`,
              }))}
              loading={categoriesQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="severityId" label="Severity" rules={[{ required: true }]}>
            <Select
              options={(severitiesQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Severity ${item.id}`,
              }))}
              loading={severitiesQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="statusId" label="Status" rules={[{ required: true }]}>
            <Select
              options={(statusesQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Status ${item.id}`,
              }))}
              loading={statusesQuery.isLoading}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
