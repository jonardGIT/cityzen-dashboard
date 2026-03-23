"use client";

import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import { useQueries } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { fetchAssignments } from "@/features/assignments/api";
import { fetchIncidents } from "@/features/incidents/api";
import { fetchResponders, fetchStatuses } from "@/features/reference-data/api";

const { Title } = Typography;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return DATE_TIME_FORMATTER.format(parsed);
}

export default function DashboardPage() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["incidents", 1, 10],
        queryFn: ({ signal }) => fetchIncidents(1, 10, signal),
      },
      {
        queryKey: ["assignments", 1, 10],
        queryFn: ({ signal }) => fetchAssignments(1, 10, signal),
      },
      {
        queryKey: ["responders", 1, 10],
        queryFn: ({ signal }) => fetchResponders(1, 10, signal),
      },
      {
        queryKey: ["statuses", 1, 10],
        queryFn: ({ signal }) => fetchStatuses(1, 10, signal),
      },
    ],
  });

  const [incidentsQ, assignmentsQ, respondersQ, statusesQ] = results;

  if (results.some((query) => query.isLoading)) {
    return <LoadingState />;
  }

  const firstError = results.find((query) => query.error)?.error;
  if (firstError) {
    return <ErrorState message={String(firstError)} />;
  }

  const incidents = incidentsQ.data?.data ?? [];
  const assignments = assignmentsQ.data?.data ?? [];
  const responders = respondersQ.data?.data ?? [];
  const statuses = statusesQ.data?.data ?? [];
  const incidentsTotal = incidentsQ.data?.pagination.total ?? incidents.length;
  const assignmentsTotal = assignmentsQ.data?.pagination.total ?? assignments.length;
  const respondersTotal = respondersQ.data?.pagination.total ?? responders.length;
  const statusesTotal = statusesQ.data?.pagination.total ?? statuses.length;
  const statusLabels = new Map(
    statuses.map((status) => [String(status.id), status.name?.trim() || String(status.id)]),
  );

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Dashboard Overview
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Incidents" value={incidentsTotal} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Assignments" value={assignmentsTotal} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Responders" value={respondersTotal} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Statuses" value={statusesTotal} />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Incidents">
        <Table
          rowKey="id"
          dataSource={incidents.slice(0, 10)}
          pagination={false}
          scroll={{ x: 900 }}
          columns={[
            {
              title: "Description",
              dataIndex: "description",
              key: "description",
              render: (value: string) => value || "N/A",
            },
            {
              title: "Status",
              dataIndex: "statusId",
              key: "statusId",
              render: (value: string | number) => (
                <Tag color="blue">{statusLabels.get(String(value)) ?? value ?? "N/A"}</Tag>
              ),
            },
            {
              title: "Reported",
              dataIndex: "dateReported",
              key: "dateReported",
              render: (value: unknown) => formatDateTime(value),
            },
          ]}
          locale={{ emptyText: "No incidents available" }}
        />
      </Card>
    </Space>
  );
}
