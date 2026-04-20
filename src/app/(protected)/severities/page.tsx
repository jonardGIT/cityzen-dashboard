"use client";

import { Result } from "antd";
import { useSeveritiesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";

export default function SeveritiesPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const listQuery = useListQueryParams();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "severities",
  );
  const query = useSeveritiesQuery(listQuery, canAccessPage);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access severities."
      />
    );
  }

  return (
    <SimpleResourcePage
      title="Severities"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Level", dataIndex: "level", key: "level" },
        {
          title: "Definition",
          dataIndex: "definition",
          key: "definition",
        },
      ]}
    />
  );
}
