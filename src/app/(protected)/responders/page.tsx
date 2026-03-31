"use client";

import type { Responder } from "@/types/api";
import { useRespondersQuery } from "@/features/reference-data/api";
import { SimpleResourcePage } from "@/components/common/SimpleResourcePage";
import { useListQueryParams } from "@/hooks/useListQueryParams";

function getResponderDisplayName(responder: Responder) {
  const fullName = [responder.firstName, responder.lastName]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" ")
    .trim();

  return fullName || responder.name || responder.email || String(responder.id);
}

function getResponderEmail(responder: Responder) {
  if (responder.email?.trim()) {
    return responder.email.trim();
  }

  const contactInfo = responder.contactInfo?.trim();
  if (contactInfo?.includes("@")) {
    return contactInfo;
  }

  return "N/A";
}

function getResponderPhone(responder: Responder) {
  if (responder.phoneNumber?.trim()) {
    return responder.phoneNumber.trim();
  }

  const contactInfo = responder.contactInfo?.trim();
  if (contactInfo && !contactInfo.includes("@")) {
    return contactInfo;
  }

  return "N/A";
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
          valueGetter: (responder: Responder) => getResponderDisplayName(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderDisplayName(responder),
        },
        {
          title: "Email",
          dataIndex: "email",
          key: "email",
          valueGetter: (responder: Responder) => getResponderEmail(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderEmail(responder),
        },
        {
          title: "Phone",
          dataIndex: "phoneNumber",
          key: "phoneNumber",
          valueGetter: (responder: Responder) => getResponderPhone(responder),
          render: (_value: unknown, responder: Responder) =>
            getResponderPhone(responder),
        },
      ]}
    />
  );
}
