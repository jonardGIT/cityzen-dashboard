import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { createAuthenticatedClient } from "@/lib/api/clients";
import type { ApiErrorPayload } from "@/types/api";
import type { AdminSessionInventoryRecord } from "@/types/auth";

const ADMIN_SESSION_INVENTORY_QUERY_KEY = ["admin-session-inventory"] as const;
const adminSessionInventoryClient = createAuthenticatedClient(
  "/api/dashboard/admin",
);

export interface AdminSessionInventoryApiError {
  status: number;
  message: string;
  details?: ApiErrorPayload;
}

export class AdminSessionInventoryApiClientError extends Error {
  status: number;
  details?: ApiErrorPayload;

  constructor(error: AdminSessionInventoryApiError) {
    super(error.message);
    this.name = "AdminSessionInventoryApiClientError";
    this.status = error.status;
    this.details = error.details;
  }
}

function normalizeAdminSessionInventoryError(
  error: unknown,
  fallback: string,
): AdminSessionInventoryApiError {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const payload = axiosError.response?.data;

  return {
    status: axiosError.response?.status ?? 500,
    message: payload?.message ?? axiosError.message ?? fallback,
    details: payload,
  };
}

export async function fetchAdminSessionInventory(
  signal?: AbortSignal,
): Promise<AdminSessionInventoryRecord[]> {
  try {
    const response = await adminSessionInventoryClient.get<
      AdminSessionInventoryRecord[]
    >("/session-inventory", { signal });
    return response.data;
  } catch (error) {
    throw new AdminSessionInventoryApiClientError(
      normalizeAdminSessionInventoryError(
        error,
        "Failed to fetch session inventory.",
      ),
    );
  }
}

export async function revokeAdminSessionInventoryEntry(
  sessionId: string,
): Promise<void> {
  try {
    await adminSessionInventoryClient.delete(`/session-inventory/${sessionId}`);
  } catch (error) {
    throw new AdminSessionInventoryApiClientError(
      normalizeAdminSessionInventoryError(error, "Failed to revoke session."),
    );
  }
}

export function useAdminSessionInventoryQuery(enabled = true) {
  return useQuery({
    queryKey: ADMIN_SESSION_INVENTORY_QUERY_KEY,
    queryFn: ({ signal }) => fetchAdminSessionInventory(signal),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useRevokeAdminSessionInventoryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAdminSessionInventoryEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_SESSION_INVENTORY_QUERY_KEY,
      });
    },
  });
}
