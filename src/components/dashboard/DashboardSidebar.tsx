import { Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import styles from "@/app/dashboard.module.css";
import type { NavKey } from "@/components/dashboard/types";

const { Sider } = Layout;
const { Text, Title } = Typography;

const navigationItems: MenuProps["items"] = [
  { key: "overview", label: "Overview" },
  { key: "incidents", label: "Incidents" },
  { key: "citizens", label: "Citizens" },
  { key: "assignments", label: "Assignments" },
  { key: "responders", label: "Responders" },
  { key: "users", label: "Users" },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  onSelectNavKey: (key: NavKey) => void;
  activeKey: NavKey;
}

export function DashboardSidebar({
  collapsed,
  onSelectNavKey,
  activeKey,
}: DashboardSidebarProps) {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={256}
      collapsedWidth={88}
      className={styles.sider}
    >
      <div className={styles.siderInner}>
        <div className={styles.brandBlock}>
          <Text className={styles.brandEyebrow}>Xypes</Text>
          {!collapsed ? (
            <>
              <Title level={4} className={styles.brandTitle}>
                CIRS Control
              </Title>
              <Text type="secondary" className={styles.brandMeta}>
                Dispatch dashboard
              </Text>
            </>
          ) : (
            <Title level={4} className={styles.brandMonogram}>
              XC
            </Title>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={navigationItems}
          inlineCollapsed={collapsed}
          className={styles.navigation}
          onClick={({ key }) => onSelectNavKey(key as NavKey)}
        />
      </div>
    </Sider>
  );
}
