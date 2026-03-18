"use client";

import { Button, Card, Form, Input, Modal, Result, Select, Space, Table, Typography, message } from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/PageStates";
import { useAuth } from "@/context/AuthContext";
import { useCreateUserMutation, useUsersQuery } from "@/features/users/api";
import { CAN_MANAGE_USERS } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import type { ApiErrorPayload } from "@/types/api";
import { Role } from "@/types/auth";

const { Title } = Typography;

interface CreateUserFormValues {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export default function UsersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(...CAN_MANAGE_USERS);
  const usersQuery = useUsersQuery(canManage);
  const createMutation = useCreateUserMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateUserFormValues>();
  const tableState = useTableQueryParams(10);

  const allRows = useMemo(() => {
    const rows = usersQuery.data ?? [];
    if (!tableState.search) {
      return rows;
    }

    return rows.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(tableState.search.toLowerCase()),
    );
  }, [usersQuery.data, tableState.search]);

  const pagedRows = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return allRows.slice(start, start + tableState.pageSize);
  }, [allRows, tableState.page, tableState.pageSize]);

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
  }

  if (usersQuery.error) {
    return <ErrorState message={String(usersQuery.error)} />;
  }

  const submit = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync(values);
      message.success("User created");
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
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Users
        </Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Create User
        </Button>
      </Space>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search users"
            value={tableState.search}
            onChange={(event) => tableState.setSearch(event.target.value)}
          />
          {allRows.length === 0 ? (
            <EmptyState description="No users found" />
          ) : (
            <Table
              rowKey="id"
              dataSource={pagedRows}
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
                { title: "ID", dataIndex: "id", key: "id" },
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
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form<CreateUserFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={Object.values(Role).map((role) => ({ value: role, label: role }))}
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
