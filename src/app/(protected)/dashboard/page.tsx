"use client";

import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import { useQueries } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { fetchAssignments } from "@/features/assignments/api";
import { fetchIncidents } from "@/features/incidents/api";
import { fetchResponders, fetchStatuses } from "@/features/reference-data/api";

const { Title } = Typography;

export default function DashboardPage() {
  const results = useQueries({
    queries: [
      { queryKey: ["incidents"], queryFn: fetchIncidents },
      { queryKey: ["assignments"], queryFn: fetchAssignments },
      { queryKey: ["responders"], queryFn: fetchResponders },
      { queryKey: ["statuses"], queryFn: fetchStatuses },
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

  const incidents = incidentsQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const responders = respondersQ.data ?? [];
  const statuses = statusesQ.data ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Dashboard Overview
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Incidents" value={incidents.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Assignments" value={assignments.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Responders" value={responders.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Statuses" value={statuses.length} />
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
            { title: "ID", dataIndex: "id", key: "id", width: 100 },
            {
              title: "Description",
              dataIndex: "description",
              key: "description",
              render: (value: string) => value || "N/A",
            },
            {
              title: "Status ID",
              dataIndex: "statusId",
              key: "statusId",
              render: (value: string | number) => <Tag color="blue">{value ?? "N/A"}</Tag>,
            },
            {
              title: "Reported",
              dataIndex: "dateReported",
              key: "dateReported",
              render: (value: string) => (value ? new Date(value).toLocaleString() : "N/A"),
            },
          ]}
          locale={{ emptyText: "No incidents available" }}
        />
      </Card>
    </Space>
  );
}
