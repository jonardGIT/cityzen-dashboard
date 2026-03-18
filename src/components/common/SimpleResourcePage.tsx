"use client";

import { Card, Input, Space, Table, Typography } from "antd";
import { useMemo } from "react";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";
import { ErrorState, LoadingState } from "@/components/common/PageStates";

const { Title } = Typography;

interface SimpleResourcePageProps<T extends { id: string | number; [key: string]: unknown }> {
  title: string;
  query: {
    isLoading: boolean;
    error: unknown;
    data: T[] | undefined;
  };
  columns: Array<{ title: string; dataIndex: string; key: string }>;
}

export function SimpleResourcePage<T extends { id: string | number; [key: string]: unknown }>({
  title,
  query,
  columns,
}: SimpleResourcePageProps<T>) {
  const tableState = useTableQueryParams(10);

  const allRows = useMemo(() => {
    const rows = query.data ?? [];
    if (!tableState.search) {
      return rows;
    }

    return rows.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(tableState.search.toLowerCase()),
    );
  }, [query.data, tableState.search]);

  const pagedRows = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return allRows.slice(start, start + tableState.pageSize);
  }, [allRows, tableState.page, tableState.pageSize]);

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error) {
    return <ErrorState message={String(query.error)} />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {title}
      </Title>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder={`Search ${title.toLowerCase()}`}
            value={tableState.search}
            onChange={(event) => tableState.setSearch(event.target.value)}
          />
          <Table
            rowKey="id"
            dataSource={pagedRows}
            pagination={{
              current: tableState.page,
              pageSize: tableState.pageSize,
              total: allRows.length,
              onChange: (page, pageSize) => {
                tableState.setPage(page);
                tableState.setPageSize(pageSize);
              },
            }}
            columns={columns}
          />
        </Space>
      </Card>
    </Space>
  );
}
