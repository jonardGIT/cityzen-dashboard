"use client";

import { Button, DatePicker, Flex, Space, Tag } from "antd";
import dayjs from "dayjs";
import type { ListQuerySetters } from "@/hooks/useListQueryParams";
import type { ListQueryState, ListSortBy } from "@/lib/api/list-query-params";

const { RangePicker } = DatePicker;

type QuickFilter = {
  label: string;
  sortBy: ListSortBy;
  sortOrder: "asc" | "desc";
};

const QUICK_FILTERS: QuickFilter[] = [
  { label: "Latest", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Recently Updated", sortBy: "updatedAt", sortOrder: "desc" },
  { label: "Oldest", sortBy: "createdAt", sortOrder: "asc" },
];

interface FilterToolbarProps {
  state: ListQueryState;
  setters: ListQuerySetters;
  loading?: boolean;
}

function isQuickFilterActive(state: ListQueryState, filter: QuickFilter): boolean {
  return state.sortBy === filter.sortBy && state.sortOrder === filter.sortOrder;
}

export function FilterToolbar({ state, setters, loading }: FilterToolbarProps) {
  const hasDateFilters = Boolean(state.createdFrom || state.createdTo || state.updatedFrom || state.updatedTo);

  const createdRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
    state.createdFrom ? dayjs(state.createdFrom) : null,
    state.createdTo ? dayjs(state.createdTo) : null,
  ];

  const updatedRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
    state.updatedFrom ? dayjs(state.updatedFrom) : null,
    state.updatedTo ? dayjs(state.updatedTo) : null,
  ];

  return (
    <Flex gap={8} wrap="wrap" align="center">
      <Space size={4}>
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="small"
            type={isQuickFilterActive(state, filter) ? "primary" : "default"}
            disabled={loading}
            onClick={() => setters.setSort(filter.sortBy, filter.sortOrder)}
          >
            {filter.label}
          </Button>
        ))}
      </Space>

      <RangePicker
        size="small"
        allowEmpty={[true, true]}
        placeholder={["Created from", "Created to"]}
        value={createdRange}
        disabled={loading}
        onChange={(dates) => {
          setters.setCreatedRange(
            dates?.[0]?.toISOString() ?? undefined,
            dates?.[1]?.toISOString() ?? undefined,
          );
        }}
      />

      <RangePicker
        size="small"
        allowEmpty={[true, true]}
        placeholder={["Updated from", "Updated to"]}
        value={updatedRange}
        disabled={loading}
        onChange={(dates) => {
          setters.setUpdatedRange(
            dates?.[0]?.toISOString() ?? undefined,
            dates?.[1]?.toISOString() ?? undefined,
          );
        }}
      />

      <Tag color="processing">
        {QUICK_FILTERS.find((filter) => isQuickFilterActive(state, filter))?.label ?? "Custom"}
      </Tag>

      {hasDateFilters && (
        <Tag closable color="blue" onClose={() => setters.clearDateFilters()}>
          Date filters active
        </Tag>
      )}
    </Flex>
  );
}
