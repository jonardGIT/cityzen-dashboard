import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAuthenticatedClient } from "@/lib/api/clients";
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
import { normalizeCapabilities } from "@/lib/auth/roles";
import type { JurisdictionType, User } from "@/types/api";
import type { Role, UserCapabilities } from "@/types/auth";

export type UserJurisdictionInputType = JurisdictionType | "municipality";

export const userQueryKeys = {
  all: () => ["users"] as const,
  list: (fetchParams: FetchListParams) =>
    ["users", "list", fetchParams] as const,
  detail: (userId: string) => ["users", "detail", userId] as const,
  capabilities: () => ["users", "capabilities"] as const,
};

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  jurisdictionType?: UserJurisdictionInputType;
  jurisdictionId?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  jurisdictionType?: UserJurisdictionInputType;
  jurisdictionId?: string;
}

export type UsersCapabilities = UserCapabilities;

const usersApiClient = createAuthenticatedClient("/api");

export async function fetchUsers(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<User>> {
  const response = await usersApiClient.get<unknown>("/users", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<User>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function createUser(payload: CreateUserDto) {
  const response = await usersApiClient.post<unknown>("/users", payload);
  return unwrapEntityResponse<User>(response.data);
}

export async function fetchUserById(userId: string, signal?: AbortSignal) {
  const response = await usersApiClient.get<unknown>(`/users/${userId}`, {
    signal,
  });
  return unwrapEntityResponse<User>(response.data);
}

export async function updateUser(userId: string, payload: UpdateUserDto) {
  const response = await usersApiClient.patch<unknown>(
    `/users/${userId}`,
    payload,
  );
  return unwrapEntityResponse<User>(response.data);
}

export async function deleteUser(userId: string) {
  await usersApiClient.delete(`/users/${userId}`);
}

export async function restoreUser(userId: string) {
  const response = await usersApiClient.post<unknown>(
    `/users/${userId}/restore`,
  );
  return unwrapEntityResponse<User>(response.data);
}

export async function fetchUsersCapabilities() {
  const response = await usersApiClient.get<unknown>("/users/capabilities");
  return normalizeCapabilities(response.data);
}

export function useUsersQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: userQueryKeys.list(fetchParams),
    queryFn: ({ signal }) => fetchUsers(fetchParams, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useUserQuery(userId?: string, enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.detail(userId ?? ""),
    queryFn: ({ signal }) => fetchUserById(userId!, signal),
    enabled: enabled && Boolean(userId),
  });
}

export function defaultUsersQueryState(
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

export function useUsersCapabilitiesQuery(enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.capabilities(),
    queryFn: fetchUsersCapabilities,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all() }),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateUserDto;
    }) => updateUser(userId, payload),
    onSuccess: (user) => {
      queryClient.setQueryData(userQueryKeys.detail(user.id), user);
      return queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (_, userId) => {
      queryClient.removeQueries({ queryKey: userQueryKeys.detail(userId) });
      return queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
    },
  });
}

export function useRestoreUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => restoreUser(userId),
    onSuccess: (user) => {
      queryClient.setQueryData(userQueryKeys.detail(user.id), user);
      return queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
    },
  });
}
