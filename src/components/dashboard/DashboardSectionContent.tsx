import { Alert, Button, Card, Col, Divider, Row, Skeleton, Space, Statistic, Table, Typography } from "antd";
import {
  assignmentColumns,
  citizenColumns,
  getDashboardError,
  incidentColumns,
  responderColumns,
  userColumns,
} from "@/components/dashboard/dashboard-utils";
import type {
  AssignmentTableRow,
  CitizenTableRow,
  DashboardData,
  IncidentTableRow,
  NavKey,
  ResponderTableRow,
  UserTableRow,
} from "@/components/dashboard/types";
import styles from "@/app/dashboard.module.css";

const { Paragraph, Title } = Typography;

interface DashboardSectionContentProps {
  loading: boolean;
  data: DashboardData | null;
  loadError: unknown;
  activeKey: NavKey;
  incidentRows: IncidentTableRow[];
  citizenRows: CitizenTableRow[];
  assignmentRows: AssignmentTableRow[];
  responderRows: ResponderTableRow[];
  userRows: UserTableRow[];
  onOpenCreateCitizen: () => void;
}

export function DashboardSectionContent({
  loading,
  data,
  loadError,
  activeKey,
  incidentRows,
  citizenRows,
  assignmentRows,
  responderRows,
  userRows,
  onOpenCreateCitizen,
}: DashboardSectionContentProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 7 }} />
      </Card>
    );
  }

  if (!data) {
    return (
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
            description={getDashboardError(loadError)}
          />
        </Space>
      </Card>
    );
  }

  if (activeKey === "overview") {
    return (
      <>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <Card>
              <Statistic title="Citizens" value={data.citizens.length} />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card>
              <Statistic title="Incidents" value={data.incidents.length} />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card>
              <Statistic title="Assignments" value={data.assignments.length} />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card>
              <Statistic title="Responders" value={data.responders.length} />
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
            dataSource={incidentRows.slice(0, 10)}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{ emptyText: "No incidents returned from API" }}
          />
        </Space>
      </>
    );
  }

  if (activeKey === "incidents") {
    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4} className={styles.tableTitle}>
          Incidents
        </Title>
        <Table<IncidentTableRow>
          columns={incidentColumns}
          dataSource={incidentRows}
          scroll={{ x: 900 }}
          locale={{ emptyText: "No incidents returned from API" }}
        />
      </Space>
    );
  }

  if (activeKey === "citizens") {
    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} className={styles.tableTitle}>
            Citizens
          </Title>
          <Button type="primary" onClick={onOpenCreateCitizen}>
            Create Citizen
          </Button>
        </Space>
        <Table<CitizenTableRow>
          columns={citizenColumns}
          dataSource={citizenRows}
          scroll={{ x: 760 }}
          locale={{ emptyText: "No citizens returned from API" }}
        />
      </Space>
    );
  }

  if (activeKey === "assignments") {
    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4} className={styles.tableTitle}>
          Assignments
        </Title>
        <Table<AssignmentTableRow>
          columns={assignmentColumns}
          dataSource={assignmentRows}
          scroll={{ x: 980 }}
          locale={{ emptyText: "No assignments returned from API" }}
        />
      </Space>
    );
  }

  if (activeKey === "responders") {
    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4} className={styles.tableTitle}>
          Responders
        </Title>
        <Table<ResponderTableRow>
          columns={responderColumns}
          dataSource={responderRows}
          scroll={{ x: 820 }}
          locale={{ emptyText: "No responders returned from API" }}
        />
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Title level={4} className={styles.tableTitle}>
        Users
      </Title>
      <Table<UserTableRow>
        columns={userColumns}
        dataSource={userRows}
        scroll={{ x: 820 }}
        locale={{ emptyText: "Users endpoint unavailable or no users returned" }}
      />
    </Space>
  );
}
