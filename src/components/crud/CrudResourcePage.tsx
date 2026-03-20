"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Modal,
  Result,
  Space,
  Typography,
  message,
} from "antd";
import type { FormInstance } from "antd";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { CrudFormModal, toInitialFormValues } from "@/components/crud/CrudFormModal";
import { CrudTable } from "@/components/crud/CrudTable";
import { DeleteConfirmModal } from "@/components/crud/DeleteConfirmModal";
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
import type { ApiErrorPayload, BaseEntity } from "@/types/api";
import { Role } from "@/types/auth";

const { Title } = Typography;

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

  const resource = getCrudResource(resourceName);
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
  } = useCrudResource(resourceName);

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
    const resources = new Set<string>();
    const allFieldSets = [createFields, updateFields, linkMeFields, reportFields];

    for (const fieldSet of allFieldSets) {
      for (const field of fieldSet) {
        if (field.type !== "select" || !field.optionSource) {
          continue;
        }

        resources.add(field.optionSource.resource);
      }
    }

    return Array.from(resources);
  }, [createFields, linkMeFields, reportFields, updateFields]);

  const optionQueries = useQueries({
    queries: optionResources.map((resourceKey) => ({
      queryKey: ["crud", "options", resourceKey],
      queryFn: async () => {
        if (resourceKey === "roles") {
          return ROLE_OPTIONS;
        }

        const endpoint = getCrudEndpoint(resourceKey, "list");
        if (!endpoint) {
          return [] as Array<{ value: string; label: string }>;
        }

        const result = await requestCrudEndpoint<unknown>(endpoint);
        if (!result.success || !result.data) {
          return [] as Array<{ value: string; label: string }>;
        }

        const items = Array.isArray(result.data)
          ? result.data
          : (result.data as { data?: unknown[] }).data ?? [];

        const typedItems = Array.isArray(items) ? (items as Record<string, unknown>[]) : [];

        return typedItems.map((item) => ({
          value: String(item.id ?? ""),
          label: String(item.name ?? item.description ?? item.id ?? "Unknown"),
        }));
      },
    })),
  });

  const optionsByResource = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string }>>();

    optionResources.forEach((resourceKey, index) => {
      map.set(resourceKey, optionQueries[index]?.data ?? []);
    });

    return map;
  }, [optionQueries, optionResources]);

  const optionsByField = useMemo(() => {
    const output: Record<string, Array<{ value: string; label: string }>> = {};
    const allFields = [...createFields, ...updateFields, ...linkMeFields, ...reportFields];

    for (const field of allFields) {
      if (field.type !== "select" || !field.optionSource) {
        continue;
      }

      output[field.name] = optionsByResource.get(field.optionSource.resource) ?? [];
    }

    return output;
  }, [createFields, linkMeFields, optionsByResource, reportFields, updateFields]);

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

  const sourceRows = listQuery.data ?? [];
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

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = normalizeFormValues(values, createFields, false);
      await createMutation.mutateAsync(payload);
      message.success(`${resource.label} created successfully.`);
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
      message.success(`${resource.label} updated successfully.`);
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
      message.success(`${resource.label} deleted successfully.`);
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
        {!listQuery.isLoading && !listQuery.error && rows.length === 0 ? <Empty description="No records found" /> : null}
        {!listQuery.isLoading && !listQuery.error && rows.length > 0 ? (
          <CrudTable
            rows={rows}
            loading={listQuery.isFetching}
            canViewDetails={canGet}
            canEdit={canUpdate}
            canDelete={canDelete}
            onView={(row) => {
              setSelected(row);
              setDetailsOpen(true);
            }}
            onEdit={(row) => {
              setSelected(row);
              editForm.setFieldsValue(
                toInitialFormValues(row as Record<string, unknown>, updateFields) as never,
              );
              setEditOpen(true);
            }}
            onDelete={(row) => {
              setSelected(row);
              setDeleteOpen(true);
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
              <Descriptions.Item key={key} label={key}>
                {value === null || value === undefined || value === ""
                  ? "N/A"
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>
    </Space>
  );
}
