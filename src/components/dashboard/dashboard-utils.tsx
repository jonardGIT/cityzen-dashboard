import { Tag } from "antd";
import type { TableProps } from "antd";
import { DashboardApiError } from "@/lib/cirs/dashboard-api";
import type {
  AssignmentTableRow,
  CitizenTableRow,
  DashboardData,
  IncidentTableRow,
  ResponderTableRow,
  UserTableRow,
} from "@/components/dashboard/types";

function toLabel(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function createLookup(
  items: Array<{ id: string | number; name?: string }>,
): Record<string, string> {
  return items.reduce<Record<string, string>>((acc, item) => {
    acc[String(item.id)] = toLabel(item.name, `#${item.id}`);
    return acc;
  }, {});
}

function createPersonLookup(
  items: Array<{ id: string | number; firstName?: string; lastName?: string }>,
): Record<string, string> {
  return items.reduce<Record<string, string>>((acc, item) => {
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim();
    acc[String(item.id)] = fullName.length > 0 ? fullName : `#${item.id}`;
    return acc;
  }, {});
}

export function getDashboardError(error: unknown): string {
  if (error instanceof DashboardApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Authentication failed. Check NEXT_PUBLIC_API_KEY and backend API key settings.";
    }

    if (error.status === 429) {
      return "Rate limit exceeded by backend API. Retry after a short delay.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load data from API.";
}

export function buildIncidentRows(data: DashboardData): IncidentTableRow[] {
  const statusById = createLookup(data.statuses);
  const severityById = createLookup(data.severities);
  const categoryById = createLookup(data.categories);

  return data.incidents.map((incident) => {
    const id = String(incident.id);
    const title = toLabel(incident.title ?? incident.description, `Incident ${id}`);
    const status = statusById[String(incident.statusId)] ?? "Unknown";
    const severity = severityById[String(incident.severityId)] ?? "Unknown";
    const category = categoryById[String(incident.categoryId)] ?? "Unknown";
    const timestamp =
      typeof incident.updatedAt === "string"
        ? incident.updatedAt
        : typeof incident.createdAt === "string"
          ? incident.createdAt
          : typeof incident.dateReported === "string"
            ? incident.dateReported
            : undefined;

    return {
      key: id,
      id,
      title,
      status,
      severity,
      category,
      updatedAt: typeof timestamp === "string" ? new Date(timestamp).toLocaleString() : "N/A",
    };
  });
}

export function buildCitizenRows(data: DashboardData): CitizenTableRow[] {
  return data.citizens.map((citizen) => {
    const id = String(citizen.id);
    const fallbackName = [citizen.firstName, citizen.lastName].filter(Boolean).join(" ").trim();

    return {
      key: id,
      id,
      name: toLabel(citizen.name, fallbackName.length > 0 ? fallbackName : `Citizen ${id}`),
      contactInfo: toLabel(citizen.contactInfo ?? citizen.email, "N/A"),
      preferredChannel: toLabel(citizen.preferredChannel, "N/A"),
    };
  });
}

export function buildAssignmentRows(data: DashboardData): AssignmentTableRow[] {
  const statusById = createLookup(data.statuses);
  const responderById = createPersonLookup(data.responders);

  return data.assignments.map((assignment) => {
    const id = String(assignment.id);

    return {
      key: id,
      id,
      incidentId: String(assignment.incidentId ?? "N/A"),
      responder: responderById[String(assignment.responderId)] ?? "Unassigned",
      status: statusById[String(assignment.statusId)] ?? "Unknown",
      assignedAt:
        typeof assignment.assignedDate === "string"
          ? new Date(assignment.assignedDate).toLocaleString()
          : "N/A",
      notes: toLabel(assignment.notes, "-"),
    };
  });
}

export function buildResponderRows(data: DashboardData): ResponderTableRow[] {
  return data.responders.map((responder) => {
    const id = String(responder.id);
    const name = [responder.firstName, responder.lastName].filter(Boolean).join(" ").trim();

    return {
      key: id,
      id,
      name: name.length > 0 ? name : `Responder ${id}`,
      email: toLabel(responder.email, "N/A"),
      phoneNumber: toLabel(responder.phoneNumber, "N/A"),
    };
  });
}

export function buildUserRows(data: DashboardData): UserTableRow[] {
  return data.users.map((user) => {
    const id = String(user.id);
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

    return {
      key: id,
      id,
      name: name.length > 0 ? name : `User ${id}`,
      email: toLabel(user.email, "N/A"),
      role: toLabel(user.role, "N/A"),
    };
  });
}

export const incidentColumns: TableProps<IncidentTableRow>["columns"] = [
  { title: "Incident ID", dataIndex: "id", key: "id", width: 120 },
  { title: "Title", dataIndex: "title", key: "title" },
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
  { title: "Category", dataIndex: "category", key: "category" },
  { title: "Last Updated", dataIndex: "updatedAt", key: "updatedAt" },
];

export const citizenColumns: TableProps<CitizenTableRow>["columns"] = [
  { title: "Citizen ID", dataIndex: "id", key: "id", width: 120 },
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Contact Info", dataIndex: "contactInfo", key: "contactInfo" },
  {
    title: "Preferred Channel",
    dataIndex: "preferredChannel",
    key: "preferredChannel",
  },
];

export const assignmentColumns: TableProps<AssignmentTableRow>["columns"] = [
  { title: "Assignment ID", dataIndex: "id", key: "id", width: 140 },
  { title: "Incident ID", dataIndex: "incidentId", key: "incidentId", width: 120 },
  { title: "Responder", dataIndex: "responder", key: "responder" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (value: string) => <Tag color="blue">{value}</Tag>,
  },
  { title: "Assigned At", dataIndex: "assignedAt", key: "assignedAt" },
  { title: "Notes", dataIndex: "notes", key: "notes" },
];

export const responderColumns: TableProps<ResponderTableRow>["columns"] = [
  { title: "Responder ID", dataIndex: "id", key: "id", width: 140 },
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Phone", dataIndex: "phoneNumber", key: "phoneNumber" },
];

export const userColumns: TableProps<UserTableRow>["columns"] = [
  { title: "User ID", dataIndex: "id", key: "id", width: 120 },
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Email", dataIndex: "email", key: "email" },
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    render: (value: string) => <Tag color="geekblue">{value}</Tag>,
  },
];
