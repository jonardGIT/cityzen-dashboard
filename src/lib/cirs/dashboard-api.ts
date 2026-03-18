import type {
  Assignment,
  Citizen,
  Incident,
  Responder,
  Severity,
  Status,
  User,
  Category,
} from "@/lib/cirs/types";

interface HealthResponse {
  status: string;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

interface CreateCitizenPayload {
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

interface CreateIncidentPayload {
  description?: string;
  citizenId?: string | number;
  locationId?: string | number;
  categoryId?: string | number;
  severityId?: string | number;
  statusId?: string | number;
}

interface CreateAssignmentPayload {
  incidentId?: string | number;
  responderId?: string | number;
  statusId?: string | number;
  notes?: string;
}

export class DashboardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

function buildEndpointUrl(endpoint: string): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${normalizedEndpoint}`;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (!API_KEY) {
    throw new DashboardApiError("NEXT_PUBLIC_API_KEY is not configured.", 0);
  }

  const response = await fetch(buildEndpointUrl(endpoint), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed with ${response.status}`;

    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        message = parsed.message ?? parsed.error ?? message;
      } catch {
        // Keep raw text message when payload is not JSON.
      }
    }

    throw new DashboardApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const dashboardApi = {
  getHealth: () => apiRequest<HealthResponse>("/health"),
  listCitizens: () => apiRequest<Citizen[]>("/citizens"),
  listResponders: () => apiRequest<Responder[]>("/responders"),
  listIncidents: () => apiRequest<Incident[]>("/incidents"),
  listAssignments: () => apiRequest<Assignment[]>("/assignments"),
  listUsers: () => apiRequest<User[]>("/users"),
  listStatuses: () => apiRequest<Status[]>("/statuses"),
  listCategories: () => apiRequest<Category[]>("/categories"),
  listSeverities: () => apiRequest<Severity[]>("/severities"),

  createCitizen: (payload: CreateCitizenPayload) =>
    apiRequest<Citizen>("/citizens", { method: "POST", body: payload }),
  createIncident: (payload: CreateIncidentPayload) =>
    apiRequest<Incident>("/incidents", { method: "POST", body: payload }),
  createAssignment: (payload: CreateAssignmentPayload) =>
    apiRequest<Assignment>("/assignments", { method: "POST", body: payload }),
};
