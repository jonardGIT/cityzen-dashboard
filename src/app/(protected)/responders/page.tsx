"use client";

import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";

export default function RespondersPage() {
  const tableState = useTableQueryParams(10);
  const query = useRespondersQuery(tableState.page, tableState.pageSize);

  return (
    <SimpleResourcePage
      title="Responders"
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
        { title: "Email", dataIndex: "email", key: "email" },
        { title: "Phone", dataIndex: "phoneNumber", key: "phoneNumber" },
      ]}
    />
  );
}
