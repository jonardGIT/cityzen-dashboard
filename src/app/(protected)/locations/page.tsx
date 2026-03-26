"use client";

import { useLocationsQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

export default function LocationsPage() {
  const listQuery = useListQueryParams();
  const query = useLocationsQuery(listQuery);

  return (
    <SimpleResourcePage
      title="Locations"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
        { title: "Address", dataIndex: "address", key: "address" },
      ]}
    />
  );
}
