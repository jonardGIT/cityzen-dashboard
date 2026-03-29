import axios, { AxiosError, AxiosHeaders } from "axios";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  storeAuthResponse,
} from "@/lib/auth/token-storage";
import type { ApiErrorPayload } from "@/types/api";
import type { AuthResponse, LoginReason } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

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

function createBaseConfig() {
  return {
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
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
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await refreshClient.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });
    storeAuthResponse(response.data);
    return response.data;
  } catch {
    return null;
  }
}

function buildClient(includeAuth: boolean) {
  const client = axios.create(createBaseConfig());

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

        originalRequest.headers = setAuthorizationHeader(
          originalRequest.headers,
          refreshedAuth.token,
          refreshedAuth.tokenType,
        );

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

const refreshClient = axios.create(createBaseConfig());

refreshClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      clearAuthStorage();
    }

    return Promise.reject(error);
  },
);

export const publicClient = buildClient(false);
export const authClient = buildClient(true);
