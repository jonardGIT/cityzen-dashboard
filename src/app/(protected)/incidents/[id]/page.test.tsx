import { render, screen } from "@testing-library/react";
import { App } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IncidentWorkspacePage from "@/app/(protected)/incidents/[id]/page";
import { Role } from "@/types/auth";

const {
  useParamsMock,
  useRouterMock,
  useAuthMock,
  defaultAssignmentsQueryStateMock,
  useAssignmentsQueryMock,
  useCreateAssignmentMutationMock,
  defaultIncidentsQueryStateMock,
  useIncidentQueryMock,
  useUpdateIncidentMutationMock,
  getIncidentMediaReferenceMock,
  fetchIncidentMediaAccessUrlMock,
  useCategoriesQueryMock,
  useCitizensQueryMock,
  useRespondersQueryMock,
  useSeveritiesQueryMock,
  useStatusesQueryMock,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  useAuthMock: vi.fn(),
  defaultAssignmentsQueryStateMock: vi.fn(),
  useAssignmentsQueryMock: vi.fn(),
  useCreateAssignmentMutationMock: vi.fn(),
  defaultIncidentsQueryStateMock: vi.fn(),
  useIncidentQueryMock: vi.fn(),
  useUpdateIncidentMutationMock: vi.fn(),
  getIncidentMediaReferenceMock: vi.fn(),
  fetchIncidentMediaAccessUrlMock: vi.fn(),
  useCategoriesQueryMock: vi.fn(),
  useCitizensQueryMock: vi.fn(),
  useRespondersQueryMock: vi.fn(),
  useSeveritiesQueryMock: vi.fn(),
  useStatusesQueryMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  useRouter: useRouterMock,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/features/assignments/api", () => ({
  defaultAssignmentsQueryState: defaultAssignmentsQueryStateMock,
  useAssignmentsQuery: useAssignmentsQueryMock,
  useCreateAssignmentMutation: useCreateAssignmentMutationMock,
}));

vi.mock("@/features/incidents/api", () => ({
  defaultIncidentsQueryState: defaultIncidentsQueryStateMock,
  fetchIncidentMediaAccessUrl: fetchIncidentMediaAccessUrlMock,
  getIncidentMediaReference: getIncidentMediaReferenceMock,
  useIncidentQuery: useIncidentQueryMock,
  useUpdateIncidentMutation: useUpdateIncidentMutationMock,
}));

vi.mock("@/features/reference-data/api", () => ({
  useCategoriesQuery: useCategoriesQueryMock,
  useCitizensQuery: useCitizensQueryMock,
  useRespondersQuery: useRespondersQueryMock,
  useSeveritiesQuery: useSeveritiesQueryMock,
  useStatusesQuery: useStatusesQueryMock,
}));

vi.mock("@/components/common/PageStates", () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
  LoadingState: () => <div>Loading</div>,
}));

vi.mock("@/components/auth/RoleGuard", () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function buildPaginatedResult(data: Array<Record<string, unknown>> = []) {
  return {
    data: {
      data,
      pagination: {
        page: 1,
        pageSize: 20,
        total: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
  };
}

function renderPage() {
  return render(
    <App>
      <IncidentWorkspacePage />
    </App>,
  );
}

describe("IncidentWorkspacePage", () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ id: "incident-1" });
    useRouterMock.mockReturnValue({ push: vi.fn() });
    useAuthMock.mockReturnValue({
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    defaultAssignmentsQueryStateMock.mockReturnValue({
      page: 1,
      pageSize: 100,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: [],
    });
    defaultIncidentsQueryStateMock.mockReturnValue({
      page: 1,
      pageSize: 200,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: [],
    });
    useIncidentQueryMock.mockReturnValue({
      data: {
        id: "incident-1",
        description: "Flooded road",
        citizenId: "citizen-1",
        statusId: "status-1",
        severityId: "severity-1",
        categoryId: "category-1",
        createdAt: "2026-04-05T08:00:00.000Z",
        updatedAt: "2026-04-05T09:00:00.000Z",
        dateReported: "2026-04-05T08:00:00.000Z",
        latitude: 14.5,
        longitude: 120.9,
        addressLine1: "Main St",
        cityName: "Metro City",
      },
      isLoading: false,
      error: null,
    });
    useAssignmentsQueryMock.mockReturnValue(buildPaginatedResult([]));
    useCreateAssignmentMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateIncidentMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useCitizensQueryMock.mockReturnValue(
      buildPaginatedResult([
        {
          id: "citizen-1",
          name: "Alex Citizen",
          preferredChannel: "SMS",
          contactInfo: "0917-000-0000",
        },
      ]),
    );
    useRespondersQueryMock.mockReturnValue(buildPaginatedResult([]));
    useStatusesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "status-1", name: "Open" }]),
    );
    useSeveritiesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "severity-1", level: "High" }]),
    );
    useCategoriesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "category-1", name: "Flood" }]),
    );
    getIncidentMediaReferenceMock.mockReturnValue({
      mediaId: null,
      fallbackUrl: null,
    });
    fetchIncidentMediaAccessUrlMock.mockReset();
  });

  it("shows operator context for non-citizen roles", () => {
    renderPage();

    expect(screen.getByText("Assignment activity")).toBeInTheDocument();
    expect(screen.getByText("Active context")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open assignments board" }),
    ).toBeInTheDocument();
    expect(useAssignmentsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      true,
    );
    expect(useCitizensQueryMock).toHaveBeenCalledWith(expect.anything(), true);
    expect(useRespondersQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      true,
    );
  });

  it("hides operator-only context and disables admin-only queries for citizen reporters", () => {
    useAuthMock.mockReturnValue({
      hasRole: (...roles: Role[]) => roles.includes(Role.CITIZEN_REPORTER),
    });

    renderPage();

    expect(screen.queryByText("Assignment activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Active context")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open citizen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open assignments board" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Assignment history is reserved for operator workflows"),
    ).toBeInTheDocument();
    expect(useAssignmentsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
    expect(useCitizensQueryMock).toHaveBeenCalledWith(expect.anything(), false);
    expect(useRespondersQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
  });
});
