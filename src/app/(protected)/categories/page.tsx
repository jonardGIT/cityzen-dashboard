"use client";

import { useCategoriesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";

export default function CategoriesPage() {
  const query = useCategoriesQuery();

  return (
    <SimpleResourcePage
      title="Categories"
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
      ]}
    />
  );
}
