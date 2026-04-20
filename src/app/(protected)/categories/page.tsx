"use client";

import { Result } from "antd";
import { useCategoriesQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";

export default function CategoriesPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const listQuery = useListQueryParams();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "categories",
  );
  const query = useCategoriesQuery(listQuery, canAccessPage);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access categories."
      />
    );
  }

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
