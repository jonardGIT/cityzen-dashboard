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
import type { Assignment } from "@/types/api";

export interface CreateAssignmentDto {
  incidentId: string;
  responderId: string;
  assignedDate?: string;
  responseStart?: string;
  responseEnd?: string;
  outcome?: string;
  notes?: string;
}

export async function fetchAssignments(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Assignment>> {
  const response = await authClient.get<unknown>("/assignments", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Assignment>(response.data, fetchParams.page, fetchParams.pageSize);
}

export async function createAssignment(payload: CreateAssignmentDto) {
  const response = await authClient.post<unknown>("/assignments", payload);
  return unwrapEntityResponse<Assignment>(response.data);
}

export function useAssignmentsQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["assignments", fetchParams],
    queryFn: ({ signal }) => fetchAssignments(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function defaultAssignmentsQueryState(overrides?: Partial<ListQueryState>): ListQueryState {
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

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
