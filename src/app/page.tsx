"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Col, Divider, Layout, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { getFriendlyApiError } from "@/lib/cirs/errors";
import type { Assignment, Category, Incident, Severity, Status } from "@/lib/cirs/types";
import styles from "./dashboard.module.css";

const { Content, Header } = Layout;
const { Paragraph, Title, Text } = Typography;

interface DashboardData {
  incidents: Incident[];
  assignments: Assignment[];
  statuses: Status[];
  categories: Category[];
  severities: Severity[];
}

interface IncidentTableRow {
  key: string;
  id: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  updatedAt: string;
}

function toLabel(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function createLookup(items: Array<{ id: string | number; name?: string }>): Record<string, string> {
  return items.reduce<Record<string, string>>((acc, item) => {
    acc[String(item.id)] = toLabel(item.name, `#${item.id}`);
    return acc;
  }, {});
}

async function getDashboardData(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as DashboardData & {
    message?: string;
    status?: number;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with ${response.status}`);
  }

  return payload;
}

function buildIncidentRows(data: DashboardData): IncidentTableRow[] {
  const statusById = createLookup(data.statuses);
  const severityById = createLookup(data.severities);
  const categoryById = createLookup(data.categories);

  return data.incidents.slice(0, 10).map((incident) => {
    const id = String(incident.id);
    const title = toLabel(incident.title, `Incident ${id}`);
    const status = statusById[String(incident.statusId)] ?? "Unknown";
    const severity = severityById[String(incident.severityId)] ?? "Unknown";
    const category = categoryById[String(incident.categoryId)] ?? "Unknown";
    const updatedAt =
      typeof incident.updatedAt === "string" || typeof incident.createdAt === "string"
        ? new Date((incident.updatedAt ?? incident.createdAt) as string).toLocaleString()
        : "N/A";

    return {
      key: id,
      id,
      title,
      status,
      severity,
      category,
      updatedAt,
    };
  });
}

const incidentColumns: TableProps<IncidentTableRow>["columns"] = [
  {
    title: "Incident ID",
    dataIndex: "id",
    key: "id",
    width: 120,
  },
  {
    title: "Title",
    dataIndex: "title",
    key: "title",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (value: string) => <Tag color="blue">{value}</Tag>,
  },
  {
    title: "Severity",
    dataIndex: "severity",
    key: "severity",
    render: (value: string) => <Tag color="gold">{value}</Tag>,
  },
  {
    title: "Category",
    dataIndex: "category",
    key: "category",
  },
  {
    title: "Last Updated",
    dataIndex: "updatedAt",
    key: "updatedAt",
  },
];

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getDashboardData()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(error);
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => (data ? buildIncidentRows(data) : []), [data]);

  if (loading) {
    return (
      <Layout className={styles.shell}>
        <Content className={styles.content}>
          <Card>
            <Skeleton active paragraph={{ rows: 7 }} />
          </Card>
        </Content>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout className={styles.shell}>
        <Content className={styles.content}>
          <Card>
            <Space orientation="vertical" size="small">
              <Title level={3}>Xypes CIRS Dashboard</Title>
              <Paragraph type="secondary">
                The dashboard could not load CIRS API data.
              </Paragraph>
              <Alert
                type="error"
                showIcon
                title="API Integration Error"
                description={getFriendlyApiError(loadError)}
              />
            </Space>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className={styles.shell}>
      <Content className={styles.content}>
        <Header className={styles.header}>
          <div>
            <Title level={2} className={styles.heroTitle}>
              Xypes CIRS Dashboard
            </Title>
            <Text type="secondary" className={styles.heroSubtitle}>
              Incident, assignment, and response visibility powered by CIRS API.
            </Text>
          </div>
          <Tag color="processing">Source of Truth: /api/v1</Tag>
        </Header>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Incidents" value={data.incidents.length} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Assignments" value={data.assignments.length} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Statuses Configured" value={data.statuses.length} />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Title level={4} className={styles.tableTitle}>
            Recent Incidents
          </Title>
          <Table<IncidentTableRow>
            columns={incidentColumns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{ emptyText: "No incidents returned from API" }}
          />
        </Space>
      </Content>
    </Layout>
  );
}
