import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import { adaptPaginatedResponse, type PaginatedResponse } from "@/lib/api/pagination";
import type { Assignment } from "@/types/api";

export interface CreateAssignmentDto {
  incidentId: string | number;
  responderId: string | number;
  statusId?: string | number;
  notes?: string;
}

export async function fetchAssignments(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Assignment>> {
  const response = await authClient.get<unknown>("/assignments", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Assignment>(response.data, page, pageSize);
}

export async function createAssignment(payload: CreateAssignmentDto) {
  const response = await authClient.post<unknown>("/assignments", payload);
  return unwrapEntityResponse<Assignment>(response.data);
}

export function useAssignmentsQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["assignments", page, pageSize],
    queryFn: ({ signal }) => fetchAssignments(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
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
