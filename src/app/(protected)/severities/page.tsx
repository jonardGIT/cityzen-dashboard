"use client";

import { useSeveritiesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";

export default function SeveritiesPage() {
  const query = useSeveritiesQuery();

  return (
    <SimpleResourcePage
      title="Severities"
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
      ]}
    />
  );
}
