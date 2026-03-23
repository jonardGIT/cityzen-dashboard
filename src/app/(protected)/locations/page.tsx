"use client";

import { useLocationsQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";

export default function LocationsPage() {
  const tableState = useTableQueryParams(10);
  const query = useLocationsQuery(tableState.page, tableState.pageSize);

  return (
    <SimpleResourcePage
      title="Locations"
      page={tableState.page}
      pageSize={tableState.pageSize}
      search={tableState.search}
      setPage={tableState.setPage}
      setPageSize={tableState.setPageSize}
      setSearch={tableState.setSearch}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
        { title: "Address", dataIndex: "address", key: "address" },
      ]}
    />
  );
}
