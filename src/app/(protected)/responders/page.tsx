"use client";

import { Result } from "antd";
import type { Responder } from "@/types/api";
import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useAuth } from "@/context/AuthContext";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessCrudResource } from "@/lib/auth/navigation";

function getResponderDisplayName(responder: Responder) {
  return responder.name || String(responder.id);
}

function getResponderContactInfo(responder: Responder) {
  return responder.contactInfo?.trim() || "N/A";
}

function getResponderRole(responder: Responder) {
  return responder.role?.trim() || "N/A";
}

export default function RespondersPage() {
  const { user, capabilities, isAuthenticated } = useAuth();
  const listQuery = useListQueryParams();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "responders",
  );
  const query = useRespondersQuery(listQuery, canAccessPage);

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access responders."
      />
    );
  }

  return (
    <SimpleResourcePage
      title="Responders"
      listQueryState={listQuery}
      listQuerySetters={listQuery}
      query={query}
      columns={[
        { title: "ID", dataIndex: "id", key: "id" },
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          valueGetter: (responder: Responder) =>
            getResponderDisplayName(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderDisplayName(responder),
        },
        {
          title: "Role",
          dataIndex: "role",
          key: "role",
          valueGetter: (responder: Responder) => getResponderRole(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderRole(responder),
        },
        {
          title: "Contact Info",
          dataIndex: "contactInfo",
          key: "contactInfo",
          valueGetter: (responder: Responder) =>
            getResponderContactInfo(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderContactInfo(responder),
        },
      ]}
    />
  );
}
