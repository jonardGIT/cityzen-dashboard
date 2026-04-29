import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  createAuthenticatedClient,
  createPublicClient,
} from "@/lib/api/clients";
import {
  normalizeAuthResponse,
  normalizeAuthUser,
  normalizeCapabilities,
} from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";
import type {
  AuthResponse,
  AuthSessionSummary,
  AuthUser,
  LoginRequest,
  LoginResult,
  MessageResponse,
  MfaCodeRequest,
  MfaSetupResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  RefreshRequest,
  RegisterRequest,
  RegisterResult,
  UserCapabilities,
} from "@/types/auth";

const AUTH_SESSIONS_QUERY_KEY = ["auth", "sessions"] as const;
const publicAuthProxyClient = createPublicClient("/api");
const authProxyClient = createAuthenticatedClient("/api");
const usersProxyClient = createAuthenticatedClient("/api");

type MfaAwareErrorPayload = ApiErrorPayload & { mfaRequired?: boolean };

function getApiErrorMessage(data: MfaAwareErrorPayload | undefined): string {
  return `${data?.message ?? ""} ${data?.error ?? ""}`.trim().toLowerCase();
}

export function isMfaRequiredError(
  error: unknown,
  hasSubmittedMfaCode = false,
): boolean {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const data = error.response?.data as MfaAwareErrorPayload | undefined;
  if (data?.mfaRequired) {
    return true;
  }

  if (hasSubmittedMfaCode || error.response?.status !== 401) {
    return false;
  }

  const message = getApiErrorMessage(data);
  return message.includes("mfa") && message.includes("required");
}

export async function loginWithPassword(
  payload: LoginRequest,
): Promise<LoginResult> {
  try {
    const response = await publicAuthProxyClient.post<AuthResponse>(
      "/auth/login",
      payload,
    );
    const auth = normalizeAuthResponse(response.data);
    return {
      mfaRequired: Boolean(auth.mfaRequired),
      auth,
    };
  } catch (error) {
    if (isMfaRequiredError(error, Boolean(payload.mfaCode))) {
      return { mfaRequired: true };
    }

    throw error;
  }
}

export async function registerAccount(
  payload: RegisterRequest,
): Promise<RegisterResult> {
  const response = await publicAuthProxyClient.post<unknown>(
    "/auth/register",
    payload,
  );
  const data = response.data as
    | (Partial<AuthResponse> & {
        emailConfirmationRequired?: boolean;
        message?: string;
        user?: AuthUser;
      })
    | undefined;

  if (data?.token || data?.accessToken || data?.refreshToken) {
    const auth = normalizeAuthResponse(data as AuthResponse);
    return {
      emailConfirmationRequired: false,
      auth,
      user: auth.user,
      message: typeof data.message === "string" ? data.message : undefined,
    };
  }

  return {
    emailConfirmationRequired: Boolean(data?.emailConfirmationRequired),
    user: data?.user ? normalizeAuthUser(data.user) : undefined,
    message:
      typeof data?.message === "string" && data.message.trim().length > 0
        ? data.message
        : "Registration succeeded. Confirm your email before signing in.",
  };
}

export async function refreshAuthSession(
  payload: RefreshRequest,
): Promise<AuthResponse> {
  const response = await publicAuthProxyClient.post<AuthResponse>(
    "/auth/refresh",
    payload,
  );
  return normalizeAuthResponse(response.data);
}

export async function requestPasswordReset(
  payload: PasswordResetRequestRequest,
): Promise<PasswordResetRequestResponse> {
  const response =
    await publicAuthProxyClient.post<PasswordResetRequestResponse>(
      "/auth/password-reset/request",
      payload,
    );
  return response.data;
}

export async function confirmPasswordReset(
  payload: PasswordResetConfirmRequest,
): Promise<MessageResponse> {
  const response = await publicAuthProxyClient.post<MessageResponse>(
    "/auth/password-reset/confirm",
    payload,
  );
  return response.data;
}

export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<AuthUser> {
  const response = await authProxyClient.get<AuthUser>("/auth/me", { signal });
  return normalizeAuthUser(response.data);
}

export async function fetchCurrentUserCapabilities(
  signal?: AbortSignal,
): Promise<UserCapabilities> {
  const response = await usersProxyClient.get<unknown>("/users/capabilities", {
    signal,
  });
  return normalizeCapabilities(response.data);
}

export async function logoutCurrentSession(): Promise<void> {
  await authProxyClient.post("/auth/logout");
}

export async function fetchAuthSessions(
  signal?: AbortSignal,
): Promise<AuthSessionSummary[]> {
  const response = await authProxyClient.get<AuthSessionSummary[]>(
    "/auth/sessions",
    {
      signal,
    },
  );
  return response.data;
}

export async function revokeAuthSession(sessionId: string): Promise<void> {
  await authProxyClient.delete(`/auth/sessions/${sessionId}`);
}

export async function createMfaSetup(
  signal?: AbortSignal,
): Promise<MfaSetupResponse> {
  const response = await authProxyClient.post<MfaSetupResponse>(
    "/auth/mfa/setup",
    {},
    { signal },
  );
  return response.data;
}

export async function enableMfa(
  payload: Omit<MfaCodeRequest, "refreshToken">,
): Promise<MessageResponse> {
  const response = await authProxyClient.post<MessageResponse>(
    "/auth/mfa/enable",
    payload,
  );
  return response.data;
}

export async function disableMfa(
  payload: Omit<MfaCodeRequest, "refreshToken">,
): Promise<MessageResponse> {
  const response = await authProxyClient.post<MessageResponse>(
    "/auth/mfa/disable",
    payload,
  );
  return response.data;
}

export function useAuthSessionsQuery(enabled = true) {
  return useQuery({
    queryKey: AUTH_SESSIONS_QUERY_KEY,
    queryFn: ({ signal }) => fetchAuthSessions(signal),
    enabled,
  });
}

export function useRevokeAuthSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAuthSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: AUTH_SESSIONS_QUERY_KEY,
      });
    },
  });
}

export function useCreateMfaSetupMutation() {
  return useMutation({
    mutationFn: () => createMfaSetup(),
  });
}

export function useEnableMfaMutation() {
  return useMutation({
    mutationFn: enableMfa,
  });
}

export function useDisableMfaMutation() {
  return useMutation({
    mutationFn: disableMfa,
  });
}
