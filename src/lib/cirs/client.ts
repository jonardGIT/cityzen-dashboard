import {
  CIRS_API_BASE_PATH,
  CIRS_API_BASE_URL,
  CIRS_API_KEY,
  type CirsResource,
} from "@/lib/cirs/constants";
import { unwrapEntityResponse, unwrapListResponse } from "@/lib/api/normalize";
import { ApiHttpError } from "@/lib/cirs/errors";
import type { ApiErrorPayload, BaseEntity, RateLimitMeta } from "@/lib/cirs/types";

function parseNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readRateLimitHeaders(headers: Headers): RateLimitMeta | undefined {
  const meta: RateLimitMeta = {
    limit: parseNumber(headers.get("X-RateLimit-Limit")),
    remaining: parseNumber(headers.get("X-RateLimit-Remaining")),
    reset: parseNumber(headers.get("X-RateLimit-Reset")),
    retryAfter: parseNumber(headers.get("Retry-After")),
  };

  if (
    meta.limit === undefined &&
    meta.remaining === undefined &&
    meta.reset === undefined &&
    meta.retryAfter === undefined
  ) {
    return undefined;
  }

  return meta;
}

function buildUrl(resource: CirsResource, id?: string | number): string {
  const base = `${CIRS_API_BASE_URL}${CIRS_API_BASE_PATH}/${resource}`;
  return id === undefined ? base : `${base}/${id}`;
}

async function parseJsonBody<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined;
  }

  return (await response.json()) as T;
}

async function request<T>(
  resource: CirsResource,
  init?: RequestInit,
  id?: string | number,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (CIRS_API_KEY) {
    headers.set("x-api-key", CIRS_API_KEY);
  }

  const response = await fetch(buildUrl(resource, id), {
    ...init,
    headers,
    cache: "no-store",
  });

  const rateLimit = readRateLimitHeaders(response.headers);

  if (!response.ok) {
    const payload = await parseJsonBody<ApiErrorPayload>(response);
    const message = payload?.message ?? payload?.error ?? `Request failed with ${response.status}`;
    throw new ApiHttpError(message, response.status, payload, rateLimit);
  }

  const body = await parseJsonBody<T>(response);

  if (body === undefined) {
    throw new ApiHttpError("Expected JSON response body.", 500, undefined, rateLimit);
  }

  return body;
}

export const cirsApi = {
  async list<T extends BaseEntity>(resource: CirsResource): Promise<T[]> {
    const response = await request<unknown>(resource, { method: "GET" });
    return unwrapListResponse<T>(response);
  },

  async getById<T extends BaseEntity>(
    resource: CirsResource,
    id: string | number,
  ): Promise<T> {
    const response = await request<unknown>(resource, { method: "GET" }, id);
    return unwrapEntityResponse<T>(response);
  },

  async create<TResponse, TPayload>(
    resource: CirsResource,
    payload: TPayload,
  ): Promise<TResponse> {
    const response = await request<unknown>(
      resource,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      undefined,
    );

    return unwrapEntityResponse<TResponse>(response);
  },
};
