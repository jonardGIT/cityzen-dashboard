import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse } from "@/lib/api/normalize";
import { adaptPaginatedResponse, type PaginatedResponse } from "@/lib/api/pagination";
import type {
  Category,
  Citizen,
  HealthResponse,
  Location,
  Responder,
  Severity,
  Status,
} from "@/types/api";

export async function fetchHealth() {
  const response = await authClient.get<unknown>("/health");
  return unwrapEntityResponse<HealthResponse>(response.data);
}

export async function fetchCitizens(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Citizen>> {
  const response = await authClient.get<unknown>("/citizens", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Citizen>(response.data, page, pageSize);
}

export async function fetchCitizenById(id: string) {
  const response = await authClient.get<unknown>(`/citizens/${id}`);
  return unwrapEntityResponse<Citizen>(response.data);
}

export async function fetchResponders(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Responder>> {
  const response = await authClient.get<unknown>("/responders", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Responder>(response.data, page, pageSize);
}

export async function fetchStatuses(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Status>> {
  const response = await authClient.get<unknown>("/statuses", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Status>(response.data, page, pageSize);
}

export async function fetchCategories(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Category>> {
  const response = await authClient.get<unknown>("/categories", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Category>(response.data, page, pageSize);
}

export async function fetchSeverities(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Severity>> {
  const response = await authClient.get<unknown>("/severities", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Severity>(response.data, page, pageSize);
}

export async function fetchLocations(
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Location>> {
  const response = await authClient.get<unknown>("/locations", {
    params: { page, pageSize },
    signal,
  });
  return adaptPaginatedResponse<Location>(response.data, page, pageSize);
}

export function useHealthQuery() {
  return useQuery({ queryKey: ["health"], queryFn: fetchHealth });
}

export function useCitizensQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["citizens", page, pageSize],
    queryFn: ({ signal }) => fetchCitizens(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}

export function useCitizenQuery(id: string) {
  return useQuery({
    queryKey: ["citizens", id],
    queryFn: () => fetchCitizenById(id),
    enabled: Boolean(id),
  });
}

export function useRespondersQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["responders", page, pageSize],
    queryFn: ({ signal }) => fetchResponders(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}

export function useStatusesQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["statuses", page, pageSize],
    queryFn: ({ signal }) => fetchStatuses(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}

export function useCategoriesQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["categories", page, pageSize],
    queryFn: ({ signal }) => fetchCategories(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}

export function useSeveritiesQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["severities", page, pageSize],
    queryFn: ({ signal }) => fetchSeverities(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}

export function useLocationsQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["locations", page, pageSize],
    queryFn: ({ signal }) => fetchLocations(page, pageSize, signal),
    placeholderData: (previous) => previous,
  });
}
