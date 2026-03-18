"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Form, Layout, message } from "antd";
import { DashboardApiError, dashboardApi } from "@/lib/cirs/dashboard-api";
import { CreateCitizenModal } from "@/components/dashboard/CreateCitizenModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSectionContent } from "@/components/dashboard/DashboardSectionContent";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  buildAssignmentRows,
  buildCitizenRows,
  buildIncidentRows,
  buildResponderRows,
  buildUserRows,
  getDashboardError,
} from "@/components/dashboard/dashboard-utils";
import type {
  CitizenFormValues,
  DashboardData,
  NavKey,
} from "@/components/dashboard/types";
import type { User } from "@/lib/cirs/types";
import styles from "./dashboard.module.css";

const { Content } = Layout;

async function getDashboardData(): Promise<DashboardData> {
  const health = await dashboardApi.getHealth();
  const citizens = await dashboardApi.listCitizens();
  const [responders, incidents, assignments, statuses, categories, severities] =
    await Promise.all([
      dashboardApi.listResponders(),
      dashboardApi.listIncidents(),
      dashboardApi.listAssignments(),
      dashboardApi.listStatuses(),
      dashboardApi.listCategories(),
      dashboardApi.listSeverities(),
    ]);

  let users: User[] = [];

  try {
    users = await dashboardApi.listUsers();
  } catch (error) {
    if (!(error instanceof DashboardApiError) || error.status !== 404) {
      throw error;
    }
  }

  return {
    healthStatus: health.status,
    citizens,
    incidents,
    assignments,
    responders,
    statuses,
    categories,
    severities,
    users,
  };
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [createCitizenOpen, setCreateCitizenOpen] = useState(false);
  const [creatingCitizen, setCreatingCitizen] = useState(false);
  const [citizenForm] = Form.useForm<CitizenFormValues>();

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);

    try {
      const result = await getDashboardData();
      setData(result);
    } catch (error) {
      setLoadError(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const incidentRows = useMemo(() => (data ? buildIncidentRows(data) : []), [data]);
  const citizenRows = useMemo(() => (data ? buildCitizenRows(data) : []), [data]);
  const assignmentRows = useMemo(() => (data ? buildAssignmentRows(data) : []), [data]);
  const responderRows = useMemo(() => (data ? buildResponderRows(data) : []), [data]);
  const userRows = useMemo(() => (data ? buildUserRows(data) : []), [data]);

  async function handleCreateCitizen() {
    try {
      const values = await citizenForm.validateFields();
      setCreatingCitizen(true);
      await dashboardApi.createCitizen(values);
      message.success("Citizen created successfully.");
      setCreateCitizenOpen(false);
      citizenForm.resetFields();
      await loadData();
    } catch (error) {
      if (error instanceof DashboardApiError) {
        message.error(getDashboardError(error));
      }
    } finally {
      setCreatingCitizen(false);
    }
  }

  return (
    <>
      <Layout className={styles.shell}>
        <DashboardSidebar
          collapsed={collapsed}
          activeKey={activeKey}
          onSelectNavKey={setActiveKey}
        />

        <Layout className={styles.mainLayout}>
          <DashboardHeader
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((value) => !value)}
            healthStatus={data?.healthStatus}
            apiSource={process.env.NEXT_PUBLIC_API_URL ?? "not configured"}
          />

          <Content className={styles.content}>
            <DashboardSectionContent
              loading={loading}
              data={data}
              loadError={loadError}
              activeKey={activeKey}
              incidentRows={incidentRows}
              citizenRows={citizenRows}
              assignmentRows={assignmentRows}
              responderRows={responderRows}
              userRows={userRows}
              onOpenCreateCitizen={() => setCreateCitizenOpen(true)}
            />
          </Content>
        </Layout>
      </Layout>

      <CreateCitizenModal
        open={createCitizenOpen}
        loading={creatingCitizen}
        form={citizenForm}
        onCancel={() => setCreateCitizenOpen(false)}
        onSubmit={() => void handleCreateCitizen()}
      />
    </>
  );
}
