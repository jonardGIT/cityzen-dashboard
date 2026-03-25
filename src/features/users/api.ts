import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth/token-storage";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import { adaptPaginatedResponse, type PaginatedResponse } from "@/lib/api/pagination";
import {
  buildListQueryParams,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type FetchListParams,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type { User } from "@/types/api";
import type { Role } from "@/types/auth";

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: Role;
  firstName?: string;
  lastName?: string;
}

export interface UsersCapabilities {
  canUpdateUser: boolean;
  canDeleteUser: boolean;
}

const usersApiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

usersApiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchUsers(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<User>> {
  const response = await usersApiClient.get<unknown>("/users", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<User>(response.data, fetchParams.page, fetchParams.pageSize);
}

export async function createUser(payload: CreateUserDto) {
  const response = await usersApiClient.post<unknown>("/users", payload);
  return unwrapEntityResponse<User>(response.data);
}

export async function updateUser(userId: string, payload: UpdateUserDto) {
  const response = await usersApiClient.patch<unknown>(`/users/${userId}`, payload);
  return unwrapEntityResponse<User>(response.data);
}

export async function deleteUser(userId: string) {
  await usersApiClient.delete(`/users/${userId}`);
}

export async function fetchUsersCapabilities() {
  const response = await usersApiClient.get<UsersCapabilities>("/users/capabilities");
  return response.data;
}

export function useUsersQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["users", fetchParams],
    queryFn: ({ signal }) => fetchUsers(fetchParams, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function defaultUsersQueryState(overrides?: Partial<ListQueryState>): ListQueryState {
  return {
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    ...overrides,
  };
}

export function useUsersCapabilitiesQuery(enabled = true) {
  return useQuery({
    queryKey: ["users", "capabilities"],
    queryFn: fetchUsersCapabilities,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserDto }) =>
      updateUser(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
