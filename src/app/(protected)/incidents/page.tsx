"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
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
  const citizensQuery = useCitizensQuery(1, 200);
  const locationsQuery = useLocationsQuery(1, 200);
  const categoriesQuery = useCategoriesQuery(1, 200);
  const severitiesQuery = useSeveritiesQuery(1, 200);
  const statusesQuery = useStatusesQuery(1, 200);
  const createMutation = useCreateIncidentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<IncidentFormValues>();

  const tableState = useTableQueryParams(10);

  const listQuery = useIncidentsQuery(tableState.page, tableState.pageSize);
  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;

  const severityOptions = useMemo(
    () =>
      (severitiesQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.level ?? `Severity ${item.id}`,
        description: item.definition,
      })),
    [severitiesQuery.data],
  );

  const citizenOptions = useMemo(
    () =>
      (citizensQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name ?? `Citizen ${item.id}`,
      })),
    [citizensQuery.data],
  );

  const statusOptions = useMemo(
    () =>
      (statusesQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name ?? `Status ${item.id}`,
      })),
    [statusesQuery.data],
  );

  const citizenLabels = useMemo(
    () => new Map(citizenOptions.map((item) => [item.value, item.label])),
    [citizenOptions],
  );

  const statusLabels = useMemo(
    () => new Map(statusOptions.map((item) => [item.value, item.label])),
    [statusOptions],
  );

  if (listQuery.isLoading) {
    return <LoadingState />;
  }

  if (listQuery.error) {
    return <ErrorState message={String(listQuery.error)} />;
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
            loading={listQuery.isFetching}
            dataSource={rows}
            scroll={{ x: 980 }}
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
              { title: "Description", dataIndex: "description", key: "description" },
              {
                title: "Citizen",
                dataIndex: "citizenId",
                key: "citizenId",
                render: (value: string | number) =>
                  citizenLabels.get(String(value)) ?? `Citizen ${value ?? "N/A"}`,
              },
              { title: "Location ID", dataIndex: "locationId", key: "locationId" },
              {
                title: "Status",
                dataIndex: "statusId",
                key: "statusId",
                render: (value: string | number) =>
                  statusLabels.get(String(value)) ?? `Status ${value ?? "N/A"}`,
              },
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
            <Select options={citizenOptions} loading={citizensQuery.isLoading} />
          </Form.Item>

          <Form.Item name="locationId" label="Location" rules={[{ required: true }]}>
            <Select
              options={(locationsQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Location ${item.id}`,
              }))}
              loading={locationsQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select
              options={(categoriesQuery.data?.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name ?? `Category ${item.id}`,
              }))}
              loading={categoriesQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="severityId" label="Severity" rules={[{ required: true }]}>
            <Select
              options={severityOptions}
              optionRender={(option) => {
                const description = option.data.description;
                if (typeof description !== "string" || description.length === 0) {
                  return <span>{String(option.label)}</span>;
                }

                return (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    <span>{String(option.label)}</span>
                    <Tooltip title={description}>
                      <InfoCircleOutlined style={{ color: "#1677ff" }} />
                    </Tooltip>
                  </span>
                );
              }}
              loading={severitiesQuery.isLoading}
            />
          </Form.Item>

          <Form.Item name="statusId" label="Status" rules={[{ required: true }]}>
            <Select options={statusOptions} loading={statusesQuery.isLoading} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
