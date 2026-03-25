"use client";

import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Modal,
  Result,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { CrudFormModal, toInitialFormValues } from "@/components/crud/CrudFormModal";
import { DeleteConfirmModal } from "@/components/crud/DeleteConfirmModal";
import { SharedTable, type SharedTableColumn } from "@/components/crud/SharedTable";
import { adaptPaginatedResponse } from "@/lib/api/pagination";
import { CrudRequestError, requestCrudEndpoint } from "@/features/dynamic-crud/api-client";
import { getCrudEndpoint, getCrudResource } from "@/features/dynamic-crud/config";
import {
  getResourceFieldsForOperation,
  ROLE_OPTIONS,
} from "@/features/dynamic-crud/field-config";
import { hasPermission } from "@/features/dynamic-crud/permissions";
import { useCrudResource } from "@/features/dynamic-crud/useCrudResource";
import type { CrudFieldConfig, CrudOperation } from "@/features/dynamic-crud/types";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { buildListQueryParams } from "@/lib/api/list-query-params";
import type { ApiErrorPayload, BaseEntity } from "@/types/api";
import { Role } from "@/types/auth";

const { Title } = Typography;

const ACTION_BUTTON_STYLES = {
  view: { backgroundColor: "#1677ff", borderColor: "#1677ff", color: "#ffffff" },
  edit: { backgroundColor: "#faad14", borderColor: "#faad14", color: "#ffffff" },
  delete: { backgroundColor: "#ff4d4f", borderColor: "#ff4d4f", color: "#ffffff" },
} as const;

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatDisplayValue(item)).filter((item) => item !== "N/A");
    return items.length > 0 ? items.join(", ") : "N/A";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const fullName = [record.firstName, record.lastName]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");

    if (typeof record.name === "string" && record.name.length > 0) {
      return record.name;
    }

    if (fullName.length > 0) {
      return fullName;
    }

    if (typeof record.label === "string" && record.label.length > 0) {
      return record.label;
    }

    if (typeof record.description === "string" && record.description.length > 0) {
      return record.description;
    }

    if (typeof record.email === "string" && record.email.length > 0) {
      return record.email;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function humanizeKey(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bId\b/i, "ID")
    .trim();
}

function isDateLikeFieldName(key: string): boolean {
  return /(^date|date$|At$|_at$|timestamp|time$)/i.test(key);
}

function discoverTableKeys(rows: BaseEntity[]): string[] {
  const maxColumns = 6;
  const dateColumnReserve = 2;
  const discoveryLimit = 20;
  const keySet = new Set<string>();

  for (const row of rows) {
    Object.keys(row)
      .filter((key) => key !== "id")
      .forEach((key) => keySet.add(key));

    if (keySet.size >= discoveryLimit) {
      break;
    }
  }

  const allKeys = Array.from(keySet);
  const dateKeys = allKeys.filter((key) => isDateLikeFieldName(key));
  const nonDateKeys = allKeys.filter((key) => !isDateLikeFieldName(key));
  const dateSlots = Math.min(dateColumnReserve, dateKeys.length);
  const nonDateSlots = Math.max(0, maxColumns - dateSlots);

  return [...nonDateKeys.slice(0, nonDateSlots), ...dateKeys.slice(0, dateSlots)];
}

function normalizeFormValues(
  values: Record<string, unknown>,
  fields: CrudFieldConfig[],
  isUpdate: boolean,
) {
  const output: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = values[field.name];

    if (isUpdate && (raw === undefined || raw === null || raw === "")) {
      continue;
    }

    if (!isUpdate && raw === undefined) {
      continue;
    }

    if (
      field.type === "select" &&
      typeof raw === "string" &&
      /^-?\d+$/.test(raw)
    ) {
      output[field.name] = Number(raw);
      continue;
    }

    output[field.name] = raw;
  }

  return output;
}

function extractErrorDetails(error: unknown) {
  if (error instanceof CrudRequestError) {
    return {
      status: error.status,
      message: error.message,
      details: error.details,
    };
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : "Unexpected request error",
    details: undefined,
  };
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 403) {
    return "You are not authorized to perform this action.";
  }

  if (status === 409) {
    return "Conflict detected. The record may already exist or be linked to another resource.";
  }

  if (status === 404) {
    return "Resource not found.";
  }

  return fallback;
}

function applyValidationErrors(
  form: FormInstance<Record<string, unknown>>,
  details: unknown,
): boolean {
  const payload = details as ApiErrorPayload | undefined;
  const issues = payload?.errors;

  if (!Array.isArray(issues) || issues.length === 0) {
    return false;
  }

  form.setFields(
    issues
      .filter((issue) => issue.field)
      .map((issue) => ({
        name: String(issue.field),
        errors: [issue.message ?? "Invalid value"],
      })),
  );

  return true;
}

export function CrudResourcePage({ resourceName }: { resourceName: string }) {
  const { message } = App.useApp();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [linkMeOpen, setLinkMeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<BaseEntity | null>(null);

  const [createForm] = Form.useForm<Record<string, unknown>>();
  const [linkMeForm] = Form.useForm<Record<string, unknown>>();
  const [reportForm] = Form.useForm<Record<string, unknown>>();
  const [editForm] = Form.useForm<Record<string, unknown>>();
  const tableState = useListQueryParams();

  const resource = getCrudResource(resourceName);
  const resourceLabelPlural = resource?.label ?? "Records";
  const resourceLabelSingular = resourceLabelPlural.endsWith("s")
    ? resourceLabelPlural.slice(0, -1)
    : resourceLabelPlural;
  const createFields = useMemo(
    () => getResourceFieldsForOperation(resourceName, "create"),
    [resourceName],
  );
  const updateFields = useMemo(
    () => getResourceFieldsForOperation(resourceName, "update"),
    [resourceName],
  );
  const linkMeFields = useMemo(
    () => getResourceFieldsForOperation(resourceName, "linkMe"),
    [resourceName],
  );
  const reportFields = useMemo(
    () => getResourceFieldsForOperation(resourceName, "report"),
    [resourceName],
  );

  const {
    listQuery,
    getById,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useCrudResource(resourceName, tableState);

  const canList = hasPermission(resource?.endpoints.list, user?.role, isAuthenticated);
  const canGet = hasPermission(resource?.endpoints.get, user?.role, isAuthenticated);
  const canCreate = hasPermission(resource?.endpoints.create, user?.role, isAuthenticated);
  const canLinkMe = hasPermission(resource?.endpoints.linkMe, user?.role, isAuthenticated);
  const canReport = hasPermission(resource?.endpoints.report, user?.role, isAuthenticated);
  const canUpdate = hasPermission(resource?.endpoints.update, user?.role, isAuthenticated);
  const canDelete = hasPermission(resource?.endpoints.delete, user?.role, isAuthenticated);

  const specialMutation = useMutation({
    mutationFn: async ({
      operation,
      payload,
    }: {
      operation: CrudOperation;
      payload: Record<string, unknown>;
    }) => {
      const endpoint = resource?.endpoints[operation];
      if (!endpoint) {
        throw new Error(`${operation} operation is not configured for this resource.`);
      }

      const result = await requestCrudEndpoint<unknown>(endpoint, { body: payload });
      if (!result.success) {
        throw new CrudRequestError(
          result.error?.status ?? 500,
          result.error?.message ?? "Request failed",
          result.error?.details,
        );
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", resourceName, "list"] });
    },
  });

  const detailsQuery = useQuery({
    queryKey: ["crud", resourceName, "detail", selected?.id],
    enabled: Boolean(detailsOpen && selected?.id && canGet),
    queryFn: async () => {
      if (!selected?.id) {
        return null;
      }

      return getById(selected.id);
    },
  });

  const optionResources = useMemo(() => {
    const resources = new Map<string, CrudFieldConfig["optionSource"]>();
    const allFieldSets = [createFields, updateFields, linkMeFields, reportFields];

    for (const fieldSet of allFieldSets) {
      for (const field of fieldSet) {
        if (field.type !== "select" || !field.optionSource) {
          continue;
        }

        if (!resources.has(field.optionSource.resource)) {
          resources.set(field.optionSource.resource, field.optionSource);
        }
      }
    }

    return Array.from(resources.entries()).map(([resourceKey, optionSource]) => ({
      resourceKey,
      optionSource,
    }));
  }, [createFields, linkMeFields, reportFields, updateFields]);

  const optionQueries = useQueries({
    queries: optionResources.map(({ resourceKey, optionSource }) => ({
      queryKey: ["crud", "options", resourceKey],
      queryFn: async () => {
        if (resourceKey === "roles") {
          return ROLE_OPTIONS;
        }

        const endpoint = getCrudEndpoint(resourceKey, "list");
        if (!endpoint) {
          return [] as Array<{ value: string; label: string; description?: string }>;
        }

        const result = await requestCrudEndpoint<unknown>(endpoint, {
          queryParams: { page: 1, pageSize: 200 },
        });
        if (!result.success || !result.data) {
          throw new CrudRequestError(
            result.error?.status ?? 500,
            result.error?.message ?? `Failed to load ${resourceKey}.`,
            result.error?.details,
          );
        }

        const items = Array.isArray(result.data)
          ? result.data
          : (result.data as { data?: unknown[] }).data ?? [];

        const typedItems = Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
        const valueField = optionSource?.valueField ?? "id";
        const labelField = optionSource?.labelField ?? "name";

        return typedItems.map((item) => ({
          value: String(item[valueField] ?? item.id ?? ""),
          label: String(item[labelField] ?? item.name ?? item.description ?? item.id ?? "Unknown"),
          description:
            typeof item.definition === "string"
              ? item.definition
              : typeof item.description === "string"
                ? item.description
                : undefined,
        }));
      },
    })),
  });

  const optionsByResource = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string; description?: string }>>();

    optionResources.forEach(({ resourceKey }, index) => {
      map.set(resourceKey, optionQueries[index]?.data ?? []);
    });

    return map;
  }, [optionQueries, optionResources]);

  const optionQueryStateByResource = useMemo(() => {
    const map = new Map<
      string,
      {
        isError: boolean;
        isFetching: boolean;
        error: unknown;
        refetch: () => void;
      }
    >();

    optionResources.forEach(({ resourceKey }, index) => {
      const query = optionQueries[index];
      map.set(resourceKey, {
        isError: Boolean(query?.isError),
        isFetching: Boolean(query?.isFetching),
        error: query?.error,
        refetch: () => {
          void query?.refetch();
        },
      });
    });

    return map;
  }, [optionQueries, optionResources]);

  const optionsByField = useMemo(() => {
    const output: Record<string, Array<{ value: string; label: string; description?: string }>> = {};
    const allFields = [...createFields, ...updateFields, ...linkMeFields, ...reportFields];

    for (const field of allFields) {
      if (field.type !== "select" || !field.optionSource) {
        continue;
      }

      output[field.name] = optionsByResource.get(field.optionSource.resource) ?? [];
    }

    return output;
  }, [createFields, linkMeFields, optionsByResource, reportFields, updateFields]);

  const selectLabelsByField = useMemo(() => {
    const output: Record<string, Map<string, string>> = {};

    Object.entries(optionsByField).forEach(([fieldName, options]) => {
      output[fieldName] = new Map(options.map((option) => [option.value, option.label]));
    });

    return output;
  }, [optionsByField]);

  const fieldLabels = useMemo(() => {
    const output = new Map<string, string>();
    const allFields = [...createFields, ...updateFields, ...linkMeFields, ...reportFields];

    allFields.forEach((field) => {
      output.set(field.name, field.label);
    });

    return output;
  }, [createFields, linkMeFields, reportFields, updateFields]);

  const columnLabelsByField = useMemo(
    () => Object.fromEntries(fieldLabels.entries()),
    [fieldLabels],
  );

  let createDependencyIssue: { message: string; retry: () => void } | null = null;
  for (const field of createFields) {
    if (field.type !== "select" || !field.optionSource) {
      continue;
    }

    const queryState = optionQueryStateByResource.get(field.optionSource.resource);
    if (!queryState?.isError) {
      continue;
    }

    createDependencyIssue = {
      message: `Unable to load ${field.label.toLowerCase()} options. Retry before submitting.`,
      retry: queryState.refetch,
    };
    break;
  }

  let updateDependencyIssue: { message: string; retry: () => void } | null = null;
  for (const field of updateFields) {
    if (field.type !== "select" || !field.optionSource) {
      continue;
    }

    const queryState = optionQueryStateByResource.get(field.optionSource.resource);
    if (!queryState?.isError) {
      continue;
    }

    updateDependencyIssue = {
      message: `Unable to load ${field.label.toLowerCase()} options. Retry before submitting.`,
      retry: queryState.refetch,
    };
    break;
  }

  const paginationMeta = listQuery.data?.pagination;
  const sourceRows = listQuery.data?.data ?? [];
  const ownershipFields = ["userId", "reportedById", "ownerId", "citizenUserId"];
  const hasOwnershipField = sourceRows.some((row) =>
    ownershipFields.some((field) => row[field] !== undefined && row[field] !== null),
  );
  const rows =
    resourceName === "incidents" && user?.role === Role.VIEWER && hasOwnershipField
      ? sourceRows.filter((row) =>
          ownershipFields.some((field) => String(row[field] ?? "") === String(user.id)),
        )
      : sourceRows;
  const visibleKeys = useMemo(() => discoverTableKeys(rows), [rows]);
  const tableColumns = useMemo<Array<SharedTableColumn<BaseEntity>>>(
    () =>
      visibleKeys.map((key) => ({
        key,
        title: columnLabelsByField[key] ?? humanizeKey(key),
        filterKind: selectLabelsByField[key]
          ? "select"
          : isDateLikeFieldName(key)
            ? "date"
            : "text",
        sortable: key === "createdAt" || key === "updatedAt",
        selectOptions: selectLabelsByField[key],
        render: (value) => formatDisplayValue(value),
      })),
    [columnLabelsByField, selectLabelsByField, visibleKeys],
  );

  useEffect(() => {
    const listEndpoint = resource?.endpoints.list;
    if (!listEndpoint || !paginationMeta?.hasNextPage) {
      return;
    }

    const nextPage = tableState.page + 1;

    void queryClient.prefetchQuery({
      queryKey: ["crud", resourceName, "list", { ...tableState, page: nextPage, search: undefined }],
      queryFn: async () => {
        const result = await requestCrudEndpoint<unknown>(listEndpoint, {
          queryParams: buildListQueryParams({ ...tableState, page: nextPage }),
        });
        if (!result.success) {
          throw new CrudRequestError(
            result.error?.status ?? 500,
            result.error?.message ?? "Request failed",
            result.error?.details,
          );
        }
        return adaptPaginatedResponse(result.data, nextPage, tableState.pageSize);
      },
    });
  }, [paginationMeta?.hasNextPage, queryClient, resource?.endpoints.list, resourceName, tableState]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();

      const payload = normalizeFormValues(values, createFields, false);
      await createMutation.mutateAsync(payload);
      message.success(`${resourceLabelSingular} created successfully.`);
      createForm.resetFields();
      setCreateOpen(false);
    } catch (error) {
      const parsed = extractErrorDetails(error);

      if (parsed.status === 422 && applyValidationErrors(createForm, parsed.details)) {
        message.error("Please correct the highlighted fields.");
        return;
      }

      message.error(messageForStatus(parsed.status, parsed.message));
    }
  };

  const handleUpdate = async () => {
    if (!selected?.id) {
      return;
    }

    try {
      const values = await editForm.validateFields();
      const payload = normalizeFormValues(values, updateFields, true);
      await updateMutation.mutateAsync({ id: selected.id, payload });
      message.success(`${resourceLabelPlural} updated successfully.`);
      editForm.resetFields();
      setEditOpen(false);
    } catch (error) {
      const parsed = extractErrorDetails(error);

      if (parsed.status === 422 && applyValidationErrors(editForm, parsed.details)) {
        message.error("Please correct the highlighted fields.");
        return;
      }

      message.error(messageForStatus(parsed.status, parsed.message));
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(selected.id);
      message.success(`${resourceLabelPlural} deleted successfully.`);
      setDeleteOpen(false);
      setSelected(null);
    } catch (error) {
      const parsed = extractErrorDetails(error);
      message.error(messageForStatus(parsed.status, parsed.message));
    }
  };

  const handleSpecialOperation = async (
    operation: "linkMe" | "report",
    form: FormInstance<Record<string, unknown>>,
    fields: CrudFieldConfig[],
    successMessage: string,
    close: () => void,
  ) => {
    try {
      const values = await form.validateFields();
      const payload = normalizeFormValues(values, fields, false);
      await specialMutation.mutateAsync({ operation, payload });
      message.success(successMessage);
      form.resetFields();
      close();
    } catch (error) {
      const parsed = extractErrorDetails(error);

      if (parsed.status === 422 && applyValidationErrors(form, parsed.details)) {
        message.error("Please correct the highlighted fields.");
        return;
      }

      message.error(messageForStatus(parsed.status, parsed.message));
    }
  };

  if (!resource) {
    return <Result status="404" title="Unknown resource" subTitle="This dashboard resource is not configured." />;
  }

  if (!canList) {
    return (
      <Result
        status="403"
        title="Not Authorized"
        subTitle="You do not have permission to view this resource list."
      />
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          {resource.label}
        </Title>
        <Space>
          {resource?.endpoints.linkMe ? (
            <Button onClick={() => setLinkMeOpen(true)} disabled={!canLinkMe}>
              Link Profile
            </Button>
          ) : null}
          {resource?.endpoints.report ? (
            <Button onClick={() => setReportOpen(true)} disabled={!canReport}>
              Report Incident
            </Button>
          ) : null}
          <Button type="primary" onClick={() => setCreateOpen(true)} disabled={!canCreate}>
            Create {resource.label.slice(0, -1)}
          </Button>
        </Space>
      </Space>

      {!canCreate || !canUpdate || !canDelete ? (
        <Alert
          showIcon
          type="info"
          message="Some actions are unavailable"
          description="Permissions for create, update, and delete are role-based and endpoint-driven."
        />
      ) : null}

      <Card>
        {listQuery.isLoading ? <LoadingState /> : null}
        {listQuery.error ? (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <ErrorState message={String(listQuery.error)} />
            <Button onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </Space>
        ) : null}
        {!listQuery.isLoading && !listQuery.error ? (
          <SharedTable<BaseEntity>
            rows={rows}
            columns={tableColumns}
            loading={listQuery.isFetching}
            page={tableState.page}
            pageSize={tableState.pageSize}
            paginationMeta={paginationMeta}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
            globalSearch={tableState.search}
            onGlobalSearchChange={tableState.setSearch}
            globalSearchPlaceholder="Search records"
            sortState={{ key: tableState.sortBy, order: tableState.sortOrder }}
            onSortChange={(columnKey, order) => {
              if (columnKey === "createdAt" || columnKey === "updatedAt") {
                tableState.setSort(columnKey, order);
              }
            }}
            serverDateFilters={{
              createdAt: { from: tableState.createdFrom, to: tableState.createdTo },
              updatedAt: { from: tableState.updatedFrom, to: tableState.updatedTo },
            }}
            onServerDateFilterChange={(columnKey, value) => {
              if (columnKey === "createdAt") {
                tableState.setCreatedRange(value.from, value.to);
                return;
              }

              tableState.setUpdatedRange(value.from, value.to);
            }}
            topToolbar={
              <FilterToolbar
                state={tableState}
                setters={tableState}
                loading={Boolean(listQuery.isFetching)}
              />
            }
            actionColumn={{
              render: (row) => (
                <Space>
                  {canGet ? (
                    <Tooltip title="View">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<EyeOutlined />}
                        aria-label="View"
                        style={ACTION_BUTTON_STYLES.view}
                        onClick={() => {
                          setSelected(row);
                          setDetailsOpen(true);
                        }}
                      />
                    </Tooltip>
                  ) : null}
                  {canUpdate ? (
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<EditOutlined />}
                        aria-label="Edit"
                        style={ACTION_BUTTON_STYLES.edit}
                        onClick={() => {
                          setSelected(row);
                          editForm.setFieldsValue(
                            toInitialFormValues(row as Record<string, unknown>, updateFields) as never,
                          );
                          setEditOpen(true);
                        }}
                      />
                    </Tooltip>
                  ) : null}
                  {canDelete ? (
                    <Tooltip title="Delete">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        aria-label="Delete"
                        style={ACTION_BUTTON_STYLES.delete}
                        onClick={() => {
                          setSelected(row);
                          setDeleteOpen(true);
                        }}
                      />
                    </Tooltip>
                  ) : null}
                </Space>
              ),
            }}
          />
        ) : null}
      </Card>

      <CrudFormModal
        title={`Create ${resource.label.slice(0, -1)}`}
        open={createOpen}
        submitting={createMutation.isPending}
        fields={createFields}
        form={createForm}
        optionsByField={optionsByField}
        submitDisabled={Boolean(createDependencyIssue)}
        submitDisabledMessage={createDependencyIssue?.message}
        onRetrySubmitDependency={createDependencyIssue?.retry}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onSubmit={() => void handleCreate()}
      />

      <CrudFormModal
        title={`Edit ${resource.label.slice(0, -1)}`}
        open={editOpen}
        submitting={updateMutation.isPending}
        fields={updateFields}
        form={editForm}
        optionsByField={optionsByField}
        isUpdate
        submitDisabled={Boolean(updateDependencyIssue)}
        submitDisabledMessage={updateDependencyIssue?.message}
        onRetrySubmitDependency={updateDependencyIssue?.retry}
        onCancel={() => {
          setEditOpen(false);
          editForm.resetFields();
        }}
        onSubmit={() => void handleUpdate()}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        loading={deleteMutation.isPending}
        row={selected}
        resourceLabel={resource.label}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <CrudFormModal
        title="Link Citizen Profile"
        open={linkMeOpen}
        submitting={specialMutation.isPending}
        fields={linkMeFields}
        form={linkMeForm}
        optionsByField={optionsByField}
        onCancel={() => {
          setLinkMeOpen(false);
          linkMeForm.resetFields();
        }}
        onSubmit={() =>
          void handleSpecialOperation(
            "linkMe",
            linkMeForm,
            linkMeFields,
            "Citizen profile linked successfully.",
            () => setLinkMeOpen(false),
          )
        }
      />

      <CrudFormModal
        title="Report Incident"
        open={reportOpen}
        submitting={specialMutation.isPending}
        fields={reportFields}
        form={reportForm}
        optionsByField={optionsByField}
        onCancel={() => {
          setReportOpen(false);
          reportForm.resetFields();
        }}
        onSubmit={() =>
          void handleSpecialOperation(
            "report",
            reportForm,
            reportFields,
            "Incident reported successfully.",
            () => setReportOpen(false),
          )
        }
      />

      <Modal
        title={`${resource.label.slice(0, -1)} Details`}
        open={detailsOpen}
        footer={null}
        onCancel={() => setDetailsOpen(false)}
      >
        {detailsQuery.isLoading ? <LoadingState /> : null}
        {detailsQuery.error ? <ErrorState message={String(detailsQuery.error)} /> : null}
        {detailsQuery.data ? (
          <Descriptions size="small" column={1}>
            {Object.entries(detailsQuery.data).map(([key, value]) => (
              <Descriptions.Item key={key} label={fieldLabels.get(key) ?? humanizeKey(key)}>
                {formatDisplayValue(
                  selectLabelsByField[key]?.get(String(value ?? "")) ?? value,
                )}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>
    </Space>
  );
}
