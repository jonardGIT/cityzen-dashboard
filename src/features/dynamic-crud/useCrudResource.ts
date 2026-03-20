"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
import { getCrudResource } from "@/features/dynamic-crud/config";
import {
  assertCrudSuccess,
  requestCrudEndpoint,
} from "@/features/dynamic-crud/api-client";
import type { BaseEntity } from "@/types/api";

export function useCrudResource(resourceName: string) {
  const queryClient = useQueryClient();
  const config = useMemo(() => getCrudResource(resourceName), [resourceName]);

  const listEndpoint = config?.endpoints.list;
  const getEndpoint = config?.endpoints.get;
  const createEndpoint = config?.endpoints.create;
  const updateEndpoint = config?.endpoints.update;
  const deleteEndpoint = config?.endpoints.delete;

  const listQuery = useQuery({
    queryKey: ["crud", resourceName, "list"],
    enabled: Boolean(listEndpoint),
    queryFn: async () => {
      if (!listEndpoint) {
        return [] as BaseEntity[];
      }

      const result = await requestCrudEndpoint<unknown>(listEndpoint);
      const payload = assertCrudSuccess(result);
      return unwrapListResponse<BaseEntity>(payload);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!createEndpoint) {
        throw new Error("Create operation is not configured for this resource.");
      }

      const result = await requestCrudEndpoint<unknown>(createEndpoint, { body: payload });
      const response = assertCrudSuccess(result);
      return unwrapEntityResponse<BaseEntity>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", resourceName, "list"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) => {
      if (!updateEndpoint) {
        throw new Error("Update operation is not configured for this resource.");
      }

      const result = await requestCrudEndpoint<unknown>(updateEndpoint, {
        pathParams: { id },
        body: payload,
      });
      const response = assertCrudSuccess(result);
      return unwrapEntityResponse<BaseEntity>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", resourceName, "list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (!deleteEndpoint) {
        throw new Error("Delete operation is not configured for this resource.");
      }

      const result = await requestCrudEndpoint<unknown>(deleteEndpoint, {
        pathParams: { id },
      });
      assertCrudSuccess(result);
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", resourceName, "list"] });
    },
  });

  const getById = async (id: string | number) => {
    if (!getEndpoint) {
      throw new Error("Get operation is not configured for this resource.");
    }

    const result = await requestCrudEndpoint<unknown>(getEndpoint, {
      pathParams: { id },
    });
    const payload = assertCrudSuccess(result);
    return unwrapEntityResponse<BaseEntity>(payload);
  };

  return {
    resource: config,
    listQuery,
    getById,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
