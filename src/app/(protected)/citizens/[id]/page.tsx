"use client";

import { Card, Descriptions, Space, Typography } from "antd";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { useCitizenQuery } from "@/features/reference-data/api";
import { CAN_VIEW_CITIZENS } from "@/lib/auth/permissions";

const { Title } = Typography;

export default function CitizenDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useCitizenQuery(params.id);

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error || !query.data) {
    return <ErrorState message={String(query.error ?? "Citizen not found")} />;
  }

  return (
    <AuthGate allowedRoles={CAN_VIEW_CITIZENS}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Citizen Detail
        </Title>
        <Card>
          <Descriptions column={1}>
            <Descriptions.Item label="ID">{String(query.data.id)}</Descriptions.Item>
            <Descriptions.Item label="Name">{query.data.name ?? "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Contact">{query.data.contactInfo ?? "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Preferred Channel">
              {query.data.preferredChannel ?? "N/A"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </AuthGate>
  );
}
