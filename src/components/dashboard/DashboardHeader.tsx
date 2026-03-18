import { Button, Layout, Space, Tag, Typography } from "antd";
import styles from "@/app/dashboard.module.css";

const { Header } = Layout;
const { Title, Text } = Typography;

interface DashboardHeaderProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  healthStatus?: string;
  apiSource: string;
}

export function DashboardHeader({
  collapsed,
  onToggleCollapsed,
  healthStatus,
  apiSource,
}: DashboardHeaderProps) {
  return (
    <Header className={styles.header}>
      <div className={styles.headerLead}>
        <Button
          type="text"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
        >
          {collapsed ? "Expand" : "Collapse"}
        </Button>
        <div>
          <Title level={2} className={styles.heroTitle}>
            Xypes CIRS Dashboard
          </Title>
          <Text type="secondary" className={styles.heroSubtitle}>
            Live data from CIRS API endpoints.
          </Text>
        </div>
      </div>
      <Space>
        <Tag color={healthStatus === "ok" ? "success" : "warning"}>
          API Health: {healthStatus ?? "unknown"}
        </Tag>
        <Tag color="processing">Source: {apiSource}</Tag>
      </Space>
    </Header>
  );
}
