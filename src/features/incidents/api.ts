import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import {
  assertCrudSuccess,
  requestCrudEndpoint,
} from "@/features/dynamic-crud/api-client";
import { getCrudEndpoint } from "@/features/dynamic-crud/config";
import {
  buildListQueryParams,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type FetchListParams,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { Incident } from "@/types/api";

type UnknownRecord = Record<string, unknown>;

export interface IncidentMediaReference {
  mediaId?: string;
  fallbackUrl?: string;
}

export interface AuditorIncident {
  id: string;
  publicReference: string;
  status: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    subCategory?: string | null;
  };
  severity: {
    id: string;
    level: string;
    definition?: string | null;
  };
  dateReported: string;
  createdAt: string;
  updatedAt: string;
  barangay: string | null;
  cityName: string | null;
  provinceName: string | null;
  regionName: string | null;
  hasMedia: boolean;
  assignmentCount: number;
  statusHistoryCount: number;
}

export interface IncidentTimelineStatus {
  id: string;
  name: string;
}

export interface IncidentTimelineActor {
  id: string;
  email: string;
  role: string;
}

export interface IncidentTimelineEntry {
  id: string;
  changedAt: string;
  fromStatus: IncidentTimelineStatus | null;
  toStatus: IncidentTimelineStatus;
  changedByUser: IncidentTimelineActor | null;
  note: string | null;
}

export interface AuditorIncidentTimelineEntry {
  id: string;
  changedAt: string;
  fromStatus: IncidentTimelineStatus | null;
  toStatus: IncidentTimelineStatus;
}

export interface IncidentTimelineResponse {
  incidentId: string;
  publicReference: string;
  timeline: IncidentTimelineEntry[];
}

export interface AuditorIncidentTimelineResponse {
  incidentId: string;
  publicReference: string;
  timeline: AuditorIncidentTimelineEntry[];
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function firstNonEmptyString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

export function getIncidentMediaReference(
  incident: Incident,
): IncidentMediaReference {
  const record = incident as UnknownRecord;
  const nestedMedia = asRecord(record.media);
  const collectionCandidates = [
    record.mediaItems,
    record.attachments,
    record.media,
  ];
  const firstCollectionItem = collectionCandidates
    .find((value) => Array.isArray(value))
    ?.find((value) => asRecord(value)) as UnknownRecord | undefined;

  return {
    mediaId: firstNonEmptyString([
      record.mediaId,
      nestedMedia?.id,
      firstCollectionItem?.id,
    ]),
    fallbackUrl: firstNonEmptyString([
      record.mediaUrl,
      nestedMedia?.url,
      nestedMedia?.mediaUrl,
      nestedMedia?.accessUrl,
      firstCollectionItem?.url,
      firstCollectionItem?.mediaUrl,
      firstCollectionItem?.accessUrl,
    ]),
  };
}

export function normalizeIncidentMediaAccessUrl(
  payload: unknown,
): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const url = normalizeIncidentMediaAccessUrl(entry);
      if (url) {
        return url;
      }
    }

    return null;
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const directUrl = firstNonEmptyString([
    record.url,
    record.accessUrl,
    record.mediaUrl,
    record.signedUrl,
    record.downloadUrl,
    record.href,
  ]);

  if (directUrl) {
    return directUrl;
  }

  return normalizeIncidentMediaAccessUrl(record.data);
}

export interface CreateIncidentDto {
  description: string;
  mediaUrl?: string;
  dateReported?: string;
  citizenId: string;
  categoryId: string;
  severityId: string;
  statusId: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
}

export interface UpdateIncidentDto {
  description?: string;
  mediaUrl?: string;
  dateReported?: string;
  citizenId?: string;
  categoryId?: string;
  severityId?: string;
  statusId?: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
}

export interface ReportIncidentDto {
  description: string;
  dateReported?: string;
  categoryId: string;
  severityId: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
}

export async function fetchIncidents(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Incident>> {
  const response = await authClient.get<unknown>("/incidents", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Incident>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchAuditorIncidents(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AuditorIncident>> {
  const response = await authClient.get<unknown>("/incidents/audit", {
    params: buildListQueryParams(fetchParams),
    signal,
  });

  return adaptPaginatedResponse<AuditorIncident>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchIncidentById(id: string, signal?: AbortSignal) {
  const response = await authClient.get<unknown>(`/incidents/${id}`, {
    signal,
  });
  return unwrapEntityResponse<Incident>(response.data);
}

export async function fetchAuditorIncidentById(
  id: string,
  signal?: AbortSignal,
) {
  const response = await authClient.get<unknown>(`/incidents/audit/${id}`, {
    signal,
  });

  return unwrapEntityResponse<AuditorIncident>(response.data);
}

export async function fetchIncidentTimeline(id: string, signal?: AbortSignal) {
  const response = await authClient.get<unknown>(`/incidents/${id}/timeline`, {
    signal,
  });

  return unwrapEntityResponse<IncidentTimelineResponse>(response.data);
}

export async function fetchAuditorIncidentTimeline(
  id: string,
  signal?: AbortSignal,
) {
  const response = await authClient.get<unknown>(
    `/incidents/audit/${id}/timeline`,
    {
      signal,
    },
  );

  return unwrapEntityResponse<AuditorIncidentTimelineResponse>(response.data);
}

export async function createIncident(payload: CreateIncidentDto) {
  const response = await authClient.post<unknown>("/incidents", payload);
  return unwrapEntityResponse<Incident>(response.data);
}

export async function reportIncident(payload: ReportIncidentDto) {
  const endpoint = getCrudEndpoint("incidents", "report");

  if (!endpoint) {
    throw new Error("Incident reporting is not configured.");
  }

  const result = await requestCrudEndpoint<unknown>(endpoint, {
    body: payload,
  });

  return unwrapEntityResponse<Incident>(assertCrudSuccess(result));
}

export async function updateIncident(id: string, payload: UpdateIncidentDto) {
  const response = await authClient.patch<unknown>(`/incidents/${id}`, payload);
  return unwrapEntityResponse<Incident>(response.data);
}

export async function fetchIncidentMediaAccessUrl(
  incidentId: string,
  mediaId: string,
): Promise<string> {
  const endpoint = getCrudEndpoint("incidents", "mediaAccess");

  if (!endpoint) {
    throw new Error("Incident media access is not configured.");
  }

  const result = await requestCrudEndpoint<unknown>(endpoint, {
    pathParams: {
      id: incidentId,
      mediaId,
    },
  });
  const payload = assertCrudSuccess(result);
  const url = normalizeIncidentMediaAccessUrl(payload);

  if (!url) {
    throw new Error("Incident media access did not return a usable URL.");
  }

  return url;
}

export async function uploadIncidentMedia(file: File): Promise<string> {
  const endpoint = getCrudEndpoint("incidents", "mediaUpload");

  if (!endpoint) {
    throw new Error("Incident media upload is not configured.");
  }

  const body = new FormData();
  body.append("file", file);

  const result = await requestCrudEndpoint<unknown>(endpoint, {
    body,
  });
  const payload = assertCrudSuccess(result);
  const url = normalizeIncidentMediaAccessUrl(payload);

  if (!url) {
    throw new Error("Incident media upload did not return a usable URL.");
  }

  return url;
}

export function useIncidentsQuery(state: ListQueryState) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["incidents", fetchParams],
    queryFn: ({ signal }) => fetchIncidents(fetchParams, signal),
    placeholderData: (previous) => previous,
  });
}

export function useIncidentQuery(id: string) {
  return useQuery({
    queryKey: ["incidents", id],
    queryFn: ({ signal }) => fetchIncidentById(id, signal),
    enabled: Boolean(id),
  });
}

export function defaultIncidentsQueryState(
  overrides?: Partial<ListQueryState>,
): ListQueryState {
  return {
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
    ...overrides,
  };
}

export function useCreateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReportIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIncidentDto }) =>
      updateIncident(id, payload),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.setQueryData(["incidents", String(incident.id)], incident);
    },
  });
}
