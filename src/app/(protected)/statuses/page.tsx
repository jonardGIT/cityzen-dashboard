"use client";

import { useStatusesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";

export default function StatusesPage() {
  const query = useStatusesQuery();

  return (
    <SimpleResourcePage
      title="Statuses"
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
      ]}
    />
  );
}
