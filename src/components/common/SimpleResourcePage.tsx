"use client";

import {
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Popover,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { ResizableTable } from "@/components/common/ResizableTable";
import type { ListQuerySetters } from "@/hooks/useListQueryParams";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type ListFilter,
  type ListFilterOperator,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { PaginatedResponse } from "@/lib/api/pagination";
import { humanizeKey } from "@/lib/format/display";
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
} from "./interactive-table-utils";

const { RangePicker } = DatePicker;
const { Title } = Typography;

export type { SimpleResourceColumn } from "./interactive-table-utils";

interface SimpleResourcePageProps<
  T extends { id: string; [key: string]: unknown },
> {
  title: string;
  listQueryState: ListQueryState;
  listQuerySetters: ListQuerySetters;
  query: {
    isLoading: boolean;
    isFetching?: boolean;
    error: unknown;
    refetch?: () => void;
    data: PaginatedResponse<T> | undefined;
  };
  columns: SimpleResourceColumn<T>[];
}

export function SimpleResourcePage<
  T extends { id: string; [key: string]: unknown },
>({
  title,
  listQueryState,
  listQuerySetters,
  query,
  columns,
}: SimpleResourcePageProps<T>) {
  const { filters, page, pageSize, search, sortBy, sortOrder } = listQueryState;
  const [draftOperators, setDraftOperators] = useState<
    Partial<Record<string, ListFilterOperator>>
  >({});

  const pagination = query.data?.pagination;

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (column) => column.dataIndex !== "id" && column.key !== "id",
      ),
    [columns],
  );

  const columnEntries = useMemo(
    () => createColumnEntries(visibleColumns),
    [visibleColumns],
  );

  const columnEntriesById = useMemo(
    () => new Map(columnEntries.map((entry) => [entry.id, entry] as const)),
    [columnEntries],
  );

  const optionLabelsByField = useMemo(
    () => createOptionLabelsByField(columnEntries),
    [columnEntries],
  );

  const activeColumnFilters = useMemo(
    () => filters.filter((filter) => columnEntriesById.has(filter.field)),
    [columnEntriesById, filters],
  );

  const filtersByField = useMemo(
    () =>
      Object.fromEntries(
        activeColumnFilters.map((filter) => [filter.field, filter]),
      ) as Record<string, ListFilter>,
    [activeColumnFilters],
  );

  const activeSortEntry = columnEntriesById.get(sortBy);

  const rows = useMemo(() => {
    const items = query.data?.data ?? [];

    const searchFiltered = !search
      ? items
      : items.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
        );

    const columnFiltered = searchFiltered.filter((item) =>
      activeColumnFilters.every((filter) => {
        const entry = columnEntriesById.get(filter.field);
        if (!entry) {
          return true;
        }

        const kind = getColumnFilterKind(entry, items);
        return matchesFilter(item, entry, filter, kind);
      }),
    );

    if (!activeSortEntry || activeSortEntry.column.sortable === false) {
      return columnFiltered;
    }

    const kind = getColumnFilterKind(activeSortEntry, items);
    return [...columnFiltered].sort((left, right) => {
      const result = compareValues(left, right, activeSortEntry, kind);
      return sortOrder === "asc" ? result : -result;
    });
  }, [
    activeColumnFilters,
    activeSortEntry,
    columnEntriesById,
    query.data,
    search,
    sortOrder,
  ]);

  const interactiveColumns = useMemo(
    () =>
      columnEntries.map((entry) => {
        const kind = getColumnFilterKind(entry, rows);
        const activeFilter = filtersByField[entry.id];
        const selectedOperator =
          activeFilter?.operator ??
          draftOperators[entry.id] ??
          getDefaultOperator(kind);
        const isSortable = entry.column.sortable !== false;
        const isFilterable = entry.column.filterable !== false;

        return {
          ...entry.column,
          title: (
            <Space size={4} wrap>
              <span>{entry.label}</span>
              {isSortable ? (
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
                        listQuerySetters.setSort(entry.id, "asc");
                        return;
                      }

                      if (sortOrder === "asc") {
                        listQuerySetters.setSort(entry.id, "desc");
                        return;
                      }

                      listQuerySetters.setSort(
                        DEFAULT_SORT_BY,
                        DEFAULT_SORT_ORDER,
                      );
                    }}
                  />
                </Tooltip>
              ) : null}
              {isFilterable ? (
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
                        options={getOperatorOptions(kind)}
                        onChange={(nextOperator) => {
                          setDraftOperators((current) => ({
                            ...current,
                            [entry.id]: nextOperator,
                          }));
                          if (activeFilter) {
                            listQuerySetters.removeFilter(entry.id);
                          }
                        }}
                      />
                      {kind === "select" ? (
                        <Select
                          allowClear
                          showSearch
                          mode={selectedOperator === "in" ? "multiple" : undefined}
                          placeholder={`Filter ${entry.label}`}
                          value={
                            activeFilter?.value as
                              | string
                              | string[]
                              | undefined
                          }
                          options={entry.column.filterOptions}
                          onChange={(value) => {
                            if (
                              value === undefined ||
                              value === null ||
                              (Array.isArray(value) && value.length === 0)
                            ) {
                              listQuerySetters.removeFilter(entry.id);
                              return;
                            }

                            listQuerySetters.upsertFilter({
                              field: entry.id,
                              operator: selectedOperator,
                              value,
                            });
                          }}
                        />
                      ) : null}
                      {kind === "date" ? (
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
                                listQuerySetters.removeFilter(entry.id);
                                return;
                              }

                              listQuerySetters.upsertFilter({
                                field: entry.id,
                                operator: selectedOperator,
                                value: [
                                  value[0].toISOString(),
                                  value[1].toISOString(),
                                ],
                              });
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
                                listQuerySetters.removeFilter(entry.id);
                                return;
                              }

                              listQuerySetters.upsertFilter({
                                field: entry.id,
                                operator: selectedOperator,
                                value: value.toISOString(),
                              });
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
                              listQuerySetters.removeFilter(entry.id);
                              return;
                            }

                            if (selectedOperator === "in") {
                              listQuerySetters.upsertFilter({
                                field: entry.id,
                                operator: selectedOperator,
                                value: raw
                                  .split(",")
                                  .map((value) => Number(value.trim()))
                                  .filter((value) => !Number.isNaN(value)),
                              });
                              return;
                            }

                            const numericValue = Number(raw);
                            if (Number.isNaN(numericValue)) {
                              listQuerySetters.removeFilter(entry.id);
                              return;
                            }

                            listQuerySetters.upsertFilter({
                              field: entry.id,
                              operator: selectedOperator,
                              value: numericValue,
                            });
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
                              listQuerySetters.removeFilter(entry.id);
                              return;
                            }

                            listQuerySetters.upsertFilter({
                              field: entry.id,
                              operator: selectedOperator,
                              value:
                                selectedOperator === "in"
                                  ? raw
                                      .split(",")
                                      .map((value) => value.trim())
                                      .filter(Boolean)
                                  : raw,
                            });
                          }}
                        />
                      ) : null}
                      <Button
                        size="small"
                        onClick={() => listQuerySetters.removeFilter(entry.id)}
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
    [
      columnEntries,
      draftOperators,
      filtersByField,
      listQuerySetters,
      rows,
      sortBy,
      sortOrder,
    ],
  );

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error) {
    return <ErrorState message={String(query.error)} />;
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {title}
      </Title>

      <Card>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <FilterToolbar
            state={listQueryState}
            setters={listQuerySetters}
            loading={Boolean(query.isFetching)}
          />
          {activeColumnFilters.length > 0 || activeSortEntry ? (
            <Space wrap>
              {activeColumnFilters.map((filter) => (
                <Tag
                  key={filter.field}
                  closable
                  color="blue"
                  onClose={() => listQuerySetters.removeFilter(filter.field)}
                >
                  {(columnEntriesById.get(filter.field)?.label ??
                    humanizeKey(filter.field)) +
                    ": " +
                    formatFilterTagValue(
                      filter,
                      optionLabelsByField.get(filter.field),
                    )}
                </Tag>
              ))}
              {activeSortEntry ? (
                <Tag
                  closable
                  color="processing"
                  onClose={() =>
                    listQuerySetters.setSort(DEFAULT_SORT_BY, DEFAULT_SORT_ORDER)
                  }
                >
                  {`Sorted by ${activeSortEntry.label} (${sortOrder === "asc" ? "ascending" : "descending"})`}
                </Tag>
              ) : null}
              <Button
                size="small"
                onClick={() => {
                  listQuerySetters.clearFilters();
                  listQuerySetters.setSort(
                    DEFAULT_SORT_BY,
                    DEFAULT_SORT_ORDER,
                  );
                }}
              >
                Clear column filters
              </Button>
            </Space>
          ) : null}
          <Input.Search
            allowClear
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(event) => listQuerySetters.setSearch(event.target.value)}
          />
          {query.isFetching ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : null}
          <ResizableTable
            rowKey="id"
            loading={Boolean(query.isFetching)}
            dataSource={rows}
            storageKey={`simple-resource-${title.toLowerCase().replace(/\s+/g, "-")}-widths`}
            showColumnVisibilitySelector
            stickyEdgeColumnCount={{ left: 1 }}
            scroll={{ x: 720 }}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== pageSize) {
                  listQuerySetters.setPageSize(nextPageSize);
                  return;
                }

                listQuerySetters.setPage(nextPage);
              },
            }}
            columns={interactiveColumns}
          />
        </Space>
      </Card>
    </Space>
  );
}
