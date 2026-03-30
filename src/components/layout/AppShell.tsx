"use client";

import {
  AppstoreOutlined,
  FileSearchOutlined,
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
import { CAN_VIEW_AUDIT_LOGS } from "@/lib/auth/permissions";

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
    if (!user?.role) {
      return "No role";
    }

    return String(user.role)
      .toLowerCase()
      .split("_")
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [user]);

  const menuItems = useMemo<NonNullable<MenuProps["items"]>>(() => {
    const resources = getAllCrudResources();

    const items: AppMenuItem[] = [
      { key: "/dashboard", icon: <AppstoreOutlined />, label: "Dashboard" },
      ...resources.map((resource) => ({
        key: `/dashboard/${resource.resource}`,
        icon: iconForResource(resource.resource),
        label: resource.label,
        canView: () =>
          hasPermission(resource.endpoints.list, user?.role, isAuthenticated),
      })),
      {
        key: "/audit-logs",
        icon: <FileSearchOutlined />,
        label: "Audit Logs",
        canView: () =>
          Boolean(user?.role && CAN_VIEW_AUDIT_LOGS.includes(user.role)),
      },
      {
        key: "/profile",
        icon: <UserOutlined />,
        label: "Account Security",
      },
    ];

    return items
      .filter((item) => (item.canView ? item.canView() : true))
      .map(({ key, icon, label }) => ({ key, icon, label }));
  }, [isAuthenticated, user]);

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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
      >
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ color: "#fff", margin: 0 }}>
            {collapsed ? "XR" : "Xypes Response"}
          </Title>
          {!collapsed ? (
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>
              LGU Incident Ops
            </Text>
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
          <Space size={12} align="center" style={{ minWidth: 0 }}>
            <Avatar
              size={36}
              style={{
                backgroundColor: "#1677ff",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {avatarInitial}
            </Avatar>
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <Text
                strong
                style={{ display: "block" }}
                ellipsis={{ tooltip: identityLabel }}
              >
                {identityLabel}
              </Text>
              <Text type="secondary" style={{ display: "block" }}>
                {roleLabel}
              </Text>
            </div>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={() => void logout()}>
            Logout
          </Button>
        </Header>
        <Content style={{ padding: 20 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
