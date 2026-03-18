import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api/clients";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
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

export async function fetchCitizens() {
  const response = await authClient.get<unknown>("/citizens");
  return unwrapListResponse<Citizen>(response.data);
}

export async function fetchCitizenById(id: string) {
  const response = await authClient.get<unknown>(`/citizens/${id}`);
  return unwrapEntityResponse<Citizen>(response.data);
}

export async function fetchResponders() {
  const response = await authClient.get<unknown>("/responders");
  return unwrapListResponse<Responder>(response.data);
}

export async function fetchStatuses() {
  const response = await authClient.get<unknown>("/statuses");
  return unwrapListResponse<Status>(response.data);
}

export async function fetchCategories() {
  const response = await authClient.get<unknown>("/categories");
  return unwrapListResponse<Category>(response.data);
}

export async function fetchSeverities() {
  const response = await authClient.get<unknown>("/severities");
  return unwrapListResponse<Severity>(response.data);
}

export async function fetchLocations() {
  const response = await authClient.get<unknown>("/locations");
  return unwrapListResponse<Location>(response.data);
}

export function useHealthQuery() {
  return useQuery({ queryKey: ["health"], queryFn: fetchHealth });
}

export function useCitizensQuery() {
  return useQuery({ queryKey: ["citizens"], queryFn: fetchCitizens });
}

export function useCitizenQuery(id: string) {
  return useQuery({
    queryKey: ["citizens", id],
    queryFn: () => fetchCitizenById(id),
    enabled: Boolean(id),
  });
}

export function useRespondersQuery() {
  return useQuery({ queryKey: ["responders"], queryFn: fetchResponders });
}

export function useStatusesQuery() {
  return useQuery({ queryKey: ["statuses"], queryFn: fetchStatuses });
}

export function useCategoriesQuery() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

export function useSeveritiesQuery() {
  return useQuery({ queryKey: ["severities"], queryFn: fetchSeverities });
}

export function useLocationsQuery() {
  return useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
}
