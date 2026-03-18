"use client";

import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";

export default function RespondersPage() {
  const query = useRespondersQuery();

  return (
    <SimpleResourcePage
      title="Responders"
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
