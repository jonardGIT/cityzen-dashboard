"use client";

import Link from "next/link";
import { Result } from "antd";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useCitizensQuery } from "@/features/reference-data/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";
import { getPreferredDisplayName } from "@/lib/format/display";
import type { Citizen } from "@/types/api";

export default function CitizensPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const listQuery = useListQueryParams();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "citizens",
  );
  const query = useCitizensQuery(listQuery, canAccessPage);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access citizens."
      />
    );
  }

  return (
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
          render: (_value: string | undefined, record: Citizen) => {
            const displayName = getPreferredDisplayName(record);

            return (
            <Link href={`/citizens/${record.id}`}>
                {displayName !== "N/A" ? displayName : `Citizen ${record.id}`}
            </Link>
            );
          },
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
  );
}
