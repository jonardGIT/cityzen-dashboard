import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
import type { Assignment } from "@/types/api";

export interface CreateAssignmentDto {
  incidentId: string | number;
  responderId: string | number;
  statusId?: string | number;
  notes?: string;
}

export async function fetchAssignments() {
  const response = await authClient.get<unknown>("/assignments");
  return unwrapListResponse<Assignment>(response.data);
}

export async function createAssignment(payload: CreateAssignmentDto) {
  const response = await authClient.post<unknown>("/assignments", payload);
  return unwrapEntityResponse<Assignment>(response.data);
}

export function useAssignmentsQuery() {
  return useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments });
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
