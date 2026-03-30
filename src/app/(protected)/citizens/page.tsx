"use client";

import Link from "next/link";
import { AuthGate } from "@/components/auth/AuthGate";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useCitizensQuery } from "@/features/reference-data/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { CAN_VIEW_CITIZENS } from "@/lib/auth/permissions";

export default function CitizensPage() {
  const listQuery = useListQueryParams();
  const query = useCitizensQuery(listQuery);

  return (
    <AuthGate allowedRoles={CAN_VIEW_CITIZENS}>
      <SimpleResourcePage
        title="Citizens"
        listQueryState={listQuery}
        listQuerySetters={listQuery}
        query={query}
        columns={[
          { title: "ID", dataIndex: "id", key: "id" },
          {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (value: string | undefined, record: { id: string }) => (
              <Link href={`/citizens/${record.id}`}>
                {value || `Citizen ${record.id}`}
              </Link>
            ),
          },
          {
            title: "Contact",
            dataIndex: "contactInfo",
            key: "contactInfo",
          },
          {
            title: "Preferred Channel",
            dataIndex: "preferredChannel",
            key: "preferredChannel",
          },
        ]}
      />
    </AuthGate>
  );
}
