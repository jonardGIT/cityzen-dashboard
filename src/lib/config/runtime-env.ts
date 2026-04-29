const LOCAL_API_BASE_URL = "http://localhost:3000/api/v1";
const LOCAL_API_HOST = "http://localhost:3000";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function resolveRequiredValue(
  value: string | undefined,
  name: string,
): string | undefined {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (isProductionBuildPhase()) {
    return undefined;
  }

  if (isProduction()) {
    throw new Error(`${name} is required in production.`);
  }

  return undefined;
}

export function resolveDashboardApiBaseUrl(): string {
  const configured = resolveRequiredValue(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
  );

  return normalizeUrl(configured ?? LOCAL_API_BASE_URL);
}

export function resolveDashboardProxyApiKey(): string {
  const configured = process.env.API_KEY?.trim();

  if (configured) {
    return configured;
  }

  if (!isProduction() && resolveDashboardApiBaseUrl() === LOCAL_API_BASE_URL) {
    return "local-dev-key";
  }

  if (isProductionBuildPhase()) {
    return "";
  }

  if (isProduction()) {
    throw new Error(
      "API_KEY is required in production for dashboard proxy requests.",
    );
  }

  return "";
}

export function resolveCirsApiBaseUrl(): string {
  const configured = resolveRequiredValue(
    process.env.CIRS_API_BASE_URL,
    "CIRS_API_BASE_URL",
  );

  return normalizeUrl(configured ?? LOCAL_API_HOST);
}

export function resolveCirsApiBasePath(): string {
  const configured = process.env.CIRS_API_BASE_PATH?.trim();

  if (!configured) {
    return "/api/v1";
  }

  const normalized = configured.replace(/\/$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function resolveCirsApiKey(): string {
  const configured =
    process.env.CIRS_API_KEY?.trim() ?? process.env.API_KEY?.trim();

  if (configured) {
    return configured;
  }

  if (!isProduction() && resolveCirsApiBaseUrl() === LOCAL_API_HOST) {
    return "local-dev-key";
  }

  if (isProductionBuildPhase()) {
    return "";
  }

  if (isProduction()) {
    throw new Error(
      "CIRS_API_KEY or API_KEY is required in production for server-side CIRS requests.",
    );
  }

  return "";
}

export function validateDashboardProductionEnv(): void {
  if (!isProduction()) {
    return;
  }

  resolveDashboardApiBaseUrl();
  resolveDashboardProxyApiKey();
  resolveCirsApiBaseUrl();
  resolveCirsApiKey();
}
