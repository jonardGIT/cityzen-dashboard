import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import {
  buildListQueryParams,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type FetchListParams,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { Incident } from "@/types/api";

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

export async function fetchIncidentById(id: string, signal?: AbortSignal) {
  const response = await authClient.get<unknown>(`/incidents/${id}`, {
    signal,
  });
  return unwrapEntityResponse<Incident>(response.data);
}

export async function createIncident(payload: CreateIncidentDto) {
  const response = await authClient.post<unknown>("/incidents", payload);
  return unwrapEntityResponse<Incident>(response.data);
}

export async function updateIncident(id: string, payload: UpdateIncidentDto) {
  const response = await authClient.patch<unknown>(`/incidents/${id}`, payload);
  return unwrapEntityResponse<Incident>(response.data);
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
