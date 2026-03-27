"use client";

import { useCategoriesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

export default function CategoriesPage() {
  const listQuery = useListQueryParams();
  const query = useCategoriesQuery(listQuery);

  return (
    <SimpleResourcePage
      title="Categories"
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
