import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
import type { Incident } from "@/types/api";

export interface CreateIncidentDto {
  description: string;
  citizenId: string | number;
  locationId: string | number;
  categoryId: string | number;
  severityId: string | number;
  statusId: string | number;
}

export async function fetchIncidents() {
  const response = await authClient.get<unknown>("/incidents");
  return unwrapListResponse<Incident>(response.data);
}

export async function createIncident(payload: CreateIncidentDto) {
  const response = await authClient.post<unknown>("/incidents", payload);
  return unwrapEntityResponse<Incident>(response.data);
}

export function useIncidentsQuery() {
  return useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents });
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
