"use client";

import {
  App,
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersCapabilitiesQuery,
  useUsersQuery,
} from "@/features/users/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessUserManagement } from "@/lib/auth/navigation";
import { canManageRole, getAssignableRoles } from "@/lib/auth/permissions";
import { getRoleLabel, normalizeRole } from "@/lib/auth/roles";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload, User } from "@/types/api";
import { Role } from "@/types/auth";

const { Title, Text } = Typography;

interface CreateUserFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface EditUserFormValues {
  name: string;
  email: string;
  role: Role;
}

export default function UsersPage() {
  const { message } = App.useApp();
  const { capabilities, isAuthenticated, user } = useAuth();
  const canManage = canAccessUserManagement({
    role: user?.role,
    capabilities,
    isAuthenticated,
  });
  const listQuery = useListQueryParams();
  const usersQuery = useUsersQuery(listQuery, canManage);
  const capabilitiesQuery = useUsersCapabilitiesQuery(isAuthenticated);
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm] = Form.useForm<CreateUserFormValues>();
  const [editForm] = Form.useForm<EditUserFormValues>();

  const assignableRoles = useMemo(() => {
    if (!user) {
      return [] as Role[];
    }

    return getAssignableRoles(user.role);
  }, [user]);

  const rows = usersQuery.data?.data ?? [];
  const paginationMeta = usersQuery.data?.pagination;
  const isEditingSelf = Boolean(
    editingUser && String(editingUser.id) === String(user?.id),
  );
  const roleOptions = new Map(
    Object.values(Role).map((role) => [role, getRoleLabel(role)]),
  );

  const columns: Array<SharedTableColumn<User>> = [
    { key: "email", title: "Email", filterKind: "text" },
    { key: "name", title: "Name", filterKind: "text" },
    {
      key: "role",
      title: "Role",
      filterKind: "select",
      selectOptions: roleOptions,
    },
    { key: "createdAt", title: "Created", filterKind: "date", sortable: true },
    { key: "updatedAt", title: "Updated", filterKind: "date", sortable: true },
  ];

  const canEditRow = (row: User): boolean => {
    const targetRole = normalizeRole(row.role);

    if (!capabilitiesQuery.data?.canUpdateUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    if (String(row.id) === String(user.id)) {
      return false;
    }

    if (!targetRole) {
      return false;
    }

    return canManageRole(user.role, targetRole);
  };

  const canDeleteRow = (row: User): boolean => {
    const targetRole = normalizeRole(row.role);

    if (!capabilitiesQuery.data?.canDeleteUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    if (String(row.id) === String(user.id)) {
      return false;
    }

    if (!targetRole) {
      return false;
    }

    return canManageRole(user.role, targetRole);
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await createMutation.mutateAsync(values);
      message.success("User created");
      createForm.resetFields();
      setIsCreateOpen(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 403) {
        message.error(
          "Permission denied: You cannot assign this role to a user.",
        );
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: A user with this email already exists.");
        return;
      }

      const mapped = mapValidationErrorsToForm(createForm, error);
      if (!mapped && axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
      }
    }
  };

  const openEditModal = (row: User) => {
    setEditingUser(row);
    setIsEditOpen(true);
    editForm.setFieldsValue({
      name: row.name ?? "",
      email: row.email ?? "",
      role: (normalizeRole(row.role)
        ? normalizeRole(row.role)
        : assignableRoles[0]) as Role,
    });
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    editForm.resetFields();
  };

  const submitEdit = async () => {
    if (!editingUser || !user) {
      return;
    }

    try {
      const values = await editForm.validateFields();

      if (
        String(editingUser.id) === String(user.id) &&
        values.role !== user.role
      ) {
        message.error("You cannot change your own role.");
        return;
      }

      await updateMutation.mutateAsync({
        userId: editingUser.id,
        payload: values,
      });
      message.success("User updated");
      closeEditModal();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 403) {
        message.error("Permission denied: You cannot update this user.");
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: Unable to update user. Please try again.");
        return;
      }

      const mapped = mapValidationErrorsToForm(editForm, error);
      if (!mapped && axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
      }
    }
  };

  const submitDelete = async (row: User) => {
    try {
      await deleteMutation.mutateAsync(row.id);
      message.success("User deleted");
      if (editingUser && String(editingUser.id) === String(row.id)) {
        closeEditModal();
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 403) {
        message.error("Permission denied: You cannot delete this user.");
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: Unable to delete user. Please try again.");
        return;
      }

      if (axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
        return;
      }
    }
  };

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="Only System Admin and Department Manager accounts can manage users."
      />
    );
  }

  if (usersQuery.isLoading) {
    return <LoadingState />;
  }

  if (usersQuery.error) {
    const axiosError = usersQuery.error as AxiosError<ApiErrorPayload>;

    if (axiosError.response?.status === 401) {
      return (
        <Result
          status="warning"
          title="Authentication Required"
          subTitle="Authentication or API key forwarding failed for the user-management request. Sign in again and verify the dashboard proxy configuration."
        />
      );
    }

    if (axiosError.response?.status === 403) {
      return (
        <Result
          status="403"
          title="Forbidden"
          subTitle="Your authenticated account does not have access to the user-management scope."
        />
      );
    }

    return <ErrorState message={String(usersQuery.error)} />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Users
        </Title>
        <Button type="primary" onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </Space>

      <SharedTable<User>
        rows={rows}
        columns={columns}
        storageKey="users-shared-table"
        loading={usersQuery.isFetching}
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        paginationMeta={paginationMeta}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.setPageSize}
        globalSearch={listQuery.search}
        onGlobalSearchChange={listQuery.setSearch}
        globalSearchPlaceholder="Search users"
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
          <Space direction="vertical" style={{ width: "100%" }}>
            {capabilitiesQuery.data &&
            (!capabilitiesQuery.data.canUpdateUser ||
              !capabilitiesQuery.data.canDeleteUser) ? (
              <Alert
                type="info"
                showIcon
                message="User management capabilities are limited by the connected backend."
                description={[
                  !capabilitiesQuery.data.canUpdateUser
                    ? "Edit is not available."
                    : null,
                  !capabilitiesQuery.data.canDeleteUser
                    ? "Delete is not available."
                    : null,
                  capabilitiesQuery.data.scope.length > 0
                    ? `Current scope: ${capabilitiesQuery.data.scope.join(", ")}.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ) : null}
            <FilterToolbar
              state={listQuery}
              setters={listQuery}
              loading={Boolean(usersQuery.isFetching)}
            />
          </Space>
        }
        actionColumn={{
          render: (record) =>
            canEditRow(record) || canDeleteRow(record) ? (
              <Space>
                {canEditRow(record) ? (
                  <Button size="small" onClick={() => openEditModal(record)}>
                    Edit
                  </Button>
                ) : null}
                {canDeleteRow(record) ? (
                  <Popconfirm
                    title="Delete user"
                    description="This action cannot be undone."
                    okText="Delete"
                    okButtonProps={{
                      danger: true,
                      loading: deleteMutation.isPending,
                    }}
                    onConfirm={() => void submitDelete(record)}
                  >
                    <Button size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">No access</Text>
            ),
        }}
      />

      <Modal
        title="Create User"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => void submitCreate()}
        confirmLoading={createMutation.isPending}
      >
        <Form<CreateUserFormValues>
          form={createForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 8 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={assignableRoles.map((role) => ({
                value: role,
                label: getRoleLabel(role),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit User"
        open={isEditOpen}
        onCancel={closeEditModal}
        onOk={() => void submitEdit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form<EditUserFormValues>
          form={editForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              disabled={isEditingSelf}
              options={assignableRoles.map((role) => ({
                value: role,
                label: getRoleLabel(role),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
