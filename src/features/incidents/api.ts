import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import { adaptPaginatedResponse, type PaginatedResponse } from "@/lib/api/pagination";
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
  citizenId: string | number;
  locationId: string | number;
  categoryId: string | number;
  severityId: string | number;
  statusId: string | number;
}

export async function fetchIncidents(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Incident>> {
  const response = await authClient.get<unknown>("/incidents", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Incident>(response.data, fetchParams.page, fetchParams.pageSize);
}

export async function createIncident(payload: CreateIncidentDto) {
  const response = await authClient.post<unknown>("/incidents", payload);
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

export function defaultIncidentsQueryState(overrides?: Partial<ListQueryState>): ListQueryState {
  return {
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
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
