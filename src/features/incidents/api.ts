import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import { adaptPaginatedResponse, type PaginatedResponse } from "@/lib/api/pagination";
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
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Incident>> {
  const response = await authClient.get<unknown>("/incidents", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Incident>(response.data, page, pageSize);
}

export async function createIncident(payload: CreateIncidentDto) {
  const response = await authClient.post<unknown>("/incidents", payload);
  return unwrapEntityResponse<Incident>(response.data);
}

export function useIncidentsQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["incidents", page, pageSize],
    queryFn: ({ signal }) => fetchIncidents(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
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
