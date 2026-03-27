"use client";

import { Card, Input, Space, Typography } from "antd";
import Link from "next/link";
import { useMemo } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { ResizableTable } from "@/components/common/ResizableTable";
import { useCitizensQuery } from "@/features/reference-data/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";

const { Title } = Typography;

export default function CitizensPage() {
  const listQuery = useListQueryParams();
  const citizensQuery = useCitizensQuery(listQuery);

  const rows = useMemo(() => {
    const items = citizensQuery.data?.data ?? [];
    if (!listQuery.search) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(listQuery.search.toLowerCase()),
    );
  }, [citizensQuery.data, listQuery.search]);
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
            value={listQuery.search}
            onChange={(event) => listQuery.setSearch(event.target.value)}
          />
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(citizensQuery.isFetching)}
          />
          <ResizableTable
            rowKey="id"
            loading={citizensQuery.isFetching}
            dataSource={rows}
            storageKey="citizens-table-widths"
            showColumnVisibilitySelector
            scroll={{ x: 720 }}
            pagination={{
              current: listQuery.page,
              pageSize: listQuery.pageSize,
              total: paginationMeta?.total ?? rows.length,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== listQuery.pageSize) {
                  listQuery.setPageSize(nextPageSize);
                  return;
                }

                listQuery.setPage(nextPage);
              },
            }}
            columns={[
              {
                title: "Name",
                dataIndex: "name",
                key: "name",
                render: (value: string | undefined, record: { id: string }) => (
                  <Link href={`/citizens/${record.id}`}>
                    {value || `Citizen ${record.id}`}
                  </Link>
                ),
              },
              {
                title: "Contact",
                dataIndex: "contactInfo",
                key: "contactInfo",
              },
              {
                title: "Preferred Channel",
                dataIndex: "preferredChannel",
                key: "preferredChannel",
              },
            ]}
          />
        </Space>
      </Card>
    </Space>
  );
}
