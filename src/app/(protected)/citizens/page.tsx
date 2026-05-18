"use client";

import Link from "next/link";
import { Result, Tag } from "antd";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useCitizensQuery } from "@/features/reference-data/api";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";
import { getPreferredDisplayName } from "@/lib/format/display";
import type { Citizen } from "@/types/api";

function isCitizenProfileComplete(record: Citizen): boolean {
  return Boolean(
    record.firstName &&
    record.lastName &&
    record.addressLine1 &&
    record.barangayId,
  );
}

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
          title: "Address Line 1",
          dataIndex: "addressLine1",
          key: "addressLine1",
          render: (value: string | null | undefined) => value ?? "N/A",
        },
        {
          title: "Address Line 2",
          dataIndex: "addressLine2",
          key: "addressLine2",
          render: (value: string | null | undefined) => value ?? "N/A",
        },
        {
          title: "Locality",
          dataIndex: ["locality", "name"],
          key: "locality",
          render: (_value: string | undefined, record: Citizen) =>
            record.locality?.name ?? "N/A",
        },
        {
          title: "Barangay",
          dataIndex: ["barangay", "name"],
          key: "barangay",
          render: (_value: string | undefined, record: Citizen) =>
            record.barangay?.name ?? "N/A",
        },
        {
          title: "Preferred Channel",
          dataIndex: "preferredChannel",
          key: "preferredChannel",
        },
        {
          title: "Profile",
          dataIndex: "barangayId",
          key: "profileComplete",
          render: (_value: unknown, record: Citizen) =>
            isCitizenProfileComplete(record) ? (
              <Tag color="success">Complete</Tag>
            ) : (
              <Tag color="default">Incomplete</Tag>
            ),
        },
      ]}
    />
  );
}
