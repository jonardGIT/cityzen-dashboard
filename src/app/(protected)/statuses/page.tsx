"use client";

import { Result } from "antd";
import { useStatusesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";

export default function StatusesPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const listQuery = useListQueryParams();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "statuses",
  );
  const query = useStatusesQuery(listQuery, canAccessPage);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access statuses."
      />
    );
  }

  return (
    <SimpleResourcePage
      title="Statuses"
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
