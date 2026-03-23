"use client";

import { Card, Input, Space, Table, Typography } from "antd";
import Link from "next/link";
import { useMemo } from "react";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { useCitizensQuery } from "@/features/reference-data/api";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";

const { Title } = Typography;

export default function CitizensPage() {
  const tableState = useTableQueryParams(10);
  const citizensQuery = useCitizensQuery(tableState.page, tableState.pageSize);

  const rows = useMemo(() => {
    const items = citizensQuery.data?.data ?? [];
    if (!tableState.search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(tableState.search.toLowerCase()),
    );
  }, [citizensQuery.data, tableState.search]);
  const paginationMeta = citizensQuery.data?.pagination;

  if (citizensQuery.isLoading) {
    return <LoadingState />;
  }

  if (citizensQuery.error) {
    return <ErrorState message={String(citizensQuery.error)} />;
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Citizens
      </Title>

      <Card>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Search citizens"
            value={tableState.search}
            onChange={(event) => tableState.setSearch(event.target.value)}
          />
          <Table
            rowKey="id"
            loading={citizensQuery.isFetching}
            dataSource={rows}
            pagination={{
              current: tableState.page,
              pageSize: tableState.pageSize,
              total: paginationMeta?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== tableState.pageSize) {
                  tableState.setPageSize(nextPageSize);
                  return;
                }

                tableState.setPage(nextPage);
              },
            }}
            columns={[
              {
                title: "Name",
                dataIndex: "name",
                key: "name",
                render: (value: string | undefined, record: { id: string | number }) => (
                  <Link href={`/citizens/${record.id}`}>{value || `Citizen ${record.id}`}</Link>
                ),
              },
              { title: "Contact", dataIndex: "contactInfo", key: "contactInfo" },
              { title: "Preferred Channel", dataIndex: "preferredChannel", key: "preferredChannel" },
            ]}
          />
        </Space>
      </Card>
    </Space>
  );
}
