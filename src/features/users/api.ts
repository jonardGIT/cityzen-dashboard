import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
import type { User } from "@/types/api";
import type { Role } from "@/types/auth";

export interface CreateUserDto {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export async function fetchUsers() {
  const response = await authClient.get<unknown>("/admin/users");
  return unwrapListResponse<User>(response.data);
}

export async function createUser(payload: CreateUserDto) {
  const response = await authClient.post<unknown>("/admin/users", payload);
  return unwrapEntityResponse<User>(response.data);
}

export function useUsersQuery(enabled = true) {
  return useQuery({ queryKey: ["users"], queryFn: fetchUsers, enabled });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
