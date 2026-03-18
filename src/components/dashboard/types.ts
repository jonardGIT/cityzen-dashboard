import type {
  Assignment,
  Category,
  Citizen,
  Incident,
  Responder,
  Severity,
  Status,
  User,
} from "@/lib/cirs/types";

export type NavKey =
  | "overview"
  | "incidents"
  | "citizens"
  | "assignments"
  | "responders"
  | "users";

export interface DashboardData {
  healthStatus: string;
  citizens: Citizen[];
  incidents: Incident[];
  assignments: Assignment[];
  responders: Responder[];
  statuses: Status[];
  categories: Category[];
  severities: Severity[];
  users: User[];
}

export interface CitizenFormValues {
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

export interface IncidentTableRow {
  key: string;
  id: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  updatedAt: string;
}

export interface CitizenTableRow {
  key: string;
  id: string;
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

export interface AssignmentTableRow {
  key: string;
  id: string;
  incidentId: string;
  responder: string;
  status: string;
  assignedAt: string;
  notes: string;
}

export interface ResponderTableRow {
  key: string;
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface UserTableRow {
  key: string;
  id: string;
  name: string;
  email: string;
  role: string;
}
