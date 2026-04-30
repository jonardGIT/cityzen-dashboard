"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntdApp, theme } from "antd";
import { AuthProvider } from "@/context/AuthContext";
import { createQueryClient } from "@/lib/query/query-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        componentSize="large"
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1f5fbf",
            colorInfo: "#1f5fbf",
            colorSuccess: "#1f7a5c",
            colorWarning: "#9b6a12",
            colorError: "#b42318",
            colorText: "#10243f",
            colorTextSecondary: "#4f647d",
            colorBorder: "rgba(16, 36, 63, 0.1)",
            colorBgBase: "#f3f6f3",
            colorBgContainer: "rgba(255, 255, 255, 0.88)",
            colorFillSecondary: "rgba(231, 238, 231, 0.75)",
            fontFamily: "var(--font-body), Georgia, serif",
            fontFamilyCode:
              "ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace",
            borderRadius: 12,
            borderRadiusLG: 20,
            boxShadowSecondary: "0 20px 60px rgba(9, 26, 42, 0.08)",
          },
          components: {
            Layout: {
              bodyBg: "transparent",
              headerBg: "transparent",
              siderBg: "#102b49",
              triggerBg: "#102b49",
              triggerColor: "#f7fbff",
            },
            Menu: {
              darkItemBg: "transparent",
              darkSubMenuItemBg: "transparent",
              darkItemSelectedBg: "rgba(255, 255, 255, 0.14)",
              darkItemHoverBg: "rgba(255, 255, 255, 0.08)",
              darkItemColor: "rgba(247, 251, 255, 0.78)",
              darkItemSelectedColor: "#ffffff",
              itemBorderRadius: 14,
            },
            Card: {
              headerBg: "transparent",
            },
            Button: {
              borderRadius: 999,
              controlHeight: 44,
              primaryShadow: "none",
            },
            Input: {
              controlHeight: 44,
              activeBorderColor: "#1f5fbf",
              hoverBorderColor: "#1f5fbf",
            },
            Select: {
              controlHeight: 44,
            },
            Alert: {
              withDescriptionPadding: 16,
              borderRadiusLG: 16,
            },
            Tag: {
              borderRadiusSM: 999,
            },
          },
        }}
      >
        <AntdApp>
          <AuthProvider>{children}</AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
