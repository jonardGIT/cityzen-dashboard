export const CIRS_API_BASE_URL =
  process.env.CIRS_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const CIRS_API_BASE_PATH =
  process.env.CIRS_API_BASE_PATH?.replace(/\/$/, "") ?? "/api/v1";

export const CIRS_API_KEY = process.env.CIRS_API_KEY;

export const CIRS_RESOURCES = [
  "citizens",
  "responders",
  "statuses",
  "categories",
  "severities",
  "locations",
  "incidents",
  "assignments",
] as const;

export type CirsResource = (typeof CIRS_RESOURCES)[number];
