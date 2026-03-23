"use client";

import { Card, Input, Skeleton, Space, Table, Typography } from "antd";
import { useMemo } from "react";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import type { PaginatedResponse } from "@/lib/api/pagination";

const { Title } = Typography;

interface SimpleResourcePageProps<T extends { id: string | number; [key: string]: unknown }> {
  title: string;
  page: number;
  pageSize: number;
  search: string;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
  query: {
    isLoading: boolean;
    isFetching?: boolean;
    error: unknown;
    refetch?: () => void;
    data: PaginatedResponse<T> | undefined;
  };
  columns: Array<{ title: string; dataIndex: string; key: string }>;
}

export function SimpleResourcePage<T extends { id: string | number; [key: string]: unknown }>({
  title,
  page,
  pageSize,
  search,
  setPage,
  setPageSize,
  setSearch,
  query,
  columns,
}: SimpleResourcePageProps<T>) {
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
    () => columns.filter((column) => column.dataIndex !== "id" && column.key !== "id"),
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
          <Input.Search
            allowClear
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {query.isFetching ? <Skeleton active paragraph={{ rows: 3 }} title={false} /> : null}
          <Table
            rowKey="id"
            loading={Boolean(query.isFetching)}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== pageSize) {
                  setPageSize(nextPageSize);
                  return;
                }

                setPage(nextPage);
              },
            }}
            columns={visibleColumns}
          />
        </Space>
      </Card>
    </Space>
  );
}
