"use client";

import { Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import type { CrudFieldConfig } from "@/features/dynamic-crud/types";

interface CrudFormModalProps {
  title: string;
  open: boolean;
  submitting?: boolean;
  fields: CrudFieldConfig[];
  form: FormInstance<Record<string, unknown>>;
  optionsByField: Record<string, Array<{ value: string; label: string }>>;
  onCancel: () => void;
  onSubmit: () => void;
  isUpdate?: boolean;
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
}: CrudFormModalProps) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form<Record<string, unknown>> form={form} layout="vertical" requiredMark={false}>
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
                <Select options={optionsByField[field.name] ?? []} />
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
    if (field.type === "datetime") {
      const value = normalized[field.name];
      if (typeof value === "string" && value.length > 0) {
        normalized[field.name] = value;
      }
    }
  }

  return normalized;
}
