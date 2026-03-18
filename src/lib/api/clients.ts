import axios, { AxiosError } from "axios";
import { clearAuthStorage, getAccessToken } from "@/lib/auth/token-storage";
import type { ApiErrorPayload } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

type UnauthorizedHandler = () => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function notifyUnauthorized() {
  clearAuthStorage();
  unauthorizedHandlers.forEach((handler) => handler());
}

function buildClient(includeAuth: boolean) {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
  });

  if (includeAuth) {
    client.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorPayload>) => {
      if (error.response?.status === 401) {
        notifyUnauthorized();
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const publicClient = buildClient(false);
export const authClient = buildClient(true);
