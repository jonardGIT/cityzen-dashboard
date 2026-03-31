"use client";

import {
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Input,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  compareValues,
  createColumnEntries,
  createOptionLabelsByField,
  formatFilterTagValue,
  getColumnFilterKind,
  getDefaultOperator,
  getOperatorOptions,
  matchesFilter,
  type SimpleResourceColumn,
} from "@/components/common/interactive-table-utils";
import { ResizableTable } from "@/components/common/ResizableTable";
import type { ListFilter, ListFilterOperator, ListSortOrder } from "@/lib/api/list-query-params";
import { humanizeKey } from "@/lib/format/display";

const { RangePicker } = DatePicker;

interface InteractiveLocalTableProps<
  T extends { id: string; [key: string]: unknown },
> {
  rows: T[];
  columns: SimpleResourceColumn<T>[];
  storageKey: string;
  emptyText: string;
  searchPlaceholder?: string;
  loading?: boolean;
  scroll?: TableProps<T>["scroll"];
  stickyEdgeColumnCount?: {
    left?: number;
    right?: number;
  };
  pagination?: TableProps<T>["pagination"];
}

export function InteractiveLocalTable<
  T extends { id: string; [key: string]: unknown },
>({
  rows,
  columns,
  storageKey,
  emptyText,
  searchPlaceholder,
  loading,
  scroll,
  stickyEdgeColumnCount,
  pagination,
}: InteractiveLocalTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>("asc");
  const [filters, setFilters] = useState<ListFilter[]>([]);
  const [draftOperators, setDraftOperators] = useState<
    Partial<Record<string, ListFilterOperator>>
  >({});

  const columnEntries = useMemo(
    () => createColumnEntries(columns),
    [columns],
  );

  const columnEntriesById = useMemo(
    () => new Map(columnEntries.map((entry) => [entry.id, entry] as const)),
    [columnEntries],
  );

  const filtersByField = useMemo(
    () =>
      Object.fromEntries(filters.map((filter) => [filter.field, filter])) as Record<
        string,
        ListFilter
      >,
    [filters],
  );

  const optionLabelsByField = useMemo(
    () => createOptionLabelsByField(columnEntries),
    [columnEntries],
  );

  const filteredRows = useMemo(() => {
    const searchFiltered = !search
      ? rows
      : rows.filter((row) =>
          JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
        );

    const columnFiltered = searchFiltered.filter((row) =>
      filters.every((filter) => {
        const entry = columnEntriesById.get(filter.field);
        if (!entry) {
          return true;
        }

        return matchesFilter(row, entry, filter, getColumnFilterKind(entry, rows));
      }),
    );

    if (!sortBy) {
      return columnFiltered;
    }

    const sortEntry = columnEntriesById.get(sortBy);
    if (!sortEntry || sortEntry.column.sortable === false) {
      return columnFiltered;
    }

    return [...columnFiltered].sort((left, right) => {
      const result = compareValues(
        left,
        right,
        sortEntry,
        getColumnFilterKind(sortEntry, rows),
      );

      return sortOrder === "asc" ? result : -result;
    });
  }, [columnEntriesById, filters, rows, search, sortBy, sortOrder]);

  const interactiveColumns = useMemo(
    () =>
      columnEntries.map((entry) => {
        const kind = getColumnFilterKind(entry, rows);
        const activeFilter = filtersByField[entry.id];
        const selectedOperator =
          activeFilter?.operator ??
          draftOperators[entry.id] ??
          getDefaultOperator(kind);

        return {
          ...entry.column,
          title: (
            <Space size={4} wrap>
              <span>{entry.label}</span>
              {entry.column.sortable !== false ? (
                <Tooltip
                  title={
                    sortBy === entry.id
                      ? sortOrder === "asc"
                        ? "Sorted ascending"
                        : "Sorted descending"
                      : "Sort column"
                  }
                >
                  <Button
                    size="small"
                    type={sortBy === entry.id ? "primary" : "default"}
                    aria-label={`Sort ${entry.label}`}
                    icon={
                      sortBy === entry.id ? (
                        sortOrder === "asc" ? (
                          <SortAscendingOutlined />
                        ) : (
                          <SortDescendingOutlined />
                        )
                      ) : (
                        <SwapOutlined />
                      )
                    }
                    onClick={() => {
                      if (sortBy !== entry.id) {
                        setSortBy(entry.id);
                        setSortOrder("asc");
                        return;
                      }

                      if (sortOrder === "asc") {
                        setSortOrder("desc");
                        return;
                      }

                      setSortBy(null);
                      setSortOrder("asc");
                    }}
                  />
                </Tooltip>
              ) : null}
              {entry.column.filterable !== false ? (
                <Popover
                  trigger="click"
                  content={
                    <Space direction="vertical" size={8} style={{ minWidth: 220 }}>
                      <Select
                        value={selectedOperator}
                        options={getOperatorOptions(kind)}
                        onChange={(nextOperator) => {
                          setDraftOperators((current) => ({
                            ...current,
                            [entry.id]: nextOperator,
                          }));
                          if (activeFilter) {
                            setFilters((current) =>
                              current.filter((filter) => filter.field !== entry.id),
                            );
                          }
                        }}
                      />
                      {kind === "select" ? (
                        <Select
                          allowClear
                          showSearch
                          mode={selectedOperator === "in" ? "multiple" : undefined}
                          placeholder={`Filter ${entry.label}`}
                          value={activeFilter?.value as string | string[] | undefined}
                          options={entry.column.filterOptions}
                          onChange={(value) => {
                            if (
                              value === undefined ||
                              value === null ||
                              (Array.isArray(value) && value.length === 0)
                            ) {
                              setFilters((current) =>
                                current.filter((filter) => filter.field !== entry.id),
                              );
                              return;
                            }

                            setFilters((current) => [
                              ...current.filter((filter) => filter.field !== entry.id),
                              { field: entry.id, operator: selectedOperator, value },
                            ]);
                          }}
                        />
                      ) : null}
                      {kind === "date" ? (
                        selectedOperator === "between" ? (
                          <RangePicker
                            showTime
                            value={
                              Array.isArray(activeFilter?.value) && activeFilter.value.length === 2
                                ? [
                                    dayjs(String(activeFilter.value[0])),
                                    dayjs(String(activeFilter.value[1])),
                                  ]
                                : null
                            }
                            onChange={(value) => {
                              const start = value?.[0];
                              const end = value?.[1];

                              if (!start || !end) {
                                setFilters((current) =>
                                  current.filter((filter) => filter.field !== entry.id),
                                );
                                return;
                              }

                              setFilters((current) => [
                                ...current.filter((filter) => filter.field !== entry.id),
                                {
                                  field: entry.id,
                                  operator: selectedOperator,
                                  value: [
                                    start.toISOString(),
                                    end.toISOString(),
                                  ],
                                },
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
                              if (!value) {
                                setFilters((current) =>
                                  current.filter((filter) => filter.field !== entry.id),
                                );
                                return;
                              }

                              setFilters((current) => [
                                ...current.filter((filter) => filter.field !== entry.id),
                                {
                                  field: entry.id,
                                  operator: selectedOperator,
                                  value: value.toISOString(),
                                },
                              ]);
                            }}
                          />
                        )
                      ) : null}
                      {kind === "number" ? (
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
                              setFilters((current) =>
                                current.filter((filter) => filter.field !== entry.id),
                              );
                              return;
                            }

                            const value =
                              selectedOperator === "in"
                                ? raw
                                    .split(",")
                                    .map((item) => Number(item.trim()))
                                    .filter((item) => !Number.isNaN(item))
                                : Number(raw);

                            setFilters((current) => [
                              ...current.filter((filter) => filter.field !== entry.id),
                              {
                                field: entry.id,
                                operator: selectedOperator,
                                value,
                              },
                            ]);
                          }}
                        />
                      ) : null}
                      {kind === "text" ? (
                        <Input
                          allowClear
                          autoFocus
                          placeholder={
                            selectedOperator === "in"
                              ? "Comma-separated values"
                              : `Search ${entry.label}`
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
                              setFilters((current) =>
                                current.filter((filter) => filter.field !== entry.id),
                              );
                              return;
                            }

                            setFilters((current) => [
                              ...current.filter((filter) => filter.field !== entry.id),
                              {
                                field: entry.id,
                                operator: selectedOperator,
                                value:
                                  selectedOperator === "in"
                                    ? raw
                                        .split(",")
                                        .map((item) => item.trim())
                                        .filter(Boolean)
                                    : raw,
                              },
                            ]);
                          }}
                        />
                      ) : null}
                      <Button
                        size="small"
                        onClick={() =>
                          setFilters((current) =>
                            current.filter((filter) => filter.field !== entry.id),
                          )
                        }
                      >
                        Clear {entry.label} filter
                      </Button>
                    </Space>
                  }
                >
                  <Button
                    size="small"
                    type={activeFilter ? "primary" : "default"}
                    aria-label={`Filter ${entry.label}`}
                    icon={<FilterOutlined />}
                  />
                </Popover>
              ) : null}
            </Space>
          ),
        } satisfies SimpleResourceColumn<T>;
      }),
    [columnEntries, draftOperators, filtersByField, rows, sortBy, sortOrder],
  );

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {filters.length > 0 || sortBy ? (
        <Space wrap>
          {filters.map((filter) => (
            <Tag
              key={filter.field}
              closable
              color="blue"
              onClose={() =>
                setFilters((current) =>
                  current.filter((item) => item.field !== filter.field),
                )
              }
            >
              {(columnEntriesById.get(filter.field)?.label ?? humanizeKey(filter.field)) +
                ": " +
                formatFilterTagValue(filter, optionLabelsByField.get(filter.field))}
            </Tag>
          ))}
          {sortBy ? (
            <Tag
              closable
              color="processing"
              onClose={() => {
                setSortBy(null);
                setSortOrder("asc");
              }}
            >
              {`Sorted by ${columnEntriesById.get(sortBy)?.label ?? humanizeKey(sortBy)} (${sortOrder === "asc" ? "ascending" : "descending"})`}
            </Tag>
          ) : null}
          <Button
            size="small"
            onClick={() => {
              setFilters([]);
              setSortBy(null);
              setSortOrder("asc");
            }}
          >
            Clear column filters
          </Button>
        </Space>
      ) : null}
      {searchPlaceholder ? (
        <Input.Search
          allowClear
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}
      <ResizableTable
        rowKey="id"
        loading={loading}
        dataSource={filteredRows}
        storageKey={storageKey}
        showColumnVisibilitySelector
        stickyEdgeColumnCount={stickyEdgeColumnCount}
        scroll={scroll}
        columns={interactiveColumns}
        pagination={pagination}
        locale={{ emptyText }}
      />
    </Space>
  );
}