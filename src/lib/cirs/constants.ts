import {
  resolveCirsApiBasePath,
  resolveCirsApiBaseUrl,
  resolveCirsApiKey,
} from "@/lib/config/runtime-env";

export const CIRS_API_BASE_URL = resolveCirsApiBaseUrl();

export const CIRS_API_BASE_PATH = resolveCirsApiBasePath();

export const CIRS_API_KEY = resolveCirsApiKey();

export const CIRS_RESOURCES = [
  "citizens",
  "agencies",
  "responders",
  "statuses",
  "categories",
  "severities",
  "incidents",
  "assignments",
  "users",
  "mobile-content",
] as const;

export type CirsResource = (typeof CIRS_RESOURCES)[number];
