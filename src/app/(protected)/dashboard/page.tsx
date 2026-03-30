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
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { useQueries } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResizableTable } from "@/components/common/ResizableTable";
import styles from "./page.module.css";
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
import {
  formatDisplayDateTime as formatDateTime,
  formatDisplayRelativeTime as formatRelativeTime,
} from "@/lib/format/date-time";
import {
  buildIncidentAddressLabel,
  getAssignmentDisplayDate,
  getResponderDisplayName,
} from "@/lib/incidents/display";
import type {
  ApiErrorPayload,
  Assignment,
  Incident,
  Responder,
  Severity,
} from "@/types/api";

const { Text, Title } = Typography;

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

function getIncidentDate(incident: Incident): string | undefined {
  return incident.dateReported ?? incident.createdAt;
}

function getIncidentStatusName(
  incident: Incident,
  statusLabels: Map<string, string>,
): string {
  return statusLabels.get(String(incident.statusId ?? "")) ?? "Unknown";
}

function getSeverityColor(value: string | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    ["critical", "severe", "urgent"].some((term) => normalized.includes(term))
  ) {
    return "red";
  }

  if (["high"].some((term) => normalized.includes(term))) {
    return "volcano";
  }

  if (["medium", "moderate"].some((term) => normalized.includes(term))) {
    return "gold";
  }

  if (["low", "minor"].some((term) => normalized.includes(term))) {
    return "blue";
  }

  return "default";
}

function isAccessDeniedError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const status = error.response?.status;
  return status === 401 || status === 403;
}

function formatDashboardError(error: unknown): string {
  if (error instanceof AxiosError<ApiErrorPayload>) {
    return error.response?.data?.message ?? error.message;
  }

  return String(error);
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

  const assignmentsRestricted = isAccessDeniedError(assignmentsQ.error);
  const respondersRestricted = isAccessDeniedError(respondersQ.error);
  const statusesRestricted = isAccessDeniedError(statusesQ.error);
  const severitiesRestricted = isAccessDeniedError(severitiesQ.error);
  const categoriesRestricted = isAccessDeniedError(categoriesQ.error);
  const optionalRestrictions = [
    assignmentsRestricted ? "assignments" : null,
    respondersRestricted ? "responders" : null,
    statusesRestricted ? "statuses" : null,
    severitiesRestricted ? "severities" : null,
    categoriesRestricted ? "categories" : null,
  ].filter((value): value is string => Boolean(value));

  if (results.some((query) => query.isLoading)) {
    return <LoadingState />;
  }

  const firstBlockingError =
    incidentsQ.error ??
    [assignmentsQ, respondersQ, statusesQ, severitiesQ, categoriesQ].find(
      (query) => query.error && !isAccessDeniedError(query.error),
    )?.error;
  if (firstBlockingError) {
    return <ErrorState message={formatDashboardError(firstBlockingError)} />;
  }

  const incidents = incidentsQ.data?.data ?? [];
  const assignments = assignmentsRestricted ? [] : assignmentsQ.data?.data ?? [];
  const responders = respondersRestricted ? [] : respondersQ.data?.data ?? [];
  const statuses = statusesRestricted ? [] : statusesQ.data?.data ?? [];
  const severities = severitiesRestricted ? [] : severitiesQ.data?.data ?? [];
  const categories = categoriesRestricted ? [] : categoriesQ.data?.data ?? [];
  const incidentsTotal = incidentsQ.data?.pagination.total ?? incidents.length;
  const respondersTotal =
    respondersQ.data?.pagination.total ?? responders.length;
  const canUseLifecycle = !statusesRestricted;
  const canUseAssignments = !assignmentsRestricted;
  const canUseResponders = !respondersRestricted;
  const canUseSeverities = !severitiesRestricted;
  const canUseCategories = !categoriesRestricted;
  const effectiveScope = canUseLifecycle ? scope : "all";
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
      parseDate(getAssignmentDisplayDate(existing ?? ({} as Assignment)))?.getTime() ??
      0;
    const nextDate = parseDate(getAssignmentDisplayDate(assignment))?.getTime() ?? 0;

    if (!existing || nextDate >= existingDate) {
      latestAssignmentByIncident.set(incidentId, assignment);
    }
  }

  const openIncidents = incidents.filter(
    (incident) =>
      !canUseLifecycle ||
      !isClosedStatus(getIncidentStatusName(incident, statusLabels)),
  );
  const unassignedIncidents = canUseAssignments
    ? openIncidents.filter(
        (incident) => !latestAssignmentByIncident.has(String(incident.id)),
      )
    : [];
  const staleIncidents = canUseLifecycle
    ? openIncidents.filter((incident) => {
        const reportedAt = parseDate(getIncidentDate(incident));
        if (!reportedAt) {
          return false;
        }

        return (
          currentTime - reportedAt.getTime() >=
          STALE_INCIDENT_HOURS * 60 * 60 * 1000
        );
      })
    : [];
  const openStatusIds = canUseLifecycle
    ? statuses
        .filter((status) => !isClosedStatus(status.name))
        .map((status) => String(status.id))
    : [];

  const scopedIncidentsSource =
    effectiveScope === "all"
      ? incidents
      : effectiveScope === "open"
        ? openIncidents
        : effectiveScope === "unassigned"
          ? unassignedIncidents
          : staleIncidents;

  const filteredIncidents = scopedIncidentsSource.filter((incident) => {
    if (!canUseSeverities || selectedSeverityId === "all") {
      return true;
    }

    return String(incident.severityId ?? "") === selectedSeverityId;
  });

  const filteredIncidentIdSet = new Set(
    filteredIncidents.map((incident) => String(incident.id)),
  );
  const filteredOpenIncidents = canUseLifecycle
    ? filteredIncidents.filter(
        (incident) =>
          !isClosedStatus(getIncidentStatusName(incident, statusLabels)),
      )
    : filteredIncidents;
  const filteredInProgressIncidents = canUseLifecycle
    ? filteredOpenIncidents.filter((incident) =>
        isInProgressStatus(getIncidentStatusName(incident, statusLabels)),
      )
    : [];
  const filteredUnassignedIncidents = canUseAssignments
    ? filteredOpenIncidents.filter(
        (incident) => !latestAssignmentByIncident.has(String(incident.id)),
      )
    : [];
  const filteredIncidentsReportedToday = filteredIncidents.filter((incident) => {
    const reportedAt = parseDate(getIncidentDate(incident));
    if (!reportedAt) {
      return false;
    }

    return currentTime - reportedAt.getTime() <= DAY_IN_MS;
  });
  const filteredStaleIncidents = canUseLifecycle
    ? filteredOpenIncidents.filter((incident) => {
        const reportedAt = parseDate(getIncidentDate(incident));
        if (!reportedAt) {
          return false;
        }

        return (
          currentTime - reportedAt.getTime() >=
          STALE_INCIDENT_HOURS * 60 * 60 * 1000
        );
      })
    : [];

  const recentIncidents = [...filteredIncidents]
    .sort((left, right) => {
      const rightTime = parseDate(getIncidentDate(right))?.getTime() ?? 0;
      const leftTime = parseDate(getIncidentDate(left))?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);

  const urgentQueue = canUseAssignments
    ? [...filteredUnassignedIncidents]
        .sort((left, right) => {
          const leftTime = parseDate(getIncidentDate(left))?.getTime() ?? 0;
          const rightTime = parseDate(getIncidentDate(right))?.getTime() ?? 0;
          return leftTime - rightTime;
        })
        .slice(0, 6)
    : [];

  const recentAssignments = canUseAssignments
    ? [...assignments]
        .sort((left, right) => {
          const rightTime =
            parseDate(getAssignmentDisplayDate(right))?.getTime() ?? 0;
          const leftTime =
            parseDate(getAssignmentDisplayDate(left))?.getTime() ?? 0;
          return rightTime - leftTime;
        })
        .slice(0, 8)
    : [];
  const filteredAssignments = recentAssignments.filter((assignment) =>
    filteredIncidentIdSet.has(String(assignment.incidentId ?? "")),
  );
  const agingBuckets = canUseLifecycle
    ? AGING_BUCKETS.map((bucket) => {
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
      })
    : [];
  const topCategories = canUseCategories
    ? Array.from(
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
        .slice(0, 5)
    : [];

  const openIncidentsList = ({
    scopeOverride = effectiveScope,
    incidentId,
    extraFilters = [],
    createdFrom,
    createdTo,
  }: IncidentDrillOptions = {}) => {
    if (incidentId) {
      router.push(`/incidents/${incidentId}`);
      return;
    }

    const filters: ListFilter[] = [];

    if (canUseSeverities && selectedSeverityId !== "all") {
      filters.push({
        field: "severityId",
        operator: "equals",
        value: selectedSeverityId,
      });
    }

    if (
      canUseLifecycle &&
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
      width: 280,
      render: (value: string | undefined, incident: Incident) => (
        <div className={styles.cellStack}>
          <Text
            strong
            className={styles.truncateText}
            ellipsis={{ tooltip: value || "N/A" }}
          >
            {value || "N/A"}
          </Text>
          <Text
            type="secondary"
            className={styles.truncateText}
            ellipsis={{ tooltip: buildIncidentAddressLabel(incident) }}
          >
            {buildIncidentAddressLabel(incident)}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "statusId",
      key: "statusId",
      width: 140,
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
      width: 130,
      render: (value: string | undefined) => {
        const label = severityLabels.get(String(value ?? "")) ?? "Unspecified";
        return <Tag color={getSeverityColor(label)}>{label}</Tag>;
      },
    },
    {
      title: "Assignee",
      key: "assignee",
      width: 180,
      render: (_: unknown, incident: Incident) => {
        const assignment = latestAssignmentByIncident.get(String(incident.id));
        const responder = assignment?.responderId
          ? responderLabels.get(String(assignment.responderId))
          : undefined;
        return (
          <div className={styles.cellStack}>
            <Text
              className={styles.truncateText}
              ellipsis={{ tooltip: getResponderDisplayName(responder) }}
            >
              {getResponderDisplayName(responder)}
            </Text>
            <Text
              className={`${styles.cellMeta} ${styles.truncateText}`}
              ellipsis={{
                tooltip:
                  formatRelativeTime(
                    getAssignmentDisplayDate(assignment ?? ({} as Assignment)),
                  ) ?? "No recent assignment",
              }}
            >
              {formatRelativeTime(
                getAssignmentDisplayDate(assignment ?? ({} as Assignment)),
              ) ?? "No recent assignment"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Age",
      key: "age",
      width: 100,
      render: (_: unknown, incident: Incident) =>
        formatAgeHours(getIncidentDate(incident), currentTime),
    },
    {
      title: "Reported",
      key: "reported",
      width: 170,
      render: (_: unknown, incident: Incident) =>
        formatDateTime(getIncidentDate(incident)),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
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
      width: 320,
      render: (value: string | undefined, incident: Incident) => (
        <div className={styles.cellStack}>
          <Text
            strong
            className={styles.truncateText}
            ellipsis={{ tooltip: value || "N/A" }}
          >
            {value || "N/A"}
          </Text>
          <Text
            type="secondary"
            className={styles.truncateText}
            ellipsis={{ tooltip: buildIncidentAddressLabel(incident) }}
          >
            {buildIncidentAddressLabel(incident)}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      render: (_: unknown, incident: Incident) => (
        <Tag color="gold">{getIncidentStatusName(incident, statusLabels)}</Tag>
      ),
    },
    {
      title: "Age",
      key: "age",
      width: 100,
      render: (_: unknown, incident: Incident) =>
        formatAgeHours(getIncidentDate(incident), currentTime),
    },
    {
      title: "Action",
      key: "action",
      width: 110,
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
      width: 300,
      render: (_: unknown, assignment: Assignment) => {
        const incident = incidents.find(
          (candidate) =>
            String(candidate.id) === String(assignment.incidentId ?? ""),
        );

        return (
          <Button
            type="link"
            className={styles.truncateLink}
            title={
              incident?.description ||
              `Incident ${assignment.incidentId ?? "N/A"}`
            }
            onClick={() => {
              if (assignment.incidentId) {
                openIncidentsList({
                  incidentId: String(assignment.incidentId),
                });
              }
            }}
          >
            <span className={styles.truncateLinkLabel}>
              {incident?.description ||
                `Incident ${assignment.incidentId ?? "N/A"}`}
            </span>
          </Button>
        );
      },
    },
    {
      title: "Responder",
      key: "responder",
      width: 180,
      render: (_: unknown, assignment: Assignment) => {
        const label = getResponderDisplayName(
          assignment.responderId
            ? responderLabels.get(String(assignment.responderId))
            : undefined,
        );

        return (
          <Text className={styles.truncateText} ellipsis={{ tooltip: label }}>
            {label}
          </Text>
        );
      },
    },
    {
      title: "Assigned",
      key: "assignedDate",
      width: 180,
      render: (_: unknown, assignment: Assignment) => (
        <div className={styles.cellStack}>
          <Text
            className={styles.truncateText}
            ellipsis={{
              tooltip: formatDateTime(getAssignmentDisplayDate(assignment)),
            }}
          >
            {formatDateTime(getAssignmentDisplayDate(assignment))}
          </Text>
          <Text
            className={`${styles.cellMeta} ${styles.truncateText}`}
            ellipsis={{
              tooltip:
                formatRelativeTime(getAssignmentDisplayDate(assignment)) ??
                "Assignment time unavailable",
            }}
          >
            {formatRelativeTime(getAssignmentDisplayDate(assignment)) ??
              "Assignment time unavailable"}
          </Text>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.pageShell}>
      <Card className={styles.heroCard} variant="borderless">
        <div className={styles.heroInner}>
          <div className={styles.heroHeader}>
            <div className={styles.heroCopy}>
              <Text className={styles.eyebrow}>Incident Command Center</Text>
              <Title level={3} className={styles.heroTitle}>
                Operations Dashboard
              </Title>
              <Text className={styles.heroDescription}>
                Monitor open workload, surface aging risk, and move directly
                from summary signals into the incident queue.
              </Text>
            </div>
            <Button
              className={styles.heroAction}
              onClick={() => openIncidentsList()}
            >
              Open In Incidents
            </Button>
          </div>

          {optionalRestrictions.length > 0 ? (
            <Alert
              type="info"
              showIcon
              message="Some dashboard panels are hidden for this account."
              description={`Unavailable data: ${optionalRestrictions.join(", ")}.`}
            />
          ) : null}

          {canUseLifecycle && canUseAssignments && filteredUnassignedIncidents.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={`${filteredUnassignedIncidents.length} incident${filteredUnassignedIncidents.length === 1 ? " is" : "s are"} in the current view still waiting for assignment.`}
            />
          ) : null}

          <div className={styles.controlBar}>
            <Space wrap size={12}>
              {canUseLifecycle ? (
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
              ) : null}
              {canUseSeverities ? (
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
              ) : null}
            </Space>
            <Text className={styles.controlMeta}>
              Showing {filteredIncidents.length} incident
              {filteredIncidents.length === 1 ? "" : "s"} in the current view
            </Text>
          </div>
        </div>
      </Card>

      <div className={styles.primaryRow}>
        {canUseLifecycle ? (
        <Card
          className={`${styles.metricCard} ${styles.primaryMetric} ${styles.clickableCard}`}
          variant="borderless"
          onClick={() => openIncidentsList({ scopeOverride: "open" })}
        >
          <Statistic
            title="Open Incidents"
            value={filteredOpenIncidents.length}
          />
          <Text className={styles.primaryMetricText}>
            Immediate workload across the current dashboard scope.
          </Text>
        </Card>
        ) : (
        <Card
          className={`${styles.metricCard} ${styles.primaryMetric}`}
          variant="borderless"
        >
          <Statistic title="Incidents In View" value={filteredIncidents.length} />
          <Text className={styles.primaryMetricText}>
            Dashboard metrics are limited to incident data for this account.
          </Text>
        </Card>
        )}

        <div className={styles.summaryPanel}>
          {canUseAssignments ? (
          <Card
            className={`${styles.metricCard} ${styles.clickableCard}`}
            variant="borderless"
            onClick={() => openIncidentsList({ scopeOverride: "unassigned" })}
          >
            <Statistic
              title="Unassigned Queue"
              value={filteredUnassignedIncidents.length}
            />
            <Text className={styles.metricLabel}>Awaiting dispatch</Text>
          </Card>
          ) : null}
          {canUseLifecycle ? (
          <Card
            className={`${styles.metricCard} ${styles.clickableCard}`}
            variant="borderless"
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
            <Text className={styles.metricLabel}>Active field response</Text>
          </Card>
          ) : null}
          <Card
            className={`${styles.metricCard} ${styles.clickableCard}`}
            variant="borderless"
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
            <Text className={styles.metricLabel}>Fresh incident volume</Text>
          </Card>
          {canUseLifecycle ? (
          <Card
            className={`${styles.metricCard} ${styles.clickableCard}`}
            variant="borderless"
            onClick={() => openIncidentsList({ scopeOverride: "stale" })}
          >
            <Statistic
              title="Stale Open Incidents"
              value={filteredStaleIncidents.length}
            />
            <Text className={styles.metricLabel}>At-risk backlog</Text>
          </Card>
          ) : null}
        </div>
      </div>

      <div className={styles.summaryPanel}>
        {canUseResponders ? (
        <Card className={styles.metricCard} variant="borderless">
          <Statistic title="Responders" value={respondersTotal} />
          <Text className={styles.metricLabel}>Available roster</Text>
        </Card>
        ) : null}
        {canUseAssignments ? (
        <Card className={styles.metricCard} variant="borderless">
          <Statistic
            title="Assignments In View"
            value={filteredAssignments.length}
          />
          <Text className={styles.metricLabel}>Recent dispatch activity</Text>
        </Card>
        ) : null}
        <Card className={styles.metricCard} variant="borderless">
          <Statistic title="Incidents Loaded" value={incidentsTotal} />
          <Text className={styles.metricLabel}>
            Fetched from the current list query
          </Text>
        </Card>
        {canUseCategories ? (
        <Card className={styles.metricCard} variant="borderless">
          <Statistic title="Active Categories" value={topCategories.length} />
          <Text className={styles.metricLabel}>Dominant issue clusters</Text>
        </Card>
        ) : null}
      </div>

      <Row gutter={[16, 16]}>
        {canUseLifecycle ? (
        <Col xs={24} xl={12}>
          <Card className={styles.sectionCard} variant="borderless">
            <div className={styles.sectionHeading}>
              <div>
                <Title level={4} className={styles.sectionTitle}>
                  Aging Buckets
                </Title>
                <Text className={styles.sectionDescription}>
                  Bucket open incidents by age so dispatchers can see which
                  queues are drifting.
                </Text>
              </div>
            </div>
            <div className={styles.verticalList}>
              {agingBuckets.map((bucket) => (
                <div key={bucket.key} className={styles.listRow}>
                  <div className={styles.listMeta}>
                    <Text strong>{bucket.label}</Text>
                    <Text type="secondary">{bucket.count} open incidents</Text>
                  </div>
                  <Button
                    type="link"
                    className={styles.listAction}
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
                </div>
              ))}
            </div>
          </Card>
        </Col>
        ) : null}
        {canUseCategories ? (
        <Col xs={24} xl={12}>
          <Card className={styles.sectionCard} variant="borderless">
            <div className={styles.sectionHeading}>
              <div>
                <Title level={4} className={styles.sectionTitle}>
                  Top Categories In View
                </Title>
                <Text className={styles.sectionDescription}>
                  Highlight the strongest category clusters in the current
                  dashboard context.
                </Text>
              </div>
            </div>
            <div className={styles.verticalList}>
              {topCategories.length === 0 ? (
                <Text type="secondary">
                  No category data available in this view.
                </Text>
              ) : (
                topCategories.map((category) => (
                  <div key={category.categoryId} className={styles.listRow}>
                    <div className={styles.listMeta}>
                      <Text strong>{category.label}</Text>
                      <Text type="secondary">{category.count} incidents</Text>
                    </div>
                    <Button
                      type="link"
                      className={styles.listAction}
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
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
        ) : null}
      </Row>

      <div className={styles.activityGrid}>
        <Card
          className={`${styles.sectionCard} ${styles.tableCard} ${styles.compactTable}`}
          variant="borderless"
          title={
            <div>
              <Title level={4} className={styles.sectionTitle}>
                Recent Incidents
              </Title>
              <Text className={styles.sectionDescription}>
                The newest incidents in the current scope, with status,
                assignee, and age at a glance.
              </Text>
            </div>
          }
          extra={
            <Button type="link" onClick={() => openIncidentsList()}>
              Open current view
            </Button>
          }
        >
          <ResizableTable
            rowKey="id"
            dataSource={recentIncidents}
            pagination={false}
            scroll={{ x: 980 }}
            columns={recentIncidentColumns}
            storageKey="dashboard-recent-incidents-widths"
            showColumnVisibilitySelector
            stickyEdgeColumnCount={{ left: 1 }}
            locale={{ emptyText: "No incidents available" }}
          />
        </Card>

        {canUseAssignments ? (
        <Card
          className={`${styles.sectionCard} ${styles.tableCard} ${styles.compactTable}`}
          variant="borderless"
          title={
            <div>
              <Title level={4} className={styles.sectionTitle}>
                Needs Assignment
              </Title>
              <Text className={styles.sectionDescription}>
                Unassigned open incidents, ordered by age so dispatch decisions
                stay fast.
              </Text>
            </div>
          }
          extra={
            <Button
              type="link"
              onClick={() => openIncidentsList({ scopeOverride: "unassigned" })}
            >
              Open incidents
            </Button>
          }
        >
          <ResizableTable
            rowKey="id"
            dataSource={urgentQueue}
            pagination={false}
            columns={urgentQueueColumns}
            storageKey="dashboard-urgent-queue-widths"
            showColumnVisibilitySelector
            stickyEdgeColumnCount={{ left: 1 }}
            locale={{ emptyText: "All open incidents are assigned" }}
          />
        </Card>
        ) : null}
      </div>

      {canUseAssignments ? (
      <Card
        className={`${styles.sectionCard} ${styles.tableCard} ${styles.compactTable}`}
        variant="borderless"
        title={
          <div>
            <Title level={4} className={styles.sectionTitle}>
              Recent Assignments
            </Title>
            <Text className={styles.sectionDescription}>
              The latest assignment activity that overlaps with the current
              dashboard view.
            </Text>
          </div>
        }
        extra={
          <Button type="link" onClick={() => openIncidentsList()}>
            Open incidents
          </Button>
        }
      >
        <ResizableTable
          rowKey="id"
          dataSource={filteredAssignments}
          pagination={false}
          columns={recentAssignmentsColumns}
          storageKey="dashboard-recent-assignments-widths"
          showColumnVisibilitySelector
          stickyEdgeColumnCount={{ left: 1 }}
          locale={{ emptyText: "No assignments available" }}
        />
      </Card>
      ) : null}
    </div>
  );
}
