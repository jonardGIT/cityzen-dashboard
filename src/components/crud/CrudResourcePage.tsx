"use client";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { ACTION_BUTTON_STYLES } from "@/components/crud/action-button-styles";
import {
  CrudFormModal,
  toInitialFormValues,
} from "@/components/crud/CrudFormModal";
import { DeleteConfirmModal } from "@/components/crud/DeleteConfirmModal";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { extractListQueryValidation } from "@/components/crud/list-query-validation";
import { adaptPaginatedResponse } from "@/lib/api/pagination";
import {
  formatDisplayValue,
  humanizeKey,
  isDateLikeFieldName,
} from "@/lib/format/display";
import {
  CrudRequestError,
  requestCrudEndpoint,
} from "@/features/dynamic-crud/api-client";
import {
  getCrudEndpoint,
  getCrudResource,
} from "@/features/dynamic-crud/config";
import { useCrudEndpointAvailability } from "@/features/dynamic-crud/openapi";
import {
  getResourceFieldsForOperation,
  ROLE_OPTIONS,
} from "@/features/dynamic-crud/field-config";
import { hasPermission } from "@/features/dynamic-crud/permissions";
import { useCrudResource } from "@/features/dynamic-crud/useCrudResource";
import type {
  CrudFieldConfig,
  CrudFieldOptionSource,
  CrudOperation,
  CrudSelectOption,
} from "@/features/dynamic-crud/types";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { buildListQueryParams } from "@/lib/api/list-query-params";
import { canAccessCrudResource } from "@/lib/auth/navigation";
import { isCitizenSelfServiceUser } from "@/lib/auth/roles";
import type { ApiErrorPayload, BaseEntity } from "@/types/api";
import { Role } from "@/types/auth";

const { Title } = Typography;

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

  return [
    ...nonDateKeys.slice(0, nonDateSlots),
    ...dateKeys.slice(0, dateSlots),
  ];
}

function normalizeFormValues(
  values: Record<string, unknown>,
  fields: CrudFieldConfig[],
  isUpdate: boolean,
) {
  const output: Record<string, unknown> = {};
  const numericFieldNames = new Set(["latitude", "longitude"]);

  for (const field of fields) {
    if (field.submit === false) {
      continue;
    }

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

    if (numericFieldNames.has(field.name) && typeof raw === "string") {
      const trimmed = raw.trim();

      if (!trimmed) {
        if (!isUpdate) {
          continue;
        }

        continue;
      }

      const parsed = Number(trimmed);
      output[field.name] = Number.isNaN(parsed) ? raw : parsed;
      continue;
    }

    if (field.type === "datetime" && typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        continue;
      }

      const parsed = new Date(trimmed);
      output[field.name] = Number.isNaN(parsed.getTime())
        ? raw
        : parsed.toISOString();
      continue;
    }

    if (field.type === "integer") {
      if (typeof raw === "number") {
        output[field.name] = Math.trunc(raw);
        continue;
      }

      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) {
          continue;
        }

        const parsed = Number.parseInt(trimmed, 10);
        output[field.name] = Number.isNaN(parsed) ? raw : parsed;
        continue;
      }
    }

    if (field.type === "boolean") {
      output[field.name] = Boolean(raw);
      continue;
    }

    if (field.type === "json") {
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) {
          continue;
        }

        try {
          output[field.name] = JSON.parse(trimmed) as unknown;
        } catch {
          throw new Error(`${field.label} must be valid JSON`);
        }
        continue;
      }

      output[field.name] = raw;
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
    message:
      error instanceof Error ? error.message : "Unexpected request error",
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

function isRestorableRow(row: BaseEntity): boolean {
  if (typeof row.deletedAt === "string") {
    return row.deletedAt.trim().length > 0;
  }

  return Boolean(row.deletedAt ?? row.deleted ?? row.isDeleted);
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

function mergeOptionSource(
  existingOptionSource: CrudFieldOptionSource | undefined,
  incomingOptionSource: CrudFieldOptionSource,
): CrudFieldOptionSource {
  if (!existingOptionSource) {
    return incomingOptionSource;
  }

  return {
    ...existingOptionSource,
    ...incomingOptionSource,
    pageSize: Math.max(
      existingOptionSource.pageSize ?? 200,
      incomingOptionSource.pageSize ?? 200,
    ),
    fetchAllPages:
      Boolean(existingOptionSource.fetchAllPages) ||
      Boolean(incomingOptionSource.fetchAllPages),
  };
}

export function CrudResourcePage({ resourceName }: { resourceName: string }) {
  const { message } = App.useApp();
  const { user, capabilities, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [linkMeOpen, setLinkMeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<BaseEntity | null>(null);

  const [createForm] = Form.useForm<Record<string, unknown>>();
  const [linkMeForm] = Form.useForm<Record<string, unknown>>();
  const [reportForm] = Form.useForm<Record<string, unknown>>();
  const [editForm] = Form.useForm<Record<string, unknown>>();
  const tableState = useListQueryParams();

  const resource = getCrudResource(resourceName);
  const restoreAvailability = useCrudEndpointAvailability(
    resource?.endpoints.restore,
  );
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
  const hasDirectResourceAccess = resource
    ? canAccessCrudResource(
        {
          role: user?.role,
          capabilities,
          isAuthenticated,
        },
        resourceName,
      )
    : false;

  const {
    listQuery,
    getById,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
  } = useCrudResource(resourceName, tableState, hasDirectResourceAccess);

  const canList = hasPermission(
    resource?.endpoints.list,
    user?.role,
    isAuthenticated,
  );
  const canGet = hasPermission(
    resource?.endpoints.get,
    user?.role,
    isAuthenticated,
  );
  const canCreate = hasPermission(
    resource?.endpoints.create,
    user?.role,
    isAuthenticated,
  );
  const canLinkMe = hasPermission(
    resource?.endpoints.linkMe,
    user?.role,
    isAuthenticated,
  );
  const canReport = hasPermission(
    resource?.endpoints.report,
    user?.role,
    isAuthenticated,
  );
  const canUpdate = hasPermission(
    resource?.endpoints.update,
    user?.role,
    isAuthenticated,
  );
  const canDelete = hasPermission(
    resource?.endpoints.delete,
    user?.role,
    isAuthenticated,
  );
  const canRestore = hasPermission(
    restoreAvailability.isAvailable ? resource?.endpoints.restore : undefined,
    user?.role,
    isAuthenticated,
  );
  const canUseSelfService = canLinkMe || canReport;
  const canAccessPage = hasDirectResourceAccess || canUseSelfService;
  const isSelfServiceUser = isCitizenSelfServiceUser(user?.role, capabilities);

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
        throw new Error(
          `${operation} operation is not configured for this resource.`,
        );
      }

      const result = await requestCrudEndpoint<unknown>(endpoint, {
        body: payload,
      });
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
      await queryClient.invalidateQueries({
        queryKey: ["crud", resourceName, "list"],
      });
    },
  });

  const detailsQuery = useQuery({
    queryKey: ["crud", resourceName, "detail", selected?.id],
    enabled: Boolean(
      detailsOpen && selected?.id && canGet && hasDirectResourceAccess,
    ),
    queryFn: async () => {
      if (!selected?.id) {
        return null;
      }

      return getById(selected.id);
    },
  });

  const optionResources = useMemo(() => {
    const resources = new Map<string, CrudFieldConfig["optionSource"]>();
    const allFieldSets = [
      createFields,
      updateFields,
      linkMeFields,
      reportFields,
    ];

    for (const fieldSet of allFieldSets) {
      for (const field of fieldSet) {
        if (field.type !== "select" || !field.optionSource) {
          continue;
        }

        const existingOptionSource = resources.get(field.optionSource.resource);
        resources.set(
          field.optionSource.resource,
          mergeOptionSource(existingOptionSource, field.optionSource),
        );
      }
    }

    return Array.from(resources.entries()).map(
      ([resourceKey, optionSource]) => ({
        resourceKey,
        optionSource,
      }),
    );
  }, [createFields, linkMeFields, reportFields, updateFields]);

  const optionQueries = useQueries({
    queries: optionResources.map(({ resourceKey, optionSource }) => ({
      queryKey: [
        "crud",
        "options",
        resourceKey,
        optionSource?.pageSize ?? 200,
        optionSource?.fetchAllPages ?? false,
      ],
      enabled: canAccessPage,
      queryFn: async () => {
        if (resourceKey === "roles") {
          return ROLE_OPTIONS;
        }

        const endpoint = getCrudEndpoint(resourceKey, "list");
        if (!endpoint) {
          return [] as CrudSelectOption[];
        }

        const requestedPageSize = optionSource?.pageSize ?? 200;
        const items: Record<string, unknown>[] = [];
        let page = 1;

        while (true) {
          const result = await requestCrudEndpoint<unknown>(endpoint, {
            queryParams: { page, pageSize: requestedPageSize },
          });

          if (!result.success || !result.data) {
            throw new CrudRequestError(
              result.error?.status ?? 500,
              result.error?.message ?? `Failed to load ${resourceKey}.`,
              result.error?.details,
            );
          }

          const adapted = adaptPaginatedResponse<Record<string, unknown>>(
            result.data,
            page,
            requestedPageSize,
          );
          items.push(...adapted.data);

          if (
            !optionSource?.fetchAllPages ||
            !adapted.pagination.hasNextPage ||
            page >= adapted.pagination.totalPages
          ) {
            break;
          }

          page += 1;
        }

        const valueField = optionSource?.valueField ?? "id";
        const labelField = optionSource?.labelField ?? "name";

        return items.map((item) => ({
          value: String(item[valueField] ?? item.id ?? ""),
          label: String(
            item[labelField] ??
              item.name ??
              item.description ??
              item.id ??
              "Unknown",
          ),
          description:
            typeof item.definition === "string"
              ? item.definition
              : typeof item.description === "string"
                ? item.description
                : undefined,
          record: item,
        }));
      },
    })),
  });

  const optionsByResource = useMemo(() => {
    const map = new Map<string, CrudSelectOption[]>();

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
    const output: Record<string, CrudSelectOption[]> = {};
    const allFields = [
      ...createFields,
      ...updateFields,
      ...linkMeFields,
      ...reportFields,
    ];

    for (const field of allFields) {
      if (field.type !== "select" || !field.optionSource) {
        continue;
      }

      output[field.name] =
        optionsByResource.get(field.optionSource.resource) ?? [];
    }

    return output;
  }, [
    createFields,
    linkMeFields,
    optionsByResource,
    reportFields,
    updateFields,
  ]);

  const selectLabelsByField = useMemo(() => {
    const output: Record<string, Map<string, string>> = {};

    Object.entries(optionsByField).forEach(([fieldName, options]) => {
      output[fieldName] = new Map(
        options.map((option) => [option.value, option.label]),
      );
    });

    return output;
  }, [optionsByField]);

  const fieldLabels = useMemo(() => {
    const output = new Map<string, string>();
    const allFields = [
      ...createFields,
      ...updateFields,
      ...linkMeFields,
      ...reportFields,
    ];

    allFields.forEach((field) => {
      output.set(field.name, field.label);
    });

    return output;
  }, [createFields, linkMeFields, reportFields, updateFields]);

  const columnLabelsByField = useMemo(
    () => Object.fromEntries(fieldLabels.entries()),
    [fieldLabels],
  );

  let createDependencyIssue: { message: string; retry: () => void } | null =
    null;
  for (const field of createFields) {
    if (field.type !== "select" || !field.optionSource) {
      continue;
    }

    const queryState = optionQueryStateByResource.get(
      field.optionSource.resource,
    );
    if (!queryState?.isError) {
      continue;
    }

    createDependencyIssue = {
      message: `Unable to load ${field.label.toLowerCase()} options. Retry before submitting.`,
      retry: queryState.refetch,
    };
    break;
  }

  let updateDependencyIssue: { message: string; retry: () => void } | null =
    null;
  for (const field of updateFields) {
    if (field.type !== "select" || !field.optionSource) {
      continue;
    }

    const queryState = optionQueryStateByResource.get(
      field.optionSource.resource,
    );
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
  const listValidationState = useMemo(
    () =>
      listQuery.isFetching
        ? null
        : extractListQueryValidation(
            listQuery.error,
            tableState.filters,
            tableState.sortBy,
          ),
    [
      listQuery.error,
      listQuery.isFetching,
      tableState.filters,
      tableState.sortBy,
    ],
  );
  const hasFatalListError = Boolean(listQuery.error && !listValidationState);
  const ownershipFields = [
    "userId",
    "reportedById",
    "ownerId",
    "citizenUserId",
  ];
  const hasOwnershipField = sourceRows.some((row) =>
    ownershipFields.some(
      (field) => row[field] !== undefined && row[field] !== null,
    ),
  );
  const rows =
    resourceName === "incidents" &&
    user?.role === Role.CITIZEN_REPORTER &&
    hasOwnershipField
      ? sourceRows.filter((row) =>
          ownershipFields.some(
            (field) => String(row[field] ?? "") === String(user.id),
          ),
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
    if (
      !hasDirectResourceAccess ||
      !listEndpoint ||
      !paginationMeta?.hasNextPage
    ) {
      return;
    }

    const nextPage = tableState.page + 1;

    void queryClient.prefetchQuery({
      queryKey: [
        "crud",
        resourceName,
        "list",
        { ...tableState, page: nextPage },
      ],
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
        return adaptPaginatedResponse(
          result.data,
          nextPage,
          tableState.pageSize,
        );
      },
    });
  }, [
    paginationMeta?.hasNextPage,
    hasDirectResourceAccess,
    queryClient,
    resource?.endpoints.list,
    resourceName,
    tableState,
  ]);

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

      if (
        parsed.status === 422 &&
        applyValidationErrors(createForm, parsed.details)
      ) {
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

      if (
        parsed.status === 422 &&
        applyValidationErrors(editForm, parsed.details)
      ) {
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

  const handleRestore = async () => {
    if (!selected?.id) {
      return;
    }

    try {
      await restoreMutation.mutateAsync(selected.id);
      message.success(`${resourceLabelSingular} restored successfully.`);
      setRestoreOpen(false);
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

      if (
        parsed.status === 422 &&
        applyValidationErrors(form, parsed.details)
      ) {
        message.error("Please correct the highlighted fields.");
        return;
      }

      message.error(messageForStatus(parsed.status, parsed.message));
    }
  };

  if (!resource) {
    return (
      <Result
        status="404"
        title="Unknown resource"
        subTitle="This dashboard resource is not configured."
      />
    );
  }

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access this resource."
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
          {canLinkMe ? (
            <Button onClick={() => setLinkMeOpen(true)}>Link Profile</Button>
          ) : null}
          {canReport ? (
            <Button onClick={() => setReportOpen(true)}>Report Incident</Button>
          ) : null}
          {canCreate ? (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Create {resource.label.slice(0, -1)}
            </Button>
          ) : null}
        </Space>
      </Space>

      {!canList && canUseSelfService ? (
        <Alert
          showIcon
          type="info"
          message="Your access is limited to self-service actions"
          description={
            isSelfServiceUser
              ? "Use the available actions on this page to report incidents or link your citizen profile. Record browsing is intentionally disabled for your scope."
              : "Only self-service actions are currently available for this resource."
          }
        />
      ) : null}

      {canList && (!canCreate || !canUpdate || !canDelete || !canRestore) ? (
        <Alert
          showIcon
          type="info"
          title="Some actions are unavailable"
          description="Permissions for create, update, delete, and restore are role-based and endpoint-driven."
        />
      ) : null}

      {canList ? (
        <Card>
          {listQuery.isLoading ? <LoadingState /> : null}
          {hasFatalListError ? (
            <Space orientation="vertical" style={{ width: "100%" }}>
              <ErrorState message={String(listQuery.error)} />
              <Button onClick={() => void listQuery.refetch()}>Retry</Button>
            </Space>
          ) : null}
          {!listQuery.isLoading && !listQuery.error ? (
            <SharedTable<BaseEntity>
              rows={rows}
              columns={tableColumns}
              storageKey={`crud-${resourceName}-shared-table`}
              loading={listQuery.isFetching}
              page={tableState.page}
              pageSize={tableState.pageSize}
              paginationMeta={paginationMeta}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
              globalSearch={tableState.search}
              onGlobalSearchChange={tableState.setSearch}
              globalSearchPlaceholder="Search records"
              sortState={{
                key: tableState.sortBy,
                order: tableState.sortOrder,
              }}
              onSortChange={(columnKey, order) => {
                if (columnKey === "createdAt" || columnKey === "updatedAt") {
                  tableState.setSort(columnKey, order);
                }
              }}
              serverDateFilters={{
                createdAt: {
                  from: tableState.createdFrom,
                  to: tableState.createdTo,
                },
                updatedAt: {
                  from: tableState.updatedFrom,
                  to: tableState.updatedTo,
                },
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
                              toInitialFormValues(
                                row as Record<string, unknown>,
                                updateFields,
                              ) as never,
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
                    {canRestore && isRestorableRow(row) ? (
                      <Tooltip title="Restore">
                        <Button
                          size="small"
                          shape="circle"
                          icon={<ReloadOutlined />}
                          aria-label="Restore"
                          onClick={() => {
                            setSelected(row);
                            setRestoreOpen(true);
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
      ) : null}

      <CrudFormModal
        resourceName={resourceName}
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
        resourceName={resourceName}
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

      <Modal
        title={`Restore ${resourceLabelSingular}`}
        open={restoreOpen}
        onCancel={() => setRestoreOpen(false)}
        onOk={() => void handleRestore()}
        okText="Restore"
        confirmLoading={restoreMutation.isPending}
        destroyOnHidden
      >
        Restore this {resourceLabelSingular.toLowerCase()} record
        {selected?.id !== undefined ? ` (#${selected.id})` : ""}?
      </Modal>

      <CrudFormModal
        resourceName={resourceName}
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
        resourceName={resourceName}
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
        {detailsQuery.error ? (
          <ErrorState message={String(detailsQuery.error)} />
        ) : null}
        {detailsQuery.data ? (
          <Descriptions size="small" column={1}>
            {Object.entries(detailsQuery.data).map(([key, value]) => (
              <Descriptions.Item
                key={key}
                label={fieldLabels.get(key) ?? humanizeKey(key)}
              >
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
