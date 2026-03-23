"use client";

import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

export default function RespondersPage() {
  const listQuery = useListQueryParams();
  const query = useRespondersQuery(listQuery);

  return (
    <SimpleResourcePage
      title="Responders"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
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
