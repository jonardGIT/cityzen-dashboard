"use client";

import { Button, Input, Space, Table } from "antd";
import { useMemo } from "react";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import type { BaseEntity } from "@/types/api";

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatCellValue(item)).filter((item) => item !== "N/A");
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

interface CrudTableProps {
  rows: BaseEntity[];
  loading?: boolean;
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
    const keySet = new Set<string>(["id"]);
    for (const row of rows) {
      Object.keys(row).forEach((key) => keySet.add(key));
      if (keySet.size >= 7) {
        break;
      }
    }

    return Array.from(keySet).slice(0, 6);
  }, [rows]);

  const columns = [
    ...keys.map((key) => ({
      title: key,
      dataIndex: key,
      key,
      render: (value: unknown) => {
        return formatCellValue(value);
      },
    })),
    {
      title: "Actions",
      key: "actions",
      width: 240,
      render: (_: unknown, row: BaseEntity) => (
        <Space>
          {canViewDetails ? (
            <Button size="small" onClick={() => onView(row)}>
              View
            </Button>
          ) : null}
          {canEdit ? (
            <Button size="small" onClick={() => onEdit(row)}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button size="small" danger onClick={() => onDelete(row)}>
              Delete
            </Button>
          ) : null}
        </Space>
      ),
    },
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
