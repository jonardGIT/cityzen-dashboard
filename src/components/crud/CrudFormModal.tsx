"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Modal, Select, Tooltip } from "antd";
import type { FormInstance } from "antd";
import type { CrudFieldConfig } from "@/features/dynamic-crud/types";

type SelectFieldOption = { value: string; label: string; description?: string };

interface CrudFormModalProps {
  title: string;
  open: boolean;
  submitting?: boolean;
  fields: CrudFieldConfig[];
  form: FormInstance<Record<string, unknown>>;
  optionsByField: Record<string, SelectFieldOption[]>;
  onCancel: () => void;
  onSubmit: () => void;
  isUpdate?: boolean;
  submitDisabled?: boolean;
  submitDisabledMessage?: string;
  onRetrySubmitDependency?: () => void;
}

export function CrudFormModal({
  title,
  open,
  submitting,
  fields,
  form,
  optionsByField,
  onCancel,
  onSubmit,
  isUpdate,
  submitDisabled,
  submitDisabledMessage,
  onRetrySubmitDependency,
}: CrudFormModalProps) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitDisabled }}
      destroyOnHidden
    >
      <Form<Record<string, unknown>> form={form} layout="vertical" requiredMark={false}>
        {submitDisabledMessage ? (
          <Alert
            showIcon
            type="error"
            style={{ marginBottom: 16 }}
            message={submitDisabledMessage}
            action={
              onRetrySubmitDependency ? (
                <Button size="small" onClick={onRetrySubmitDependency}>
                  Retry
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {fields.map((field) => {
          const rules = field.required
            ? [{ required: true, message: `${field.label} is required` }]
            : [];

          if (field.type === "password" && isUpdate) {
            return null;
          }

          if (field.type === "textarea") {
            return (
              <Form.Item key={field.name} name={field.name} label={field.label} rules={rules}>
                <Input.TextArea rows={3} />
              </Form.Item>
            );
          }

          if (field.type === "email") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={[...rules, { type: "email", message: "Enter a valid email" }]}
              >
                <Input />
              </Form.Item>
            );
          }

          if (field.type === "password") {
            return (
              <Form.Item key={field.name} name={field.name} label={field.label} rules={rules}>
                <Input.Password />
              </Form.Item>
            );
          }

          if (field.type === "select") {
            return (
              <Form.Item key={field.name} name={field.name} label={field.label} rules={rules}>
                <Select
                  options={optionsByField[field.name] ?? []}
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
                />
              </Form.Item>
            );
          }

          if (field.type === "datetime") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={rules}
              >
                <Input type="datetime-local" />
              </Form.Item>
            );
          }

          return (
            <Form.Item key={field.name} name={field.name} label={field.label} rules={rules}>
              <Input />
            </Form.Item>
          );
        })}
      </Form>
    </Modal>
  );
}

export function toInitialFormValues(values: Record<string, unknown>, fields: CrudFieldConfig[]) {
  const normalized: Record<string, unknown> = { ...values };

  for (const field of fields) {
    if (field.type === "select") {
      const value = normalized[field.name];
      if (value !== undefined && value !== null && value !== "") {
        normalized[field.name] = String(value);
      }
    }

    if (field.type === "datetime") {
      const value = normalized[field.name];
      if (typeof value === "string" && value.length > 0) {
        normalized[field.name] = value;
      }
    }
  }

  return normalized;
}
