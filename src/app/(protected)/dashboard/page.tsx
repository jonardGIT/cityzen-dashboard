"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { fetchAssignments } from "@/features/assignments/api";
import { fetchIncidents } from "@/features/incidents/api";
import {
  fetchResponders,
  fetchCategories,
  fetchSeverities,
  fetchStatuses,
} from "@/features/reference-data/api";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  serializeListFilters,
  type ListFilter,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { Assignment, Incident, Responder, Severity } from "@/types/api";

const { Text, Title } = Typography;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STALE_INCIDENT_HOURS = 4;
const AGING_BUCKETS = [
  { key: "new", label: "Under 1 hour", minHours: 0, maxHours: 1 },
  { key: "watch", label: "1 to 4 hours", minHours: 1, maxHours: 4 },
  { key: "stale", label: "4 to 24 hours", minHours: 4, maxHours: 24 },
  { key: "critical", label: "24+ hours", minHours: 24, maxHours: undefined },
] as const;

type DashboardScope = "all" | "open" | "unassigned" | "stale";
type IncidentDrillOptions = {
  scopeOverride?: DashboardScope;
  incidentId?: string;
  extraFilters?: ListFilter[];
  createdFrom?: string;
  createdTo?: string;
};

function normalizeStatusName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isClosedStatus(statusName: string | undefined): boolean {
  const normalized = normalizeStatusName(statusName);
  return ["resolved", "closed", "cancelled", "canceled", "completed"].some(
    (term) => normalized.includes(term),
  );
}

function isInProgressStatus(statusName: string | undefined): boolean {
  const normalized = normalizeStatusName(statusName);
  return ["in progress", "dispatched", "responding", "ongoing"].some((term) =>
    normalized.includes(term),
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: unknown): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return "N/A";
  }

  return DATE_TIME_FORMATTER.format(parsed);
}

function formatAgeHours(value: unknown, currentTime: number): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return "N/A";
  }

  const diffHours = Math.max(
    0,
    Math.floor((currentTime - parsed.getTime()) / (60 * 60 * 1000)),
  );

  if (diffHours < 1) {
    return "<1h";
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

function buildAddressLabel(incident: Incident): string {
  const parts = [
    incident.addressLine1,
    incident.addressLine2,
    incident.barangay,
    incident.cityName,
    incident.provinceName,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(", ") : "N/A";
}

function getIncidentDate(incident: Incident): string | undefined {
  return incident.dateReported ?? incident.createdAt;
}

function getIncidentStatusName(
  incident: Incident,
  statusLabels: Map<string, string>,
): string {
  return statusLabels.get(String(incident.statusId ?? "")) ?? "Unknown";
}

function getResponderName(responder: Responder | undefined): string {
  if (!responder) {
    return "Unassigned";
  }

  const fullName = [responder.firstName, responder.lastName]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" ")
    .trim();

  return fullName || responder.name || responder.email || String(responder.id);
}

function getAssignmentDate(assignment: Assignment): string | undefined {
  return (
    assignment.assignedDate ?? assignment.createdAt ?? assignment.updatedAt
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime] = useState(() => Date.now());
  const [scope, setScope] = useState<DashboardScope>("open");
  const [selectedSeverityId, setSelectedSeverityId] = useState<string>("all");
  const defaultListParams: ListQueryState = {
    page: 1,
    pageSize: 100,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
  };

  const results = useQueries({
    queries: [
      {
        queryKey: ["incidents", defaultListParams],
        queryFn: ({ signal }) => fetchIncidents(defaultListParams, signal),
      },
      {
        queryKey: ["assignments", defaultListParams],
        queryFn: ({ signal }) => fetchAssignments(defaultListParams, signal),
      },
      {
        queryKey: ["responders", defaultListParams],
        queryFn: ({ signal }) => fetchResponders(defaultListParams, signal),
      },
      {
        queryKey: ["statuses", defaultListParams],
        queryFn: ({ signal }) => fetchStatuses(defaultListParams, signal),
      },
      {
        queryKey: ["severities", defaultListParams],
        queryFn: ({ signal }) => fetchSeverities(defaultListParams, signal),
      },
      {
        queryKey: ["categories", defaultListParams],
        queryFn: ({ signal }) => fetchCategories(defaultListParams, signal),
      },
    ],
  });

  const [
    incidentsQ,
    assignmentsQ,
    respondersQ,
    statusesQ,
    severitiesQ,
    categoriesQ,
  ] = results;

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
  const severities = severitiesQ.data?.data ?? [];
  const categories = categoriesQ.data?.data ?? [];
  const incidentsTotal = incidentsQ.data?.pagination.total ?? incidents.length;
  const respondersTotal =
    respondersQ.data?.pagination.total ?? responders.length;
  const statusLabels = new Map(
    statuses.map((status) => [
      String(status.id),
      status.name?.trim() || String(status.id),
    ]),
  );
  const responderLabels = new Map(
    responders.map((responder) => [String(responder.id), responder]),
  );
  const severityLabels = new Map(
    severities.map((severity) => [
      String(severity.id),
      severity.level?.trim() || severity.name?.trim() || String(severity.id),
    ]),
  );
  const categoryLabels = new Map(
    categories.map((category) => [
      String(category.id),
      category.name?.trim() || String(category.id),
    ]),
  );
  const latestAssignmentByIncident = new Map<string, Assignment>();

  for (const assignment of assignments) {
    const incidentId = assignment.incidentId
      ? String(assignment.incidentId)
      : null;
    if (!incidentId) {
      continue;
    }

    const existing = latestAssignmentByIncident.get(incidentId);
    const existingDate =
      parseDate(getAssignmentDate(existing ?? ({} as Assignment)))?.getTime() ??
      0;
    const nextDate = parseDate(getAssignmentDate(assignment))?.getTime() ?? 0;

    if (!existing || nextDate >= existingDate) {
      latestAssignmentByIncident.set(incidentId, assignment);
    }
  }

  const openIncidents = incidents.filter(
    (incident) =>
      !isClosedStatus(getIncidentStatusName(incident, statusLabels)),
  );
  const unassignedIncidents = openIncidents.filter(
    (incident) => !latestAssignmentByIncident.has(String(incident.id)),
  );
  const staleIncidents = openIncidents.filter((incident) => {
    const reportedAt = parseDate(getIncidentDate(incident));
    if (!reportedAt) {
      return false;
    }

    return (
      currentTime - reportedAt.getTime() >=
      STALE_INCIDENT_HOURS * 60 * 60 * 1000
    );
  });
  const openStatusIds = statuses
    .filter((status) => !isClosedStatus(status.name))
    .map((status) => String(status.id));

  const scopedIncidentsSource =
    scope === "all"
      ? incidents
      : scope === "open"
        ? openIncidents
        : scope === "unassigned"
          ? unassignedIncidents
          : staleIncidents;

  const filteredIncidents = scopedIncidentsSource.filter((incident) => {
    if (selectedSeverityId === "all") {
      return true;
    }

    return String(incident.severityId ?? "") === selectedSeverityId;
  });

  const filteredIncidentIdSet = new Set(
    filteredIncidents.map((incident) => String(incident.id)),
  );
  const filteredOpenIncidents = filteredIncidents.filter(
    (incident) =>
      !isClosedStatus(getIncidentStatusName(incident, statusLabels)),
  );
  const filteredInProgressIncidents = filteredOpenIncidents.filter((incident) =>
    isInProgressStatus(getIncidentStatusName(incident, statusLabels)),
  );
  const filteredUnassignedIncidents = filteredOpenIncidents.filter(
    (incident) => !latestAssignmentByIncident.has(String(incident.id)),
  );
  const filteredIncidentsReportedToday = filteredIncidents.filter(
    (incident) => {
      const reportedAt = parseDate(getIncidentDate(incident));
      if (!reportedAt) {
        return false;
      }

      return currentTime - reportedAt.getTime() <= DAY_IN_MS;
    },
  );
  const filteredStaleIncidents = filteredOpenIncidents.filter((incident) => {
    const reportedAt = parseDate(getIncidentDate(incident));
    if (!reportedAt) {
      return false;
    }

    return (
      currentTime - reportedAt.getTime() >=
      STALE_INCIDENT_HOURS * 60 * 60 * 1000
    );
  });

  const recentIncidents = [...filteredIncidents]
    .sort((left, right) => {
      const rightTime = parseDate(getIncidentDate(right))?.getTime() ?? 0;
      const leftTime = parseDate(getIncidentDate(left))?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);

  const urgentQueue = [...filteredUnassignedIncidents]
    .sort((left, right) => {
      const leftTime = parseDate(getIncidentDate(left))?.getTime() ?? 0;
      const rightTime = parseDate(getIncidentDate(right))?.getTime() ?? 0;
      return leftTime - rightTime;
    })
    .slice(0, 6);

  const recentAssignments = [...assignments]
    .sort((left, right) => {
      const rightTime = parseDate(getAssignmentDate(right))?.getTime() ?? 0;
      const leftTime = parseDate(getAssignmentDate(left))?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);
  const filteredAssignments = recentAssignments.filter((assignment) =>
    filteredIncidentIdSet.has(String(assignment.incidentId ?? "")),
  );
  const agingBuckets = AGING_BUCKETS.map((bucket) => {
    const createdFrom =
      bucket.maxHours === undefined
        ? undefined
        : new Date(
            currentTime - bucket.maxHours * 60 * 60 * 1000,
          ).toISOString();
    const createdTo = new Date(
      currentTime - bucket.minHours * 60 * 60 * 1000,
    ).toISOString();
    const incidentsInBucket = filteredOpenIncidents.filter((incident) => {
      const reportedAt = parseDate(getIncidentDate(incident));
      if (!reportedAt) {
        return false;
      }

      const ageHours = Math.max(
        0,
        (currentTime - reportedAt.getTime()) / (60 * 60 * 1000),
      );

      if (bucket.maxHours === undefined) {
        return ageHours >= bucket.minHours;
      }

      return ageHours >= bucket.minHours && ageHours < bucket.maxHours;
    });

    return {
      ...bucket,
      count: incidentsInBucket.length,
      createdFrom,
      createdTo,
    };
  });
  const topCategories = Array.from(
    filteredIncidents.reduce<Map<string, number>>((accumulator, incident) => {
      const key = String(incident.categoryId ?? "unknown");
      accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
      return accumulator;
    }, new Map()),
  )
    .map(([categoryId, count]) => ({
      categoryId,
      count,
      label: categoryLabels.get(categoryId) ?? "Uncategorized",
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const openIncidentsList = ({
    scopeOverride = scope,
    incidentId,
    extraFilters = [],
    createdFrom,
    createdTo,
  }: IncidentDrillOptions = {}) => {
    const filters: ListFilter[] = [];

    if (selectedSeverityId !== "all") {
      filters.push({
        field: "severityId",
        operator: "equals",
        value: selectedSeverityId,
      });
    }

    if (incidentId) {
      filters.push({
        field: "id",
        operator: "equals",
        value: incidentId,
      });
    } else if (
      (scopeOverride === "open" ||
        scopeOverride === "unassigned" ||
        scopeOverride === "stale") &&
      openStatusIds.length > 0
    ) {
      filters.push({
        field: "statusId",
        operator: openStatusIds.length === 1 ? "equals" : "in",
        value: openStatusIds.length === 1 ? openStatusIds[0] : openStatusIds,
      });
    }

    filters.push(...extraFilters);

    const params = new URLSearchParams({
      page: "1",
      pageSize: "20",
      sortBy: DEFAULT_SORT_BY,
      sortOrder: DEFAULT_SORT_ORDER,
    });

    const serializedFilters = serializeListFilters(filters);
    if (serializedFilters) {
      params.set("filters", serializedFilters);
    }

    if (createdFrom) {
      params.set("createdFrom", createdFrom);
    }

    if (createdTo) {
      params.set("createdTo", createdTo);
    }

    if (scopeOverride === "stale" && !createdTo) {
      params.set(
        "createdTo",
        new Date(
          currentTime - STALE_INCIDENT_HOURS * 60 * 60 * 1000,
        ).toISOString(),
      );
    }

    router.push(`/incidents?${params.toString()}`);
  };

  const recentIncidentColumns: TableProps<Incident>["columns"] = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined, incident: Incident) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{value || "N/A"}</Text>
          <Text type="secondary">{buildAddressLabel(incident)}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "statusId",
      key: "statusId",
      render: (value: string | undefined) => {
        const statusName = statusLabels.get(String(value ?? "")) ?? "Unknown";
        const color = isClosedStatus(statusName)
          ? "green"
          : isInProgressStatus(statusName)
            ? "processing"
            : "gold";

        return <Tag color={color}>{statusName}</Tag>;
      },
    },
    {
      title: "Severity",
      dataIndex: "severityId",
      key: "severityId",
      render: (value: string | undefined) =>
        severityLabels.get(String(value ?? "")) ?? "Unspecified",
    },
    {
      title: "Assignee",
      key: "assignee",
      render: (_: unknown, incident: Incident) => {
        const assignment = latestAssignmentByIncident.get(String(incident.id));
        const responder = assignment?.responderId
          ? responderLabels.get(String(assignment.responderId))
          : undefined;
        return getResponderName(responder);
      },
    },
    {
      title: "Age",
      key: "age",
      render: (_: unknown, incident: Incident) =>
        formatAgeHours(getIncidentDate(incident), currentTime),
    },
    {
      title: "Reported",
      key: "reported",
      render: (_: unknown, incident: Incident) =>
        formatDateTime(getIncidentDate(incident)),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, incident: Incident) => (
        <Button
          type="link"
          onClick={() => openIncidentsList({ incidentId: String(incident.id) })}
        >
          Open
        </Button>
      ),
    },
  ];

  const urgentQueueColumns: TableProps<Incident>["columns"] = [
    {
      title: "Incident",
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined, incident: Incident) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{value || "N/A"}</Text>
          <Text type="secondary">{buildAddressLabel(incident)}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, incident: Incident) => (
        <Tag color="gold">{getIncidentStatusName(incident, statusLabels)}</Tag>
      ),
    },
    {
      title: "Age",
      key: "age",
      render: (_: unknown, incident: Incident) =>
        formatAgeHours(getIncidentDate(incident), currentTime),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, incident: Incident) => (
        <Button
          type="link"
          onClick={() => openIncidentsList({ incidentId: String(incident.id) })}
        >
          Open
        </Button>
      ),
    },
  ];

  const recentAssignmentsColumns: TableProps<Assignment>["columns"] = [
    {
      title: "Incident",
      key: "incident",
      render: (_: unknown, assignment: Assignment) => {
        const incident = incidents.find(
          (candidate) =>
            String(candidate.id) === String(assignment.incidentId ?? ""),
        );

        return (
          <Button
            type="link"
            style={{ paddingInline: 0 }}
            onClick={() => {
              if (assignment.incidentId) {
                openIncidentsList({
                  incidentId: String(assignment.incidentId),
                });
              }
            }}
          >
            {incident?.description ||
              `Incident ${assignment.incidentId ?? "N/A"}`}
          </Button>
        );
      },
    },
    {
      title: "Responder",
      key: "responder",
      render: (_: unknown, assignment: Assignment) =>
        getResponderName(
          assignment.responderId
            ? responderLabels.get(String(assignment.responderId))
            : undefined,
        ),
    },
    {
      title: "Assigned",
      key: "assignedDate",
      render: (_: unknown, assignment: Assignment) =>
        formatDateTime(getAssignmentDate(assignment)),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Operations Dashboard
      </Title>

      {filteredUnassignedIncidents.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={`${filteredUnassignedIncidents.length} incident${filteredUnassignedIncidents.length === 1 ? " is" : "s are"} in the current view still waiting for assignment.`}
        />
      ) : null}

      <Card>
        <Space
          wrap
          size={12}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space wrap size={12}>
            <Segmented<DashboardScope>
              value={scope}
              onChange={(value) => setScope(value)}
              options={[
                { label: "Open", value: "open" },
                { label: "All", value: "all" },
                { label: "Unassigned", value: "unassigned" },
                { label: "Stale", value: "stale" },
              ]}
            />
            <Select
              value={selectedSeverityId}
              onChange={setSelectedSeverityId}
              style={{ minWidth: 220 }}
              options={[
                { value: "all", label: "All severities" },
                ...severities.map((severity: Severity) => ({
                  value: String(severity.id),
                  label:
                    severity.level?.trim() ||
                    severity.name?.trim() ||
                    `Severity ${severity.id}`,
                })),
              ]}
            />
          </Space>
          <Space size={12}>
            <Text type="secondary">
              Showing {filteredIncidents.length} incident
              {filteredIncidents.length === 1 ? "" : "s"} in the current view
            </Text>
            <Button onClick={() => openIncidentsList()}>
              Open In Incidents
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card
            hoverable
            onClick={() => openIncidentsList({ scopeOverride: "open" })}
          >
            <Statistic
              title="Open Incidents"
              value={filteredOpenIncidents.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card
            hoverable
            onClick={() => openIncidentsList({ scopeOverride: "unassigned" })}
          >
            <Statistic
              title="Unassigned Queue"
              value={filteredUnassignedIncidents.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card
            hoverable
            onClick={() =>
              openIncidentsList({
                scopeOverride: "open",
                extraFilters: [
                  {
                    field: "statusId",
                    operator: "in",
                    value: statuses
                      .filter((status) => isInProgressStatus(status.name))
                      .map((status) => String(status.id)),
                  },
                ],
              })
            }
          >
            <Statistic
              title="In Progress"
              value={filteredInProgressIncidents.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card
            hoverable
            onClick={() =>
              openIncidentsList({
                createdFrom: new Date(currentTime - DAY_IN_MS).toISOString(),
              })
            }
          >
            <Statistic
              title="Reported Today"
              value={filteredIncidentsReportedToday.length}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card
            hoverable
            onClick={() => openIncidentsList({ scopeOverride: "stale" })}
          >
            <Statistic
              title="Stale Open Incidents"
              value={filteredStaleIncidents.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Responders" value={respondersTotal} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic
              title="Assignments In View"
              value={filteredAssignments.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Incidents Loaded" value={incidentsTotal} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Aging Buckets">
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              {agingBuckets.map((bucket) => {
                return (
                  <Space
                    key={bucket.key}
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space orientation="vertical" size={0}>
                      <Text strong>{bucket.label}</Text>
                      <Text type="secondary">
                        {bucket.count} open incidents
                      </Text>
                    </Space>
                    <Button
                      type="link"
                      onClick={() =>
                        openIncidentsList({
                          scopeOverride: "open",
                          createdFrom: bucket.createdFrom,
                          createdTo: bucket.createdTo,
                        })
                      }
                    >
                      Open
                    </Button>
                  </Space>
                );
              })}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Top Categories In View">
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              {topCategories.length === 0 ? (
                <Text type="secondary">
                  No category data available in this view.
                </Text>
              ) : (
                topCategories.map((category) => (
                  <Space
                    key={category.categoryId}
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space orientation="vertical" size={0}>
                      <Text strong>{category.label}</Text>
                      <Text type="secondary">{category.count} incidents</Text>
                    </Space>
                    <Button
                      type="link"
                      onClick={() =>
                        openIncidentsList({
                          extraFilters: [
                            {
                              field: "categoryId",
                              operator: "equals",
                              value: category.categoryId,
                            },
                          ],
                        })
                      }
                    >
                      Open
                    </Button>
                  </Space>
                ))
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="Recent Incidents"
            extra={
              <Button type="link" onClick={() => openIncidentsList()}>
                Open current view
              </Button>
            }
          >
            <Table
              rowKey="id"
              dataSource={recentIncidents}
              pagination={false}
              scroll={{ x: 980 }}
              columns={recentIncidentColumns}
              locale={{ emptyText: "No incidents available" }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            title="Needs Assignment"
            extra={
              <Button
                type="link"
                onClick={() =>
                  openIncidentsList({ scopeOverride: "unassigned" })
                }
              >
                Open incidents
              </Button>
            }
          >
            <Table
              rowKey="id"
              dataSource={urgentQueue}
              pagination={false}
              columns={urgentQueueColumns}
              locale={{ emptyText: "All open incidents are assigned" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Recent Assignments"
        extra={
          <Button type="link" onClick={() => openIncidentsList()}>
            Open incidents
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={filteredAssignments}
          pagination={false}
          columns={recentAssignmentsColumns}
          locale={{ emptyText: "No assignments available" }}
        />
      </Card>
    </Space>
  );
}
