"use client";

import { useSeveritiesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

export default function SeveritiesPage() {
  const listQuery = useListQueryParams();
  const query = useSeveritiesQuery(listQuery);

  return (
    <SimpleResourcePage
      title="Severities"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Level", dataIndex: "level", key: "level" },
        {
          title: "Definition",
          dataIndex: "definition",
          key: "definition",
        },
      ]}
    />
  );
}
