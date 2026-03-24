"use client";

import React, { useState, useMemo } from "react";
import { Typography, App, Form, Input, Select, Button, Card, Space, Result, Alert, Table, Modal, Popconfirm } from "antd";
import { LoadingState, EmptyState } from "@/components/common/PageStates";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
// Temporary stub for submitCreate to fix reference error
const submitCreate = async () => { /* TODO: implement user creation */ };
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUsersCapabilitiesQuery,
  useUpdateUserMutation,
  useUsersQuery,
} from "@/features/users/api";
import { CAN_MANAGE_USERS, canManageRole, getAssignableRoles } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import type { ApiErrorPayload, User } from "@/types/api";
import { Role } from "@/types/auth";

const { Title } = Typography;

interface CreateUserFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

interface EditUserFormValues {
  name: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export default function UsersPage() {
    // ...existing code...
  const { message } = App.useApp();
  const { hasRole, user } = useAuth();
  const canManage = hasRole(...CAN_MANAGE_USERS);
  const listQuery = useListQueryParams();
  const usersQuery = useUsersQuery(listQuery, canManage);
  const capabilitiesQuery = useUsersCapabilitiesQuery(canManage);
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
    // ...existing code...
    const isEditingSelf = Boolean(editingUser && String(editingUser.id) === String(user?.id));
  const [createForm] = Form.useForm<CreateUserFormValues>();
  const [editForm] = Form.useForm<EditUserFormValues>();

  const assignableRoles = useMemo(() => {
    if (!user) {
      return [];
    }

    return getAssignableRoles(user.role);
  }, [user]);

  const canEditRow = (row: User): boolean => {
    if (!capabilitiesQuery.data?.canUpdateUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    // Cannot edit self
    if (String(row.id) === String(user.id)) {
      return false;
    }

    // Can only edit users with lower privilege level
    return canManageRole(user.role, row.role as Role);
  };

  const canDeleteRow = (row: User): boolean => {
    if (!capabilitiesQuery.data?.canDeleteUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    // Cannot delete self
    if (String(row.id) === String(user.id)) {
      return false;
    }

    // Can only delete users with lower privilege level
    return canManageRole(user.role, row.role as Role);
  };

  const rows = useMemo(() => {
    const items = usersQuery.data?.data ?? [];
    if (!listQuery.search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(listQuery.search.toLowerCase()),
    );
  }, [listQuery.search, usersQuery.data]);
  const paginationMeta = usersQuery.data?.pagination;

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="Only SUPER_ADMIN and ADMIN can manage users."
      />
    );
  }

  if (usersQuery.isLoading) {
    return <LoadingState />;

  const openEditModal = (row: User) => {
    setEditingUser(row);
    setIsEditOpen(true);
    editForm.setFieldsValue({
      name: row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" "),
      email: row.email ?? "",
      role: (Object.values(Role).includes(row.role as Role)
        ? (row.role as Role)
        : assignableRoles[0]) as Role,
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
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

      // Prevent changing own role
      if (String(editingUser.id) === String(user.id) && values.role !== user.role) {
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
        message.error("Permission denied: You cannot manage this user.");
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: Unable to update user. Please try again.");
        return;
      }

      const mapped = mapValidationErrorsToForm(editForm, error);
      if (!mapped) {
        if (axiosError.response?.data?.message) {
          message.error(axiosError.response.data.message);
        }
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

      message.error("Failed to delete user");
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Users
        </Title>
        <Button type="primary" onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </Space>

      <Card>
        <Space orientation="vertical" style={{ width: "100%" }}>
          {capabilitiesQuery.data &&
            (!capabilitiesQuery.data?.canUpdateUser || !capabilitiesQuery.data?.canDeleteUser) ? (
            <Alert
              type="info"
              showIcon
              message="User management capabilities are limited by the connected backend."
              description={[
                !capabilitiesQuery.data?.canUpdateUser ? "Edit is not available." : null,
                !capabilitiesQuery.data?.canDeleteUser ? "Delete is not available." : null,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ) : null}
          <Input.Search
            allowClear
            placeholder="Search users"
            value={listQuery.search}
            onChange={(event) => listQuery.setSearch(event.target.value)}
          />
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(usersQuery.isFetching)}
          />
          {rows.length === 0 ? (
            <EmptyState description="No users found" />
          ) : (
            <Table
              rowKey="id"
              loading={usersQuery.isFetching}
              dataSource={rows}
              pagination={{
                current: listQuery.page,
                pageSize: listQuery.pageSize,
                total: paginationMeta?.total ?? rows.length,
                onChange: (nextPage, nextPageSize) => {
                  if (nextPageSize !== listQuery.pageSize) {
                    listQuery.setPageSize(nextPageSize);
                    return;
                  }

                  listQuery.setPage(nextPage);
                },
              }}
              columns={[
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record: User) =>
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
                            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                            onConfirm={() => void submitDelete(record)}
                          >
                            <Button size="small" danger>
                              Delete
                            </Button>
                          </Popconfirm>
                        ) : null}
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">No access</Typography.Text>
                    ),
                },
                { title: "Email", dataIndex: "email", key: "email" },
                { title: "Name", dataIndex: "name", key: "name" },
                { title: "Role", dataIndex: "role", key: "role" },
              ]}
            />
          )}
        </Space>
      </Card>

      <Modal
        title="Create User"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => void submitCreate()}
        confirmLoading={createMutation.isPending}
      >
        <Form<CreateUserFormValues> form={createForm} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={assignableRoles.map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>
          <Form.Item name="firstName" label="First Name">
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name">
            <Input />
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
        <Form<EditUserFormValues> form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              disabled={isEditingSelf}
              options={assignableRoles.map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>
          <Form.Item name="firstName" label="First Name">
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
}
