"use client";

import { useLocationsQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";

export default function LocationsPage() {
  const query = useLocationsQuery();

  return (
    <SimpleResourcePage
      title="Locations"
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Name", dataIndex: "name", key: "name" },
        { title: "Address", dataIndex: "address", key: "address" },
      ]}
    />
  );
}
