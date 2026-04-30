"use client";

import {
  AppstoreOutlined,
  FileSearchOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
  TagsOutlined,
  SafetyOutlined,
  ProfileOutlined,
  ApartmentOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Layout,
  Menu,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBackendFeatureSurface } from "@/features/dynamic-crud/feature-surface";
import { getNavigationItems } from "@/lib/auth/navigation";
import { getRoleLabel } from "@/lib/auth/roles";
import styles from "./AppShell.module.css";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

type AppMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

function iconForResource(resource: string) {
  switch (resource) {
    case "dashboard":
      return <AppstoreOutlined />;
    case "incidents":
      return <ExclamationCircleOutlined />;
    case "assignments":
      return <ApartmentOutlined />;
    case "agencies":
      return <TeamOutlined />;
    case "citizens":
      return <TeamOutlined />;
    case "responders":
      return <UserSwitchOutlined />;
    case "statuses":
      return <SafetyOutlined />;
    case "categories":
      return <TagsOutlined />;
    case "severities":
      return <ProfileOutlined />;
    case "regions":
      return <ApartmentOutlined />;
    case "provinces":
      return <ApartmentOutlined />;
    case "cities-municipalities":
      return <ApartmentOutlined />;
    case "barangays":
      return <TeamOutlined />;
    case "users":
      return <UserOutlined />;
    case "mobile-content":
      return <NotificationOutlined />;
    case "audit-logs":
      return <FileSearchOutlined />;
    case "profile":
      return <UserOutlined />;
    default:
      return <AppstoreOutlined />;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, capabilities, logout, isAuthenticated } = useAuth();
  const {
    features,
    contractDrift,
    isLoading: featureSurfaceLoading,
  } = useBackendFeatureSurface();

  const displayName = useMemo(() => {
    if (!user) {
      return "User";
    }

    if (typeof user.name === "string" && user.name.trim().length > 0) {
      return user.name.trim();
    }

    return user.email ?? "User";
  }, [user]);

  const identityLabel = useMemo(() => {
    return user?.email?.trim() || displayName;
  }, [displayName, user?.email]);

  const avatarInitial = useMemo(() => {
    const source = (identityLabel || "U").trim();
    return source[0]?.toUpperCase() ?? "U";
  }, [identityLabel]);

  const roleLabel = useMemo(() => {
    return getRoleLabel(capabilities?.role ?? user?.role);
  }, [capabilities?.role, user?.role]);

  const menuItems = useMemo<NonNullable<MenuProps["items"]>>(() => {
    const items: AppMenuItem[] = getNavigationItems({
      role: user?.role,
      capabilities,
      isAuthenticated,
    }).map((item) => ({
      key: item.href,
      icon: iconForResource(item.resource ?? item.key.replace(/^\//, "")),
      label: item.label,
    }));

    return items.map(({ key, icon, label }) => ({ key, icon, label }));
  }, [capabilities, isAuthenticated, user?.role]);

  const selectedKey = useMemo(() => {
    const exact = menuItems.find((item) => item?.key === pathname)?.key;
    if (exact) {
      return String(exact);
    }

    const prefix = menuItems.find((item) =>
      pathname.startsWith(String(item?.key)),
    )?.key;

    return String(prefix ?? "/dashboard");
  }, [menuItems, pathname]);

  return (
    <Layout className={styles.shell}>
      <Sider
        className={styles.sider}
        collapsible
        trigger={null}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={88}
        width={260}
      >
        <div className={styles.siderInner}>
          <div className={styles.brandBlock}>
            <Text className={styles.brandEyebrow}>Secure Workspace</Text>
            <Title
              level={4}
              className={collapsed ? styles.brandMonogram : styles.brandTitle}
            >
              {collapsed ? "XR" : "Xypes Response"}
            </Title>
            {!collapsed ? (
              <Text className={styles.brandMeta}>LGU incident operations</Text>
            ) : null}
          </div>
          <Menu
            className={styles.navigation}
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => router.push(String(key))}
          />
        </div>
      </Sider>
      <Layout className={styles.mainLayout}>
        <Header className={styles.header}>
          <div className={styles.headerLead}>
            <Button
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              className={styles.collapseButton}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((current) => !current)}
            />
            <div className={styles.headerCopy}>
              <Text className={styles.eyebrow}>Authenticated workspace</Text>
              <Title level={2} className={styles.heroTitle}>
                Operations Console
              </Title>
              <Text type="secondary" className={styles.heroSubtitle}>
                Minimal navigation, responsive layouts, and clear security
                signals for LGU incident response work.
              </Text>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.identityCard}>
              <Avatar size={40} className={styles.avatar}>
                {avatarInitial}
              </Avatar>
              <div className={styles.identityText}>
                <Text
                  strong
                  className={styles.identityName}
                  ellipsis={{ tooltip: identityLabel }}
                >
                  {identityLabel}
                </Text>
                <Text type="secondary" className={styles.identityRole}>
                  {roleLabel}
                </Text>
              </div>
            </div>
            <Button
              className={styles.logoutButton}
              icon={<LogoutOutlined />}
              onClick={() => void logout()}
            >
              Logout
            </Button>
          </div>
        </Header>
        {isAuthenticated ? (
          <div className={styles.featureRail}>
            <Space size={[8, 8]} wrap>
              <Text className={styles.featureLabel}>
                Security and backend status
              </Text>
              {features.map((feature) => (
                <Tooltip key={feature.key} title={feature.description}>
                  <Tag color={feature.isAvailable ? "green" : "gold"}>
                    {feature.label}: {feature.isAvailable ? "On" : "Off"}
                  </Tag>
                </Tooltip>
              ))}
              {contractDrift.hasDrift ? (
                <Tooltip
                  title={contractDrift.issues
                    .map((issue) => issue.message)
                    .join(" ")}
                >
                  <Tag color="red">
                    Contract Drift: {contractDrift.issues.length}
                  </Tag>
                </Tooltip>
              ) : null}
              {featureSurfaceLoading ? (
                <Text type="secondary">Checking active feature profile...</Text>
              ) : null}
            </Space>
          </div>
        ) : null}
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}
