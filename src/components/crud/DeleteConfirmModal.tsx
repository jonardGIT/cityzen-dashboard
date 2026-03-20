"use client";

import { Modal, Typography } from "antd";
import type { BaseEntity } from "@/types/api";

interface DeleteConfirmModalProps {
  open: boolean;
  loading?: boolean;
  row: BaseEntity | null;
  resourceLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  loading,
  row,
  resourceLabel,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      title={`Delete ${resourceLabel}`}
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ danger: true }}
      okText="Delete"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Typography.Text>
        Are you sure you want to delete this {resourceLabel.toLowerCase()} record
        {row?.id !== undefined ? ` (#${row.id})` : ""}?
      </Typography.Text>
    </Modal>
  );
}
