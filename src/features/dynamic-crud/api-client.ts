import type { AxiosError, AxiosRequestConfig } from "axios";
import { authClient, publicClient } from "@/lib/api/clients";
import type { ApiErrorPayload } from "@/types/api";
import type { CrudEndpoint, NormalizedApiResult } from "@/features/dynamic-crud/types";

export class CrudRequestError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function replacePathParams(path: string, params?: Record<string, string | number>): string {
  if (!params) {
    return path;
  }

  return path.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter: ${key}`);
    }

    return encodeURIComponent(String(value));
  });
}

function parseAxiosError(error: AxiosError<ApiErrorPayload>) {
  const status = error.response?.status ?? 500;
  const payload = error.response?.data;
  const message = payload?.message ?? payload?.error ?? error.message ?? "Request failed";
  return { status, message, details: payload };
}

export async function requestCrudEndpoint<TResponse = unknown>(
  endpoint: CrudEndpoint,
  options?: {
    pathParams?: Record<string, string | number>;
    queryParams?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
    body?: unknown;
  },
): Promise<NormalizedApiResult<TResponse>> {
  const client = endpoint.authRequired ? authClient : publicClient;
  const url = replacePathParams(endpoint.path, options?.pathParams);

  const config: AxiosRequestConfig = {
    url,
    method: endpoint.method,
    params: options?.queryParams,
    signal: options?.signal,
    data: options?.body,
  };

  try {
    const response = await client.request<TResponse>(config);
    return {
      success: true,
      data: response.data,
      error: null,
    };
  } catch (rawError) {
    const error = rawError as AxiosError<ApiErrorPayload>;
    const parsed = parseAxiosError(error);

    return {
      success: false,
      data: null,
      error: {
        status: parsed.status,
        message: parsed.message,
        details: parsed.details,
      },
    };
  }
}

export function assertCrudSuccess<T>(result: NormalizedApiResult<T>): T {
  if (!result.success || !result.data) {
    const status = result.error?.status ?? 500;
    const message = result.error?.message ?? "Request failed";
    throw new CrudRequestError(status, message, result.error?.details);
  }

  return result.data;
}
