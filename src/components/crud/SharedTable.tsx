"use client";

import { ArrowDownOutlined, ArrowUpOutlined, FilterFilled, FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, Popover, Select, Space, Typography } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import React, { useState, type ReactNode } from "react";
import { ResizableTable } from "@/components/common/ResizableTable";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { BaseEntity } from "@/types/api";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ColumnFilterKind = "text" | "select" | "date";
type SortOrder = "asc" | "desc";
type DateRangeValue = {
  from?: string;
  to?: string;
};

export interface SharedTableColumn<T extends BaseEntity> {
  key: Extract<keyof T, string> | string;
  title?: string;
  filterKind?: ColumnFilterKind;
  sortable?: boolean;
  width?: number;
  selectOptions?: Map<string, string>;
  render?: (value: unknown, row: T) => ReactNode;
}

interface SharedTableProps<T extends BaseEntity> {
  rows: T[];
  columns: Array<SharedTableColumn<T>>;
  loading?: boolean;
  page: number;
  pageSize: number;
  paginationMeta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
  globalSearchPlaceholder?: string;
  topToolbar?: ReactNode;
  emptyText?: ReactNode;
  scrollX?: number;
  storageKey?: string;
  actionColumn?: {
    title?: string;
    width?: number;
    render: (row: T) => ReactNode;
  };
  sortState?: {
    key: string;
    order: SortOrder;
  };
  onSortChange?: (columnKey: string, order: SortOrder) => void;
  serverDateFilters?: Partial<Record<"createdAt" | "updatedAt", DateRangeValue>>;
  onServerDateFilterChange?: (columnKey: "createdAt" | "updatedAt", value: DateRangeValue) => void;
}

function camelCaseToTitleCase(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bId\b/i, "ID")
    .trim();
}

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

function normalizeText(value: unknown, optionLabels?: Map<string, string>): string {
  return formatCellValue(value, optionLabels).toLowerCase();
}

function matchesDateRange(value: unknown, range: DateRangeValue): boolean {
  if (!range.from && !range.to) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const fromTime = range.from ? new Date(range.from).getTime() : undefined;
  const toTime = range.to ? new Date(range.to).getTime() : undefined;

  if (fromTime !== undefined && !Number.isNaN(fromTime) && timestamp < fromTime) {
    return false;
  }

  if (toTime !== undefined && !Number.isNaN(toTime) && timestamp > toTime) {
    return false;
  }

  return true;
}

function toDayRangeValue(range?: DateRangeValue): [dayjs.Dayjs | null, dayjs.Dayjs | null] {
  return [range?.from ? dayjs(range.from) : null, range?.to ? dayjs(range.to) : null];
}

export function SharedTable<T extends BaseEntity>({
  rows,
  columns,
  loading,
  page,
  pageSize,
  paginationMeta,
  onPageChange,
  onPageSizeChange,
  globalSearch = "",
  onGlobalSearchChange,
  globalSearchPlaceholder = "Search records",
  topToolbar,
  emptyText = "No records found",
  scrollX = 1024,
  storageKey,
  actionColumn,
  sortState,
  onSortChange,
  serverDateFilters,
  onServerDateFilterChange,
}: SharedTableProps<T>) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string | DateRangeValue | undefined>>({});

  const setColumnFilter = (columnKey: string, value: string | DateRangeValue | undefined) => {
    setColumnFilters((current) => ({
      ...current,
      [columnKey]: value,
    }));
  };

  const filteredRows = rows.filter((row) => {
    if (globalSearch) {
      const haystack = JSON.stringify(row).toLowerCase();
      if (!haystack.includes(globalSearch.toLowerCase())) {
        return false;
      }
    }

    for (const column of columns) {
      const value = row[column.key];
      const localFilter = columnFilters[column.key];

      if (column.filterKind === "text" && typeof localFilter === "string" && localFilter.trim()) {
        if (!normalizeText(value, column.selectOptions).includes(localFilter.trim().toLowerCase())) {
          return false;
        }
      }

      if (column.filterKind === "select" && typeof localFilter === "string" && localFilter) {
        if (String(value ?? "") !== localFilter) {
          return false;
        }
      }

      if (
        column.filterKind === "date" &&
        localFilter &&
        typeof localFilter === "object" &&
        !Array.isArray(localFilter) &&
        !matchesDateRange(value, localFilter)
      ) {
        return false;
      }
    }

    return true;
  });

  const renderFilterContent = (column: SharedTableColumn<T>) => {
    const isServerTimestampColumn =
      (column.key === "createdAt" || column.key === "updatedAt") && Boolean(onServerDateFilterChange);

    if (column.filterKind === "text") {
      return (
        <Space direction="vertical" style={{ width: 240 }}>
          <Input
            allowClear
            placeholder={`Filter ${column.title ?? camelCaseToTitleCase(column.key)}`}
            value={typeof columnFilters[column.key] === "string" ? String(columnFilters[column.key]) : ""}
            onChange={(event) => setColumnFilter(column.key, event.target.value || undefined)}
          />
        </Space>
      );
    }

    if (column.filterKind === "select") {
      return (
        <Space direction="vertical" style={{ width: 240 }}>
          <Select
            allowClear
            placeholder={`Filter ${column.title ?? camelCaseToTitleCase(column.key)}`}
            value={typeof columnFilters[column.key] === "string" ? columnFilters[column.key] : undefined}
            onChange={(value) => setColumnFilter(column.key, value)}
            options={Array.from(column.selectOptions?.entries() ?? []).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Space>
      );
    }

    if (column.filterKind === "date") {
      const range = isServerTimestampColumn
        ? serverDateFilters?.[column.key as "createdAt" | "updatedAt"]
        : (columnFilters[column.key] as DateRangeValue | undefined);

      return (
        <Space direction="vertical" style={{ width: 280 }}>
          <DatePicker.RangePicker
            allowEmpty={[true, true]}
            value={toDayRangeValue(range)}
            onChange={(dates) => {
              const nextValue = {
                from: dates?.[0]?.toISOString(),
                to: dates?.[1]?.toISOString(),
              };

              if (isServerTimestampColumn) {
                onServerDateFilterChange?.(column.key as "createdAt" | "updatedAt", nextValue);
                return;
              }

              setColumnFilter(column.key, nextValue.from || nextValue.to ? nextValue : undefined);
            }}
          />
          <Button
            size="small"
            onClick={() => {
              if (isServerTimestampColumn) {
                onServerDateFilterChange?.(column.key as "createdAt" | "updatedAt", {});
                return;
              }

              setColumnFilter(column.key, undefined);
            }}
          >
            Clear
          </Button>
        </Space>
      );
    }

    return null;
  };

  const tableColumns: TableColumnsType<T> = [
    ...(actionColumn
      ? [
          {
            title: actionColumn.title ?? "Actions",
            key: "actions",
            width: actionColumn.width ?? 180,
            render: (_value: unknown, row: T) => actionColumn.render(row),
          },
        ]
      : []),
    ...columns.map((column) => {
      const localDateFilter = columnFilters[column.key] as DateRangeValue | undefined;
      const hasLocalFilter = Boolean(
        typeof columnFilters[column.key] === "string"
          ? columnFilters[column.key]
          : localDateFilter?.from || localDateFilter?.to,
      );
      const hasServerDateFilter = Boolean(
        (column.key === "createdAt" || column.key === "updatedAt") &&
          (serverDateFilters?.[column.key as "createdAt" | "updatedAt"]?.from ||
            serverDateFilters?.[column.key as "createdAt" | "updatedAt"]?.to),
      );
      const isSorted = sortState?.key === column.key;

      return {
        title: (
          <Space size={4} wrap>
            <Typography.Text>{column.title ?? camelCaseToTitleCase(column.key)}</Typography.Text>
            {column.sortable && onSortChange ? (
              <Button
                size="small"
                type={isSorted ? "primary" : "default"}
                icon={isSorted && sortState?.order === "asc" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                onClick={() => {
                  const nextOrder: SortOrder =
                    sortState?.key === column.key && sortState.order === "desc" ? "asc" : "desc";
                  onSortChange(column.key, nextOrder);
                }}
              />
            ) : null}
            {column.filterKind ? (
              <Popover content={renderFilterContent(column)} trigger="click" placement="bottomLeft">
                <Button
                  size="small"
                  type={hasLocalFilter || hasServerDateFilter ? "primary" : "default"}
                  icon={hasLocalFilter || hasServerDateFilter ? <FilterFilled /> : <FilterOutlined />}
                />
              </Popover>
            ) : null}
          </Space>
        ),
        dataIndex: column.key,
        key: column.key,
        width: column.width,
        render: (value: unknown, row: T) =>
          column.render ? column.render(value, row) : formatCellValue(value, column.selectOptions),
      };
    }),
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {topToolbar}
      {onGlobalSearchChange ? (
        <Input.Search
          allowClear
          value={globalSearch}
          placeholder={globalSearchPlaceholder}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
        />
      ) : null}
      <ResizableTable
        rowKey="id"
        loading={loading}
        dataSource={filteredRows}
        columns={tableColumns}
        storageKey={storageKey}
        showColumnVisibilitySelector
        scroll={{ x: scrollX }}
        locale={{ emptyText }}
        pagination={{
          current: page,
          pageSize,
          total: paginationMeta?.total ?? filteredRows.length,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            if (nextPageSize !== pageSize) {
              onPageSizeChange(nextPageSize);
              return;
            }

            onPageChange(nextPage);
          },
        }}
      />
    </Space>
  );
}
