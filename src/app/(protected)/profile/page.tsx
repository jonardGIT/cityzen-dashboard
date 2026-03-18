"use client";

import { Card, Descriptions, Space, Typography } from "antd";
import { useAuth } from "@/context/AuthContext";

const { Title } = Typography;

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        My Profile
      </Title>
      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label="ID">{String(user?.id ?? "N/A")}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email ?? "N/A"}</Descriptions.Item>
          <Descriptions.Item label="Role">{user?.role ?? "N/A"}</Descriptions.Item>
          <Descriptions.Item label="Name">
            {user?.name ?? (`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "N/A")}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}
