import { act, fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import { AxiosError, type AxiosRequestHeaders } from "axios";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/(protected)/profile/page";
import { Role } from "@/types/auth";

const {
  useAuthMock,
  getAuthOptionalEndpointMock,
  useCrudEndpointAvailabilityMock,
  useAuthSessionsQueryMock,
  useRevokeAuthSessionMutationMock,
  useCreateMfaSetupMutationMock,
  useEnableMfaMutationMock,
  useDisableMfaMutationMock,
  useListQueryParamsMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getAuthOptionalEndpointMock: vi.fn(),
  useCrudEndpointAvailabilityMock: vi.fn(),
  useAuthSessionsQueryMock: vi.fn(),
  useRevokeAuthSessionMutationMock: vi.fn(),
  useCreateMfaSetupMutationMock: vi.fn(),
  useEnableMfaMutationMock: vi.fn(),
  useDisableMfaMutationMock: vi.fn(),
  useListQueryParamsMock: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/features/dynamic-crud/config", () => ({
  getAuthOptionalEndpoint: getAuthOptionalEndpointMock,
}));

vi.mock("@/features/dynamic-crud/openapi", () => ({
  useCrudEndpointAvailability: useCrudEndpointAvailabilityMock,
}));

vi.mock("@/features/auth/api", () => ({
  useAuthSessionsQuery: useAuthSessionsQueryMock,
  useRevokeAuthSessionMutation: useRevokeAuthSessionMutationMock,
  useCreateMfaSetupMutation: useCreateMfaSetupMutationMock,
  useEnableMfaMutation: useEnableMfaMutationMock,
  useDisableMfaMutation: useDisableMfaMutationMock,
}));

vi.mock("@/hooks/useListQueryParams", () => ({
  useListQueryParams: useListQueryParamsMock,
}));

vi.mock("@/components/common/ResizableTable", () => ({
  ResizableTable: ({
    dataSource,
    columns,
  }: {
    dataSource: Array<Record<string, unknown>>;
    columns?: Array<{
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, record: Record<string, unknown>) => unknown;
    }>;
  }) => (
    <div>
      <div>Session rows: {dataSource.length}</div>
      {dataSource.map((record, rowIndex) => (
        <div key={String(record.id ?? rowIndex)}>
          {columns?.map((column, columnIndex) => (
            <div
              key={`${String(column.key ?? column.dataIndex ?? columnIndex)}`}
            >
              {column.render
                ? (column.render(
                    column.dataIndex ? record[column.dataIndex] : undefined,
                    record,
                  ) as React.ReactNode)
                : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    userAgent: "Chrome on Linux",
    ipAddress: "127.0.0.1",
    isCurrent: false,
    createdAt: "2026-04-06T01:00:00.000Z",
    lastUsedAt: "2026-04-06T01:10:00.000Z",
    expiresAt: "2026-04-07T01:00:00.000Z",
    refreshExpiresAt: "2026-04-08T01:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

function renderProfilePage() {
  return render(
    <App>
      <ProfilePage />
    </App>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        email: "dispatcher@example.com",
        name: "Dispatch Lead",
        role: Role.DISPATCHER,
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
      logout: vi.fn(),
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    getAuthOptionalEndpointMock.mockImplementation((operation: string) => ({
      operation,
      method: operation === "revokeSession" ? "DELETE" : "GET",
      path: `/auth/${operation}`,
      authRequired: true,
    }));
    useCrudEndpointAvailabilityMock.mockImplementation(
      (endpoint: { path: string }) => ({
        isAvailable: endpoint.path === "/auth/sessions",
        isLoading: false,
      }),
    );
    useAuthSessionsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useRevokeAuthSessionMutationMock.mockReturnValue({
      isPending: false,
      variables: null,
      mutateAsync: vi.fn(),
    });
    useCreateMfaSetupMutationMock.mockReturnValue({
      isPending: false,
      data: null,
      mutateAsync: vi.fn(),
    });
    useEnableMfaMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useDisableMfaMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useListQueryParamsMock.mockReturnValue({
      page: 1,
      pageSize: 10,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: [],
      setSearch: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      setSort: vi.fn(),
      removeFilter: vi.fn(),
      upsertFilter: vi.fn(),
      clearFilters: vi.fn(),
    });
  });

  it("disables session inventory when the endpoint is not active in OpenAPI", () => {
    useCrudEndpointAvailabilityMock.mockImplementation(() => ({
      isAvailable: false,
      isLoading: false,
    }));

    renderProfilePage();

    expect(
      screen.getByText("Session inventory is unavailable"),
    ).toBeInTheDocument();
    expect(useAuthSessionsQueryMock).toHaveBeenCalledWith(false);
  });

  it("shows the MFA unavailable message when the profile is privileged but MFA endpoints are off", () => {
    useCrudEndpointAvailabilityMock.mockImplementation(
      (endpoint: { path: string }) => ({
        isAvailable: endpoint.path === "/auth/sessions",
        isLoading: false,
      }),
    );

    renderProfilePage();

    expect(
      screen.getByText("MFA management is unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The current backend feature profile does not expose MFA enrollment endpoints.",
      ),
    ).toBeInTheDocument();
  });

  it("shows live sessions but disables revoke guidance when only session inventory is active", () => {
    useCrudEndpointAvailabilityMock.mockImplementation(
      (endpoint: { path: string }) => ({
        isAvailable: endpoint.path === "/auth/sessions",
        isLoading: false,
      }),
    );
    useAuthSessionsQueryMock.mockReturnValue({
      data: [buildSession({ isCurrent: true })],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderProfilePage();

    expect(screen.getByText("Session rows: 1")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Session revocation is unavailable for the current backend feature profile.",
      ),
    ).toBeInTheDocument();
  });

  it("logs out after revoking the current session", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const revokeMock = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        email: "dispatcher@example.com",
        name: "Dispatch Lead",
        role: Role.DISPATCHER,
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
      logout: logoutMock,
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    useCrudEndpointAvailabilityMock.mockImplementation(() => ({
      isAvailable: true,
      isLoading: false,
    }));
    useAuthSessionsQueryMock.mockReturnValue({
      data: [buildSession({ isCurrent: true })],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useRevokeAuthSessionMutationMock.mockReturnValue({
      isPending: false,
      variables: null,
      mutateAsync: revokeMock,
    });

    renderProfilePage();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Sign Out This Session" }),
      );
    });

    expect(revokeMock).toHaveBeenCalledWith("session-1");
    expect(logoutMock).toHaveBeenCalledWith({
      revokeRemote: false,
      redirectTo: "/login?reason=session-revoked",
    });
  });

  it("surfaces an operator-facing error when MFA setup returns 503", async () => {
    const mfaSetupError = new AxiosError("Service unavailable");
    mfaSetupError.response = {
      data: { message: "MFA_ENCRYPTION_KEY is not configured." },
      status: 503,
      statusText: "Service Unavailable",
      headers: {},
      config: { headers: {} as AxiosRequestHeaders },
    };

    useCrudEndpointAvailabilityMock.mockImplementation(
      (endpoint: { path: string }) => ({
        isAvailable:
          endpoint.path === "/auth/sessions" ||
          endpoint.path === "/auth/mfaSetup" ||
          endpoint.path === "/auth/mfaEnable" ||
          endpoint.path === "/auth/mfaDisable",
        isLoading: false,
      }),
    );
    useCreateMfaSetupMutationMock.mockReturnValue({
      isPending: false,
      data: null,
      mutateAsync: vi.fn().mockRejectedValueOnce(mfaSetupError),
    });

    renderProfilePage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate Setup" }));
    });

    expect(
      screen.getByText("MFA setup is unavailable on the API"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Operator action is required on the backend before MFA enrollment can be used\./,
      ),
    ).toBeInTheDocument();
  });

  it("logs out after MFA enable succeeds", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const enableMock = vi.fn().mockResolvedValue({ message: "MFA enabled." });

    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        email: "dispatcher@example.com",
        name: "Dispatch Lead",
        role: Role.DISPATCHER,
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
      logout: logoutMock,
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    useCrudEndpointAvailabilityMock.mockImplementation(
      (endpoint: { path: string }) => ({
        isAvailable:
          endpoint.path === "/auth/sessions" ||
          endpoint.path === "/auth/mfaSetup" ||
          endpoint.path === "/auth/mfaEnable" ||
          endpoint.path === "/auth/mfaDisable",
        isLoading: false,
      }),
    );
    useCreateMfaSetupMutationMock.mockReturnValue({
      isPending: false,
      data: {
        issuer: "Xypes CIRS",
        accountName: "dispatcher@example.com",
        secret: "ABC123",
        otpauthUrl: "otpauth://totp/Xypes",
      },
      mutateAsync: vi.fn(),
    });
    useEnableMfaMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: enableMock,
    });

    renderProfilePage();

    fireEvent.change(
      screen.getByPlaceholderText("Enter 6-digit code to enable MFA"),
      { target: { value: "123456" } },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enable MFA" }));
    });

    expect(enableMock).toHaveBeenCalledWith({ code: "123456" });
    expect(logoutMock).toHaveBeenCalledWith({
      revokeRemote: false,
      redirectTo: "/login?reason=mfa-updated",
    });
  });

  it("logs out after MFA disable succeeds", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const disableMock = vi.fn().mockResolvedValue({ message: "MFA disabled." });

    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        email: "dispatcher@example.com",
        name: "Dispatch Lead",
        role: Role.DISPATCHER,
        mfaEnabled: true,
        mfaEnabledAt: "2026-04-06T01:00:00.000Z",
      },
      logout: logoutMock,
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    useCrudEndpointAvailabilityMock.mockImplementation(() => ({
      isAvailable: true,
      isLoading: false,
    }));
    useDisableMfaMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: disableMock,
    });

    renderProfilePage();

    fireEvent.change(
      screen.getByPlaceholderText("Enter 6-digit code to disable MFA"),
      { target: { value: "654321" } },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable MFA" }));
    });

    expect(disableMock).toHaveBeenCalledWith({ code: "654321" });
    expect(logoutMock).toHaveBeenCalledWith({
      revokeRemote: false,
      redirectTo: "/login?reason=mfa-updated",
    });
  });

  it("does not expose MFA management actions to non-privileged roles", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-2",
        email: "responder@example.com",
        name: "Field Responder",
        role: Role.RESPONDER,
        mfaEnabled: false,
        mfaEnabledAt: null,
      },
      logout: vi.fn(),
      hasRole: (...roles: Role[]) => roles.includes(Role.RESPONDER),
    });
    useCrudEndpointAvailabilityMock.mockImplementation(() => ({
      isAvailable: true,
      isLoading: false,
    }));

    renderProfilePage();

    expect(
      screen.getByText(
        "MFA enrollment is only available to privileged accounts in this dashboard.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Generate Setup" }),
    ).not.toBeInTheDocument();
  });
});
