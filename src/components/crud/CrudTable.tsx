"use client";

import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Input, Space, Table, Tooltip } from "antd";
import { useMemo } from "react";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import type { BaseEntity } from "@/types/api";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const ACTION_BUTTON_STYLES = {
  view: { backgroundColor: "#1677ff", borderColor: "#1677ff", color: "#ffffff" },
  edit: { backgroundColor: "#faad14", borderColor: "#faad14", color: "#ffffff" },
  delete: { backgroundColor: "#ff4d4f", borderColor: "#ff4d4f", color: "#ffffff" },
} as const;

function formatDateLikeString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isDateLike =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed);

  if (!isDateLike) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return DATE_TIME_FORMATTER.format(parsed);
}

function camelCaseToTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bId\b/i, "ID")
    .trim();
}

function formatCellValue(value: unknown, optionLabels?: Map<string, string>): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatCellValue(item, optionLabels))
      .filter((item) => item !== "N/A");
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

  if (typeof value === "string") {
    if (optionLabels?.has(value)) {
      return optionLabels.get(value) ?? value;
    }

    return formatDateLikeString(value) ?? value;
  }

  if (typeof value === "number" && optionLabels?.has(String(value))) {
    return optionLabels.get(String(value)) ?? String(value);
  }

  return String(value);
}

interface CrudTableProps {
  rows: BaseEntity[];
  loading?: boolean;
  columnLabelsByField?: Record<string, string>;
  selectLabelsByField?: Record<string, Map<string, string>>;
  onView: (row: BaseEntity) => void;
  onEdit: (row: BaseEntity) => void;
  onDelete: (row: BaseEntity) => void;
  canViewDetails: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function CrudTable({
  rows,
  loading,
  columnLabelsByField,
  selectLabelsByField,
  onView,
  onEdit,
  onDelete,
  canViewDetails,
  canEdit,
  canDelete,
}: CrudTableProps) {
  const tableState = useTableQueryParams(10);

  const allRows = useMemo(() => {
    if (!tableState.search) {
      return rows;
    }

    return rows.filter((row) =>
      JSON.stringify(row)
        .toLowerCase()
        .includes(tableState.search.toLowerCase()),
    );
  }, [rows, tableState.search]);

  const pagedRows = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return allRows.slice(start, start + tableState.pageSize);
  }, [allRows, tableState.page, tableState.pageSize]);

  const keys = useMemo(() => {
    const keySet = new Set<string>();
    for (const row of rows) {
      Object.keys(row)
        .filter((key) => key !== "id")
        .forEach((key) => keySet.add(key));
      if (keySet.size >= 7) {
        break;
      }
    }

    return Array.from(keySet).slice(0, 6);
  }, [rows]);

  const columns = [
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_: unknown, row: BaseEntity) => (
        <Space>
          {canViewDetails ? (
            <Tooltip title="View">
              <Button
                size="small"
                shape="circle"
                icon={<EyeOutlined />}
                aria-label="View"
                style={ACTION_BUTTON_STYLES.view}
                onClick={() => onView(row)}
              />
            </Tooltip>
          ) : null}
          {canEdit ? (
            <Tooltip title="Edit">
              <Button
                size="small"
                shape="circle"
                icon={<EditOutlined />}
                aria-label="Edit"
                style={ACTION_BUTTON_STYLES.edit}
                onClick={() => onEdit(row)}
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
                onClick={() => onDelete(row)}
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    ...keys.map((key) => ({
      title: columnLabelsByField?.[key] ?? camelCaseToTitleCase(key),
      dataIndex: key,
      key,
      render: (value: unknown) => {
        return formatCellValue(value, selectLabelsByField?.[key]);
      },
    })),
  ];

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Input.Search
        allowClear
        value={tableState.search}
        placeholder="Search records"
        onChange={(event) => tableState.setSearch(event.target.value)}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={pagedRows}
        scroll={{ x: 1024 }}
        columns={columns}
        locale={{ emptyText: "No records found" }}
        pagination={{
          current: tableState.page,
          pageSize: tableState.pageSize,
          total: allRows.length,
          onChange: (page, pageSize) => {
            tableState.setPage(page);
            tableState.setPageSize(pageSize);
          },
        }}
      />
    </Space>
  );
}
