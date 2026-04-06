import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IncidentsPage from "@/app/(protected)/incidents/page";
import { Role } from "@/types/auth";

const {
  useRouterMock,
  useAuthMock,
  useAssignmentsQueryMock,
  defaultAssignmentsQueryStateMock,
  getCrudEndpointMock,
  useCrudEndpointAvailabilityMock,
  useCreateIncidentMutationMock,
  useIncidentsQueryMock,
  useReportIncidentMutationMock,
  uploadIncidentMediaMock,
  useCategoriesQueryMock,
  useCitizensQueryMock,
  useRespondersQueryMock,
  useSeveritiesQueryMock,
  useStatusesQueryMock,
  useListQueryParamsMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  useAuthMock: vi.fn(),
  useAssignmentsQueryMock: vi.fn(),
  defaultAssignmentsQueryStateMock: vi.fn(),
  getCrudEndpointMock: vi.fn(),
  useCrudEndpointAvailabilityMock: vi.fn(),
  useCreateIncidentMutationMock: vi.fn(),
  useIncidentsQueryMock: vi.fn(),
  useReportIncidentMutationMock: vi.fn(),
  uploadIncidentMediaMock: vi.fn(),
  useCategoriesQueryMock: vi.fn(),
  useCitizensQueryMock: vi.fn(),
  useRespondersQueryMock: vi.fn(),
  useSeveritiesQueryMock: vi.fn(),
  useStatusesQueryMock: vi.fn(),
  useListQueryParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/features/assignments/api", () => ({
  useAssignmentsQuery: useAssignmentsQueryMock,
  defaultAssignmentsQueryState: defaultAssignmentsQueryStateMock,
}));

vi.mock("@/features/dynamic-crud/config", () => ({
  getCrudEndpoint: getCrudEndpointMock,
}));

vi.mock("@/features/dynamic-crud/openapi", () => ({
  useCrudEndpointAvailability: useCrudEndpointAvailabilityMock,
}));

vi.mock("@/features/incidents/api", () => ({
  useCreateIncidentMutation: useCreateIncidentMutationMock,
  useIncidentsQuery: useIncidentsQueryMock,
  useReportIncidentMutation: useReportIncidentMutationMock,
  uploadIncidentMedia: uploadIncidentMediaMock,
}));

vi.mock("@/features/reference-data/api", () => ({
  useCategoriesQuery: useCategoriesQueryMock,
  useCitizensQuery: useCitizensQueryMock,
  useRespondersQuery: useRespondersQueryMock,
  useSeveritiesQuery: useSeveritiesQueryMock,
  useStatusesQuery: useStatusesQueryMock,
}));

vi.mock("@/hooks/useListQueryParams", () => ({
  useListQueryParams: useListQueryParamsMock,
}));

vi.mock("@/components/common/FilterToolbar", () => ({
  FilterToolbar: () => <div>Filter toolbar</div>,
}));

vi.mock("@/components/common/PageStates", () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
  LoadingState: () => <div>Loading</div>,
}));

vi.mock("@/components/crud/SharedTable", () => ({
  SharedTable: () => <div>Shared table</div>,
}));

function buildListQueryState() {
  return {
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    filters: [],
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    setSearch: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSort: vi.fn(),
    setCreatedRange: vi.fn(),
    setUpdatedRange: vi.fn(),
    upsertFilter: vi.fn(),
    removeFilter: vi.fn(),
  };
}

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
      <IncidentsPage />
    </App>,
  );
}

describe("IncidentsPage", () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({ push: vi.fn() });
    useAuthMock.mockReturnValue({
      hasRole: (...roles: Role[]) => roles.includes(Role.DISPATCHER),
    });
    defaultAssignmentsQueryStateMock.mockReturnValue({
      page: 1,
      pageSize: 200,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: [],
    });
    getCrudEndpointMock.mockReturnValue({
      method: "POST",
      path: "/incidents/media/upload",
      featureGate: { feature: "mediaStorage" },
    });
    useAssignmentsQueryMock.mockReturnValue(buildPaginatedResult());
    useCreateIncidentMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useReportIncidentMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useIncidentsQueryMock.mockReturnValue(
      buildPaginatedResult([
        {
          id: "incident-1",
          description: "Flooded road",
          createdAt: "2026-04-05T08:00:00.000Z",
          updatedAt: "2026-04-05T09:00:00.000Z",
          citizenId: "citizen-1",
          statusId: "status-1",
        },
      ]),
    );
    useCitizensQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "citizen-1", name: "Alex Citizen" }]),
    );
    useCategoriesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "category-1", name: "Flood" }]),
    );
    useSeveritiesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "severity-1", level: "High" }]),
    );
    useStatusesQueryMock.mockReturnValue(
      buildPaginatedResult([{ id: "status-1", name: "Open" }]),
    );
    useRespondersQueryMock.mockReturnValue(buildPaginatedResult());
    useListQueryParamsMock.mockReturnValue(buildListQueryState());
    uploadIncidentMediaMock.mockReset();
    useCrudEndpointAvailabilityMock.mockReset();
  });

  it("shows the media upload button when the active backend profile exposes uploads", async () => {
    useCrudEndpointAvailabilityMock.mockReturnValue({
      isAvailable: true,
      isLoading: false,
    });

    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Incident" }));
    });

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("button", { name: "Upload Media" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(
        "The current backend feature profile supports URL-based media references only.",
      ),
    ).not.toBeInTheDocument();
  }, 10000);

  it("shows the URL-only guidance when uploads are not available in the active profile", async () => {
    useCrudEndpointAvailabilityMock.mockReturnValue({
      isAvailable: false,
      isLoading: false,
    });

    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Incident" }));
    });

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).queryByRole("button", { name: "Upload Media" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "The current backend feature profile supports URL-based media references only.",
      ),
    ).toBeInTheDocument();
  }, 10000);

  it("switches citizen reporters into self-service report mode and disables admin-only queries", async () => {
    useAuthMock.mockReturnValue({
      hasRole: (...roles: Role[]) => roles.includes(Role.CITIZEN_REPORTER),
    });
    useCrudEndpointAvailabilityMock.mockReturnValue({
      isAvailable: false,
      isLoading: false,
    });

    renderPage();

    expect(
      screen.getByRole("button", { name: "Report Incident" }),
    ).toBeInTheDocument();
    expect(useCitizensQueryMock).toHaveBeenCalledWith(expect.anything(), false);
    expect(useRespondersQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
    expect(useAssignmentsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Report Incident" }));
    });

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Report Incident")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Citizen")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Status")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Media URL"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "The self-service report flow stays limited to the backend contract fields for incident details and location snapshot data.",
      ),
    ).toBeInTheDocument();
  }, 10000);
});
