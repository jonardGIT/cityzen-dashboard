"use client";

import { useStatusesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

export default function StatusesPage() {
  const listQuery = useListQueryParams();
  const query = useStatusesQuery(listQuery);

  return (
    <SimpleResourcePage
      title="Statuses"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
      ]}
    />
  );
}
