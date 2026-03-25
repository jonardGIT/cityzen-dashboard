"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SharedTable, type SharedTableColumn } from "@/components/crud/SharedTable";
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
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { DEFAULT_SORT_BY, DEFAULT_SORT_ORDER } from "@/lib/api/list-query-params";
import type { ApiErrorPayload, Incident } from "@/types/api";

const { Title } = Typography;

interface IncidentFormValues {
  description: string;
  citizenId: string;
  locationId: string;
  categoryId: string;
  severityId: string;
  statusId: string;
}

function formatDateTime(value: unknown): string {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString();
}

export default function IncidentsPage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const optionQueryState = {
    page: 1,
    pageSize: 200,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
  } as const;
  const citizensQuery = useCitizensQuery(optionQueryState);
  const locationsQuery = useLocationsQuery(optionQueryState);
  const categoriesQuery = useCategoriesQuery(optionQueryState);
  const severitiesQuery = useSeveritiesQuery(optionQueryState);
  const statusesQuery = useStatusesQuery(optionQueryState);
  const createMutation = useCreateIncidentMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<IncidentFormValues>();

  const listQuery = useListQueryParams();

  const incidentsListQuery = useIncidentsQuery(listQuery);
  const rows = incidentsListQuery.data?.data ?? [];
  const pagination = incidentsListQuery.data?.pagination;

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

  const columns: Array<SharedTableColumn<Incident>> = [
    { key: "description", title: "Description", filterKind: "text" },
    { key: "citizenId", title: "Citizen", filterKind: "select", selectOptions: citizenLabels },
    { key: "statusId", title: "Status", filterKind: "select", selectOptions: statusLabels },
    {
      key: "dateReported",
      title: "Reported",
      filterKind: "date",
      render: (value) => formatDateTime(value),
    },
    {
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      render: (value) => formatDateTime(value),
    },
    {
      key: "updatedAt",
      title: "Updated",
      filterKind: "date",
      sortable: true,
      render: (value) => formatDateTime(value),
    },
  ];

  if (incidentsListQuery.isLoading) {
    return <LoadingState />;
  }

  if (incidentsListQuery.error) {
    return <ErrorState message={String(incidentsListQuery.error)} />;
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

      <SharedTable<Incident>
        rows={rows}
        columns={columns}
        loading={incidentsListQuery.isFetching}
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        paginationMeta={pagination}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.setPageSize}
        globalSearch={listQuery.search}
        onGlobalSearchChange={listQuery.setSearch}
        globalSearchPlaceholder="Search incidents"
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
            loading={Boolean(incidentsListQuery.isFetching)}
          />
        }
        scrollX={980}
      />

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
