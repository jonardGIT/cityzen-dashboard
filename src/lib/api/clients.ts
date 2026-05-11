import axios, { AxiosError, AxiosHeaders } from "axios";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  storeAuthResponse,
} from "@/lib/auth/token-storage";
import { resolveDashboardApiBaseUrl } from "@/lib/config/runtime-env";
import type { ApiErrorPayload } from "@/types/api";
import type { AuthResponse, LoginReason } from "@/types/auth";

const PROXY_AUTH_BASE_URL = "/api";
const PROXY_API_BASE_URL = "/api/cirs";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

function resolveDefaultBaseUrl() {
  return isBrowserRuntime() ? PROXY_API_BASE_URL : resolveDashboardApiBaseUrl();
}

function resolveRefreshBaseUrl() {
  return isBrowserRuntime()
    ? PROXY_AUTH_BASE_URL
    : resolveDashboardApiBaseUrl();
}

function resolveApiKey(baseURL: string): string {
  const configuredKey = process.env.API_KEY?.trim();
  if (configuredKey) {
    return configuredKey;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    baseURL.startsWith("http://localhost:3000/api/v1")
  ) {
    return "local-dev-key";
  }

  return "";
}

type UnauthorizedHandler = (reason: LoginReason) => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();
let refreshPromise: Promise<AuthResponse | null> | null = null;

type RetryableRequestConfig = {
  _retry?: boolean;
  url?: string;
  headers?: AxiosHeaders | Record<string, string>;
};

export function registerUnauthorizedHandler(
  handler: UnauthorizedHandler,
): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function resolveUnauthorizedReason(
  error: AxiosError<ApiErrorPayload>,
): LoginReason {
  const message = error.response?.data?.message?.toLowerCase() ?? "";

  if (message.includes("password")) {
    return "password-changed";
  }

  if (message.includes("role")) {
    return "role-changed";
  }

  if (message.includes("revoked")) {
    return "session-revoked";
  }

  return "session-expired";
}

function notifyUnauthorized(reason: LoginReason) {
  clearAuthStorage();
  unauthorizedHandlers.forEach((handler) => handler(reason));
}

function createBaseConfigFor(baseURL: string) {
  const shouldAttachApiKey = !baseURL.startsWith("/api");
  const apiKey = shouldAttachApiKey ? resolveApiKey(baseURL) : "";

  return {
    baseURL,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
  };
}

function setAuthorizationHeader(
  headers: AxiosHeaders | Record<string, string> | undefined,
  token: string,
  tokenType = "Bearer",
) {
  const normalizedHeaders = AxiosHeaders.from(headers ?? {});
  normalizedHeaders.set("Authorization", `${tokenType} ${token}`);
  return normalizedHeaders;
}

async function refreshAuthenticatedSession(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken();
  const payload = refreshToken ? { refreshToken } : undefined;
  if (!refreshToken) {
    if (!isBrowserRuntime()) {
      return null;
    }
  }

  try {
    const response = await refreshClient.post<AuthResponse>(
      "/auth/refresh",
      payload,
    );
    storeAuthResponse(response.data);
    return response.data;
  } catch {
    return null;
  }
}

function buildClient(baseURL: string, includeAuth: boolean) {
  const client = axios.create(createBaseConfigFor(baseURL));
  const usesProxyAuth = baseURL.startsWith("/api");

  if (includeAuth) {
    client.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers = setAuthorizationHeader(config.headers, token);
      }
      return config;
    });

    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorPayload>) => {
        if (error.response?.status !== 401) {
          return Promise.reject(error);
        }

        const originalRequest = error.config as
          | RetryableRequestConfig
          | undefined;
        const requestUrl = originalRequest?.url ?? "";

        if (
          !originalRequest ||
          originalRequest._retry ||
          requestUrl.includes("/auth/refresh")
        ) {
          notifyUnauthorized(resolveUnauthorizedReason(error));
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = refreshAuthenticatedSession().finally(() => {
            refreshPromise = null;
          });
        }

        const refreshedAuth = await refreshPromise;
        if (!refreshedAuth) {
          notifyUnauthorized(resolveUnauthorizedReason(error));
          return Promise.reject(error);
        }

        if (!usesProxyAuth) {
          const refreshedToken =
            refreshedAuth.token || refreshedAuth.accessToken;
          if (!refreshedToken) {
            notifyUnauthorized(resolveUnauthorizedReason(error));
            return Promise.reject(error);
          }

          originalRequest.headers = setAuthorizationHeader(
            originalRequest.headers,
            refreshedToken,
            refreshedAuth.tokenType,
          );
        }

        return client(originalRequest);
      },
    );
  } else {
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorPayload>) => Promise.reject(error),
    );
  }

  return client;
}

const refreshClient = axios.create(
  createBaseConfigFor(resolveRefreshBaseUrl()),
);

refreshClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      clearAuthStorage();
    }

    return Promise.reject(error);
  },
);

export function createPublicClient(baseURL?: string) {
  return buildClient(baseURL ?? resolveDefaultBaseUrl(), false);
}

export function createAuthenticatedClient(baseURL?: string) {
  return buildClient(baseURL ?? resolveDefaultBaseUrl(), true);
}

export const publicClient = createPublicClient();
export const authClient = createAuthenticatedClient();
