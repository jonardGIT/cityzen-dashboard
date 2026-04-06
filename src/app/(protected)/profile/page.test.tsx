import { act, fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import { AxiosError } from "axios";
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
  ResizableTable: ({ dataSource }: { dataSource: unknown[] }) => (
    <div>Session rows: {dataSource.length}</div>
  ),
}));

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

  it("surfaces an operator-facing error when MFA setup returns 503", async () => {
    const mfaSetupError = new AxiosError("Service unavailable");
    mfaSetupError.response = {
      data: { message: "MFA_ENCRYPTION_KEY is not configured." },
      status: 503,
      statusText: "Service Unavailable",
      headers: {},
      config: { headers: {} },
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
});