import React from "react";
import { Table, Input, Button, Space, Dropdown, Menu, DatePicker, Select } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, FilterOutlined } from "@ant-design/icons";
import type { BaseEntity } from "@/types/api";

// Utility to detect field type (simple heuristic)
function getFieldType(key: string, sample: unknown): "text" | "number" | "date" | "select" {
  if (typeof sample === "number") return "number";
  if (typeof sample === "string" && /date|at|time|timestamp/i.test(key)) return "date";
  if (typeof sample === "string") return "text";
  if (typeof sample === "boolean") return "select";
  return "text";
}

interface SharedTableProps {
  rows: BaseEntity[];
  columns: string[];
  columnLabels?: Record<string, string>;
  selectLabelsByField?: Record<string, Map<string, string>>;
  onRowView?: (row: BaseEntity) => void;
  onRowEdit?: (row: BaseEntity) => void;
  onRowDelete?: (row: BaseEntity) => void;
  canViewDetails?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  loading?: boolean;
  // Server-driven filter/sort state and setters
  filterState?: Record<string, unknown>;
  onFilterChange?: (col: string, value: unknown) => void;
  sortState?: { key: string; order: "ascend" | "descend" | null };
  onSortChange?: (col: string, order: "ascend" | "descend" | null) => void;
}

export const SharedTable: React.FC<SharedTableProps> = ({
  rows,
  columns,
  columnLabels,
  selectLabelsByField,
  onRowView,
  onRowEdit,
  onRowDelete,
  canViewDetails,
  canEdit,
  canDelete,
  loading,
  filterState = {},
  onFilterChange,
  sortState = { key: "", order: null },
  onSortChange,
}) => {
  // Column definitions
  const tableColumns = columns.map((col) => {
    const sample = rows.find((r) => r[col] != null)?.[col];
    const type = getFieldType(col, sample);
    return {
      title: (
        <Space>
          {columnLabels?.[col] || col}
          <Button
            size="small"
            icon={sortState.key === col && sortState.order === "ascend" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            type={sortState.key === col ? "primary" : "default"}
            onClick={() => {
              if (onSortChange) {
                const nextOrder = sortState.key === col && sortState.order === "ascend" ? "descend" : "ascend";
                onSortChange(col, nextOrder);
              }
            }}
          />
          <Dropdown
            menu={{
              items: ([
                type === "text"
                  ? {
                      key: "text",
                      label: (
                        <Input
                          placeholder="Filter..."
                          value={typeof filterState[col] === "string" ? filterState[col] : ""}
                          onChange={(e) => onFilterChange && onFilterChange(col, e.target.value)}
                          allowClear
                        />
                      ),
                    }
                  : null,
                type === "number"
                  ? {
                      key: "number",
                      label: (
                        <Input
                          type="number"
                          placeholder="Filter..."
                          value={typeof filterState[col] === "number" ? filterState[col] : ""}
                          onChange={(e) => onFilterChange && onFilterChange(col, e.target.value ? Number(e.target.value) : undefined)}
                          allowClear
                        />
                      ),
                    }
                  : null,
                type === "date"
                  ? {
                      key: "date",
                      label: (
                        <DatePicker.RangePicker
                          onChange={(dates) => onFilterChange && onFilterChange(col, dates ? [dates[0]?.toDate(), dates[1]?.toDate()] : undefined)}
                        />
                      ),
                    }
                  : null,
                type === "select" && selectLabelsByField?.[col]
                  ? {
                      key: "select",
                      label: (
                        <Select
                          style={{ minWidth: 120 }}
                          allowClear
                          placeholder="Select..."
                          value={filterState[col] as string | undefined}
                          onChange={(v) => onFilterChange && onFilterChange(col, v)}
                        >
                          {[...selectLabelsByField[col].entries()].map(([k, v]) => (
                            <Select.Option key={k} value={k}>
                              {v}
                            </Select.Option>
                          ))}
                        </Select>
                      ),
                    }
                  : null,
              ] as any[]).filter((item) => !!item)
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<FilterOutlined />} />
          </Dropdown>
        </Space>
      ),
      dataIndex: col,
      key: col,
      render: (value: unknown) => String(value ?? "N/A"),
    };
  });

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={rows}
      columns={tableColumns}
      pagination={false}
    />
  );
};
