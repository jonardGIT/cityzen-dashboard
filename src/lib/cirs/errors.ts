import type { ApiErrorPayload, RateLimitMeta } from "@/lib/cirs/types";

export class ApiHttpError extends Error {
  status: number;
  payload?: ApiErrorPayload;
  rateLimit?: RateLimitMeta;

  constructor(
    message: string,
    status: number,
    payload?: ApiErrorPayload,
    rateLimit?: RateLimitMeta,
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.payload = payload;
    this.rateLimit = rateLimit;
  }
}

export function getFriendlyApiError(error: unknown): string {
  if (!(error instanceof ApiHttpError)) {
    return "Unable to reach CIRS API. Please check backend availability.";
  }

  if (error.status === 401) {
    return "Authentication failed. Verify the CIRS API key configuration.";
  }

  if (error.status === 403) {
    return "You do not have access to this CIRS API resource.";
  }

  if (error.status === 404) {
    return "Requested CIRS resource was not found.";
  }

  if (error.status === 422) {
    return "Validation failed for this API request.";
  }

  if (error.status === 429) {
    const retryAfter = error.rateLimit?.retryAfter;

    if (typeof retryAfter === "number") {
      return `Rate limit exceeded. Retry after ${retryAfter} seconds.`;
    }

    return "Rate limit exceeded. Please retry shortly.";
  }

  return error.message || "Unexpected API error.";
}
