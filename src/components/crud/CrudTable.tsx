"use client";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Popover,
  Select,
  Skeleton,
  Space,
  Tag,
  Table,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState, type ReactNode } from "react";
import type {
  ListFilter,
  ListFilterOperator,
  ListSortOrder,
} from "@/lib/api/list-query-params";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
} from "@/lib/api/list-query-params";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { BaseEntity } from "@/types/api";
import type { ListQueryValidationState } from "@/components/crud/list-query-validation";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const ACTION_BUTTON_STYLES = {
  view: {
    backgroundColor: "#1677ff",
    borderColor: "#1677ff",
    color: "#ffffff",
  },
  edit: {
    backgroundColor: "#faad14",
    borderColor: "#faad14",
    color: "#ffffff",
  },
  delete: {
    backgroundColor: "#ff4d4f",
    borderColor: "#ff4d4f",
    color: "#ffffff",
  },
} as const;

function formatDateLikeString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isDateLike =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(
      trimmed,
    );

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

function isDateLikeFieldName(key: string): boolean {
  return /(^date|date$|At$|_at$|timestamp|time$)/i.test(key);
}

function formatCellValue(
  value: unknown,
  optionLabels?: Map<string, string>,
): string {
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
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      )
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

    if (
      typeof record.description === "string" &&
      record.description.length > 0
    ) {
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

type ColumnFilterKind = "text" | "number" | "date" | "select";

function formatColumnSortLabel(
  key: string,
  order: ListSortOrder,
  columnLabelsByField?: Record<string, string>,
): string {
  const label = columnLabelsByField?.[key] ?? camelCaseToTitleCase(key);
  return `Sorted by ${label} (${order === "asc" ? "ascending" : "descending"})`;
}

function getColumnFilterKind(
  key: string,
  rows: BaseEntity[],
  selectLabelsByField?: Record<string, Map<string, string>>,
): ColumnFilterKind {
  if (selectLabelsByField?.[key]) {
    return "select";
  }

  const sample = rows.find(
    (row) => row[key] !== undefined && row[key] !== null,
  )?.[key];
  if (typeof sample === "number") {
    return "number";
  }

  if (typeof sample === "string" && formatDateLikeString(sample)) {
    return "date";
  }

  if (isDateLikeFieldName(key)) {
    return "date";
  }

  return "text";
}

function getDefaultOperator(kind: ColumnFilterKind): ListFilterOperator {
  switch (kind) {
    case "date":
      return "between";
    case "select":
      return "equals";
    case "number":
      return "equals";
    default:
      return "contains";
  }
}

function getOperatorOptions(kind: ColumnFilterKind): Array<{
  label: string;
  value: ListFilterOperator;
}> {
  switch (kind) {
    case "date":
      return [
        { label: "Equals", value: "equals" },
        { label: "After", value: "gt" },
        { label: "On or after", value: "gte" },
        { label: "Before", value: "lt" },
        { label: "On or before", value: "lte" },
        { label: "Between", value: "between" },
      ];
    case "select":
      return [
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ];
    case "number":
      return [
        { label: "Equals", value: "equals" },
        { label: "Greater than", value: "gt" },
        { label: "At least", value: "gte" },
        { label: "Less than", value: "lt" },
        { label: "At most", value: "lte" },
        { label: "In", value: "in" },
      ];
    default:
      return [
        { label: "Contains", value: "contains" },
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ];
  }
}

function formatFilterTagValue(
  filter: ListFilter,
  optionLabels?: Map<string, string>,
): string {
  if (Array.isArray(filter.value)) {
    return filter.value
      .map((value) => formatCellValue(value, optionLabels))
      .join(filter.operator === "between" ? " to " : ", ");
  }

  return formatCellValue(filter.value, optionLabels);
}

interface CrudTableProps {
  rows: BaseEntity[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filters: ListFilter[];
  onFilterChange: (value: ListFilter) => void;
  onFilterRemove: (field: string) => void;
  onClearFilters: () => void;
  sortBy: string;
  sortOrder: ListSortOrder;
  onSortChange: (sortBy: string, sortOrder: ListSortOrder) => void;
  page: number;
  pageSize: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  paginationMeta?: PaginationMeta;
  columnLabelsByField?: Record<string, string>;
  selectLabelsByField?: Record<string, Map<string, string>>;
  onView: (row: BaseEntity) => void;
  onEdit: (row: BaseEntity) => void;
  onDelete: (row: BaseEntity) => void;
  canViewDetails: boolean;
  canEdit: boolean;
  canDelete: boolean;
  filterToolbar?: ReactNode;
  validationState?: ListQueryValidationState | null;
}

export function CrudTable({
  rows,
  loading,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onFilterRemove,
  onClearFilters,
  sortBy,
  sortOrder,
  onSortChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  paginationMeta,
  columnLabelsByField,
  selectLabelsByField,
  onView,
  onEdit,
  onDelete,
  canViewDetails,
  canEdit,
  canDelete,
  filterToolbar,
  validationState,
}: CrudTableProps) {
  const [draftOperators, setDraftOperators] = useState<
    Partial<Record<string, ListFilterOperator>>
  >({});

  const keys = useMemo(() => {
    const MAX_COLUMNS = 6;
    const DATE_COLUMN_RESERVE = 2;
    const DISCOVERY_LIMIT = 20;

    const keySet = new Set<string>();
    for (const row of rows) {
      Object.keys(row)
        .filter((key) => key !== "id")
        .forEach((key) => keySet.add(key));

      if (keySet.size >= DISCOVERY_LIMIT) {
        break;
      }
    }

    const allKeys = Array.from(keySet);
    const dateKeys = allKeys.filter((key) => isDateLikeFieldName(key));
    const nonDateKeys = allKeys.filter((key) => !isDateLikeFieldName(key));

    const dateSlots = Math.min(DATE_COLUMN_RESERVE, dateKeys.length);
    const nonDateSlots = Math.max(0, MAX_COLUMNS - dateSlots);

    return [
      ...nonDateKeys.slice(0, nonDateSlots),
      ...dateKeys.slice(0, dateSlots),
    ];
  }, [rows]);

  const filterByField = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter) => [filter.field, filter]),
      ) as Record<string, ListFilter>,
    [filters],
  );
  const activeColumnFilterEntries = filters;
  const activeSortIsColumnSort = keys.includes(sortBy);

  const updateDraftOperator = (field: string, operator: ListFilterOperator) => {
    setDraftOperators((current) => ({
      ...current,
      [field]: operator,
    }));
  };

  const applyFilter = (
    field: string,
    operator: ListFilterOperator,
    value: unknown,
  ) => {
    if (value === undefined || value === null || value === "") {
      onFilterRemove(field);
      return;
    }

    if (Array.isArray(value) && value.length === 0) {
      onFilterRemove(field);
      return;
    }

    onFilterChange({
      field,
      operator,
      value: value as ListFilter["value"],
    });
  };

  const clearColumnSort = () => {
    onSortChange(DEFAULT_SORT_BY, DEFAULT_SORT_ORDER);
  };

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
      title: (() => {
        const filterKind = getColumnFilterKind(key, rows, selectLabelsByField);
        const activeFilter = filterByField[key];
        const selectedOperator =
          activeFilter?.operator ??
          draftOperators[key] ??
          getDefaultOperator(filterKind);
        const fieldErrors = validationState?.filterErrorsByField[key] ?? [];
        const sortErrors =
          activeSortIsColumnSort && sortBy === key
            ? (validationState?.sortErrorsByField[key] ?? [])
            : [];

        return (
          <Space size={4} wrap>
            <span>
              {columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}
            </span>
            <Tooltip
              title={
                sortBy === key
                  ? sortOrder === "asc"
                    ? "Sorted ascending"
                    : sortOrder === "desc"
                      ? "Sorted descending"
                      : "Sort column"
                  : "Sort column"
              }
            >
              <Button
                size="small"
                danger={sortErrors.length > 0}
                type={sortBy === key ? "primary" : "default"}
                aria-label={`Sort ${columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}`}
                icon={
                  sortBy === key ? (
                    sortOrder === "asc" ? (
                      <SortAscendingOutlined />
                    ) : sortOrder === "desc" ? (
                      <SortDescendingOutlined />
                    ) : (
                      <SwapOutlined />
                    )
                  ) : (
                    <SwapOutlined />
                  )
                }
                onClick={() => {
                  if (sortBy !== key) {
                    onSortChange(key, "asc");
                    return;
                  }

                  if (sortOrder === "asc") {
                    onSortChange(key, "desc");
                    return;
                  }

                  clearColumnSort();
                }}
              />
            </Tooltip>
            <Popover
              trigger="click"
              content={
                <Space
                  orientation="vertical"
                  size={8}
                  style={{ minWidth: 220 }}
                >
                  <Select
                    value={selectedOperator}
                    options={getOperatorOptions(filterKind)}
                    onChange={(nextOperator) => {
                      updateDraftOperator(key, nextOperator);
                      if (activeFilter) {
                        onFilterRemove(key);
                      }
                    }}
                  />
                  {filterKind === "select" ? (
                    <Select
                      allowClear
                      showSearch
                      mode={selectedOperator === "in" ? "multiple" : undefined}
                      placeholder={`Filter ${columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}`}
                      value={
                        activeFilter?.value as string | string[] | undefined
                      }
                      onChange={(value) => {
                        applyFilter(key, selectedOperator, value);
                      }}
                      options={Array.from(
                        selectLabelsByField?.[key]?.entries() ?? [],
                      ).map(([value, label]) => ({ value, label }))}
                    />
                  ) : null}
                  {filterKind === "date" ? (
                    selectedOperator === "between" ? (
                      <RangePicker
                        showTime
                        value={
                          Array.isArray(activeFilter?.value) &&
                          activeFilter.value.length === 2
                            ? [
                                dayjs(String(activeFilter.value[0])),
                                dayjs(String(activeFilter.value[1])),
                              ]
                            : null
                        }
                        onChange={(value) => {
                          if (!value?.[0] || !value?.[1]) {
                            onFilterRemove(key);
                            return;
                          }

                          applyFilter(key, selectedOperator, [
                            value[0].toISOString(),
                            value[1].toISOString(),
                          ]);
                        }}
                      />
                    ) : (
                      <DatePicker
                        showTime
                        value={
                          activeFilter && !Array.isArray(activeFilter.value)
                            ? dayjs(String(activeFilter.value))
                            : null
                        }
                        onChange={(value) => {
                          applyFilter(
                            key,
                            selectedOperator,
                            value ? value.toISOString() : undefined,
                          );
                        }}
                      />
                    )
                  ) : null}
                  {filterKind === "number" ? (
                    <Input
                      allowClear
                      type="number"
                      autoFocus
                      placeholder={
                        selectedOperator === "in"
                          ? "Comma-separated values"
                          : "Enter value"
                      }
                      value={
                        Array.isArray(activeFilter?.value)
                          ? activeFilter.value.join(",")
                          : typeof activeFilter?.value === "number"
                            ? String(activeFilter.value)
                            : ""
                      }
                      onChange={(event) => {
                        const raw = event.target.value.trim();
                        if (!raw) {
                          onFilterRemove(key);
                          return;
                        }

                        if (selectedOperator === "in") {
                          const values = raw
                            .split(",")
                            .map((value) => Number(value.trim()))
                            .filter((value) => !Number.isNaN(value));
                          applyFilter(key, selectedOperator, values);
                          return;
                        }

                        const numericValue = Number(raw);
                        applyFilter(
                          key,
                          selectedOperator,
                          Number.isNaN(numericValue) ? undefined : numericValue,
                        );
                      }}
                    />
                  ) : null}
                  {filterKind === "text" ? (
                    <Input
                      allowClear
                      autoFocus
                      placeholder={
                        selectedOperator === "in"
                          ? "Comma-separated values"
                          : `Search ${columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}`
                      }
                      value={
                        Array.isArray(activeFilter?.value)
                          ? activeFilter.value.join(", ")
                          : typeof activeFilter?.value === "string"
                            ? activeFilter.value
                            : ""
                      }
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (!raw.trim()) {
                          onFilterRemove(key);
                          return;
                        }

                        if (selectedOperator === "in") {
                          const values = raw
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean);
                          applyFilter(key, selectedOperator, values);
                          return;
                        }

                        applyFilter(key, selectedOperator, raw);
                      }}
                    />
                  ) : null}
                  {fieldErrors.length > 0 ? (
                    <Space orientation="vertical" size={2}>
                      {fieldErrors.map((errorMessage) => (
                        <Text key={errorMessage} type="danger">
                          {errorMessage}
                        </Text>
                      ))}
                    </Space>
                  ) : null}
                  <Button size="small" onClick={() => onFilterRemove(key)}>
                    Clear{" "}
                    {columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}{" "}
                    filter
                  </Button>
                </Space>
              }
            >
              <Button
                size="small"
                danger={fieldErrors.length > 0}
                type={activeFilter ? "primary" : "default"}
                aria-label={`Filter ${columnLabelsByField?.[key] ?? camelCaseToTitleCase(key)}`}
                icon={<FilterOutlined />}
              />
            </Popover>
            {sortErrors.length > 0 ? (
              <Tooltip title={sortErrors.join(" ")}>
                <Tag color="red">Sort error</Tag>
              </Tooltip>
            ) : null}
          </Space>
        );
      })(),
      dataIndex: key,
      key,
      render: (value: unknown) => {
        return formatCellValue(value, selectLabelsByField?.[key]);
      },
    })),
  ];

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      {filterToolbar}
      {validationState && validationState.generalErrors.length > 0 ? (
        <Alert
          showIcon
          type="error"
          title={validationState.message}
          description={validationState.generalErrors.join(" ")}
        />
      ) : null}
      {activeColumnFilterEntries.length > 0 || activeSortIsColumnSort ? (
        <Space wrap>
          {activeColumnFilterEntries.map((filter) => (
            <Tag
              key={filter.field}
              closable
              color={
                validationState?.filterErrorsByField[filter.field]?.length
                  ? "red"
                  : "blue"
              }
              onClose={() => {
                onFilterRemove(filter.field);
              }}
            >
              {(columnLabelsByField?.[filter.field] ??
                camelCaseToTitleCase(filter.field)) +
                ": " +
                formatFilterTagValue(
                  filter,
                  selectLabelsByField?.[filter.field],
                )}
            </Tag>
          ))}
          {activeSortIsColumnSort ? (
            <Tag
              closable
              color={
                validationState?.sortErrorsByField[sortBy]?.length
                  ? "red"
                  : "processing"
              }
              onClose={clearColumnSort}
            >
              {formatColumnSortLabel(sortBy, sortOrder, columnLabelsByField)}
            </Tag>
          ) : null}
          <Button
            size="small"
            onClick={() => {
              onClearFilters();
              clearColumnSort();
            }}
          >
            Clear column filters
          </Button>
        </Space>
      ) : null}
      <Input.Search
        allowClear
        value={search}
        placeholder="Search records"
        onChange={(event) => onSearchChange(event.target.value)}
      />
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : null}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 1024 }}
        columns={columns}
        locale={{ emptyText: "No records found" }}
        pagination={{
          current: page,
          pageSize,
          total: paginationMeta?.total ?? rows.length,
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
