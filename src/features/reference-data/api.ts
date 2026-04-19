import { useQuery } from "@tanstack/react-query";
import { authClient, publicClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import {
  buildListQueryParams,
  type FetchListParams,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import type {
  Category,
  Citizen,
  HealthResponse,
  Responder,
  Severity,
  Status,
} from "@/types/api";

export async function fetchHealth() {
  const response = await publicClient.get<unknown>("/health");
  return unwrapEntityResponse<HealthResponse>(response.data);
}

export async function fetchCitizens(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Citizen>> {
  const response = await authClient.get<unknown>("/citizens", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Citizen>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchCitizenById(id: string) {
  const response = await authClient.get<unknown>(`/citizens/${id}`);
  return unwrapEntityResponse<Citizen>(response.data);
}

export async function fetchResponders(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Responder>> {
  const response = await authClient.get<unknown>("/responders", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Responder>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchStatuses(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Status>> {
  const response = await authClient.get<unknown>("/statuses", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Status>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchCategories(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Category>> {
  const response = await authClient.get<unknown>("/categories", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Category>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export async function fetchSeverities(
  fetchParams: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Severity>> {
  const response = await authClient.get<unknown>("/severities", {
    params: buildListQueryParams(fetchParams),
    signal,
  });
  return adaptPaginatedResponse<Severity>(
    response.data,
    fetchParams.page,
    fetchParams.pageSize,
  );
}

export function useHealthQuery() {
  return useQuery({ queryKey: ["health"], queryFn: fetchHealth });
}

export function useCitizensQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["citizens", fetchParams],
    queryFn: ({ signal }) => fetchCitizens(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useCitizenQuery(id: string) {
  return useQuery({
    queryKey: ["citizens", id],
    queryFn: () => fetchCitizenById(id),
    enabled: Boolean(id),
  });
}

export function useRespondersQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["responders", fetchParams],
    queryFn: ({ signal }) => fetchResponders(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useStatusesQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["statuses", fetchParams],
    queryFn: ({ signal }) => fetchStatuses(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useCategoriesQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["categories", fetchParams],
    queryFn: ({ signal }) => fetchCategories(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useSeveritiesQuery(state: ListQueryState, enabled = true) {
  const fetchParams = state;
  return useQuery({
    queryKey: ["severities", fetchParams],
    queryFn: ({ signal }) => fetchSeverities(fetchParams, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
}
