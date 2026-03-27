"use client";

import { Card, Input, Skeleton, Space, Typography } from "antd";
import { useMemo } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { ResizableTable } from "@/components/common/ResizableTable";
import type { ListQuerySetters } from "@/hooks/useListQueryParams";
import type { ListQueryState } from "@/lib/api/list-query-params";
import type { PaginatedResponse } from "@/lib/api/pagination";

const { Title } = Typography;

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
  columns: Array<{ title: string; dataIndex: string; key: string }>;
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
  const { page, pageSize, search } = listQueryState;
  const rows = useMemo(() => {
    const items = query.data?.data ?? [];
    if (!search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
    );
  }, [query.data, search]);

  const pagination = query.data?.pagination;

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (column) => column.dataIndex !== "id" && column.key !== "id",
      ),
    [columns],
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
            columns={visibleColumns}
          />
        </Space>
      </Card>
    </Space>
  );
}
