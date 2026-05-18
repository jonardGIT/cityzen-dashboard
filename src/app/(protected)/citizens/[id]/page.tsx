"use client";

import { Card, Descriptions, Space, Tag, Typography } from "antd";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { useCitizenQuery } from "@/features/reference-data/api";
import { getPreferredDisplayName } from "@/lib/format/display";
import { CAN_VIEW_CITIZENS } from "@/lib/auth/permissions";

const { Title } = Typography;

function profileCompletionTag(
  hasName: boolean,
  hasAddress: boolean,
  hasBarangay: boolean,
) {
  const complete = hasName && hasAddress && hasBarangay;
  if (complete) return <Tag color="success">Complete</Tag>;
  const parts: string[] = [];
  if (!hasName) parts.push("name");
  if (!hasAddress) parts.push("address");
  if (!hasBarangay) parts.push("barangay");
  return <Tag color="warning">Incomplete — missing {parts.join(", ")}</Tag>;
}

export default function CitizenDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useCitizenQuery(params.id);

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error || !query.data) {
    return <ErrorState message={String(query.error ?? "Citizen not found")} />;
  }

  const citizen = query.data;
  const hasName = Boolean(citizen.firstName && citizen.lastName);
  const hasAddress = Boolean(citizen.addressLine1);
  const hasBarangay = Boolean(citizen.barangayId);

  return (
    <AuthGate allowedRoles={CAN_VIEW_CITIZENS}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Citizen Detail
        </Title>

        <Card title="Identity">
          <Descriptions column={1}>
            <Descriptions.Item label="ID">
              {String(citizen.id)}
            </Descriptions.Item>
            <Descriptions.Item label="Display Name">
              {getPreferredDisplayName(citizen)}
            </Descriptions.Item>
            <Descriptions.Item label="First Name">
              {citizen.firstName ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Middle Name">
              {citizen.middleName ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Last Name">
              {citizen.lastName ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Suffix">
              {citizen.suffix ?? "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Contact">
          <Descriptions column={1}>
            <Descriptions.Item label="Contact Info">
              {citizen.contactInfo ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Preferred Channel">
              {citizen.preferredChannel ?? "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Address &amp; Location">
          <Descriptions column={1}>
            <Descriptions.Item label="Address Line 1">
              {citizen.addressLine1 ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Address Line 2">
              {citizen.addressLine2 ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="City / Municipality">
              {citizen.locality?.name ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Barangay">
              {citizen.barangay?.name ?? "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Profile Completion">
          <Descriptions column={1}>
            <Descriptions.Item label="Status">
              {profileCompletionTag(hasName, hasAddress, hasBarangay)}
            </Descriptions.Item>
            <Descriptions.Item label="Privacy Notice Accepted">
              {citizen.privacyNoticeAcceptedAt
                ? new Date(citizen.privacyNoticeAcceptedAt).toLocaleString()
                : "Not accepted"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </AuthGate>
  );
}
