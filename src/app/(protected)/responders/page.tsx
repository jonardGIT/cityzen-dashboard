"use client";

import type { Responder } from "@/types/api";
import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

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
