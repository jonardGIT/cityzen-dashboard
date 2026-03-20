"use client";

import {
  AppstoreOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
  TagsOutlined,
  SafetyOutlined,
  ProfileOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Layout, Menu, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAllCrudResources } from "@/features/dynamic-crud/config";
import { hasPermission } from "@/features/dynamic-crud/permissions";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

type AppMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  canView?: () => boolean;
};

function iconForResource(resource: string) {
  switch (resource) {
    case "incidents":
      return <ExclamationCircleOutlined />;
    case "assignments":
      return <ApartmentOutlined />;
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
    case "locations":
      return <EnvironmentOutlined />;
    case "users":
      return <UserOutlined />;
    default:
      return <AppstoreOutlined />;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  const menuItems = useMemo<NonNullable<MenuProps["items"]>>(() => {
    const resources = getAllCrudResources();

    const items: AppMenuItem[] = [
      { key: "/dashboard", icon: <AppstoreOutlined />, label: "Dashboard" },
      ...resources.map((resource) => ({
        key: `/dashboard/${resource.resource}`,
        icon: iconForResource(resource.resource),
        label: resource.label,
        canView: () => hasPermission(resource.endpoints.list, user?.role, isAuthenticated),
      })),
      { key: "/profile", icon: <UserOutlined />, label: "Profile" },
    ];

    return items
      .filter((item) => (item.canView ? item.canView() : true))
      .map(({ key, icon, label }) => ({ key, icon, label }));
  }, [isAuthenticated, user?.role]);

  const selectedKey = useMemo(() => {
    const exact = menuItems.find((item) => item?.key === pathname)?.key;
    if (exact) {
      return String(exact);
    }

    const prefix = menuItems.find((item) =>
      pathname.startsWith(String(item?.key))
    )?.key;

    return String(prefix ?? "/dashboard");
  }, [menuItems, pathname]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={260}>
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ color: "#fff", margin: 0 }}>
            {collapsed ? "XR" : "Xypes Response"}
          </Title>
          {!collapsed ? (
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>LGU Incident Ops</Text>
          ) : null}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(String(key))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Space>
            <Avatar>{(user?.email?.[0] ?? "U").toUpperCase()}</Avatar>
            <div>
              <Text strong>{user?.email}</Text>
              <br />
              <Text type="secondary">{user?.role}</Text>
            </div>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            Logout
          </Button>
        </Header>
        <Content style={{ padding: 20 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
