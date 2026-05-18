import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditLogsPage from "@/app/(protected)/audit-logs/page";
import { AuditLogApiClientError } from "@/lib/api/auditLogs";
import { Role } from "@/types/auth";

const {
  useAuthMock,
  useAuditLogsQueryMock,
  useAuditLogQueryMock,
  useListQueryParamsMock,
  auditLogTableMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useAuditLogsQueryMock: vi.fn(),
  useAuditLogQueryMock: vi.fn(),
  useListQueryParamsMock: vi.fn(),
  auditLogTableMock: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/components/auth/AuthGate", () => ({
  AuthGate: ({
    children,
    allowedRoles,
  }: {
    children: React.ReactNode;
    allowedRoles?: Role[];
  }) => {
    const auth = useAuthMock();

    if (
      allowedRoles &&
      (!auth.user || !allowedRoles.includes(auth.user.role))
    ) {
      return <div>403 gate</div>;
    }

    return <>{children}</>;
  },
}));

vi.mock("@/features/audit-logs/api", () => ({
  useAuditLogsQuery: useAuditLogsQueryMock,
  useAuditLogQuery: useAuditLogQueryMock,
}));

vi.mock("@/hooks/useListQueryParams", () => ({
  useListQueryParams: useListQueryParamsMock,
}));

vi.mock("@/components/audit/AuditLogFilters", () => ({
  AuditLogFilters: ({
    validationState,
  }: {
    validationState?: { message?: string } | null;
  }) => (
    <div>
      <div>Audit filters</div>
      {validationState?.message ? <div>{validationState.message}</div> : null}
    </div>
  ),
}));

vi.mock("@/components/audit/AuditLogTable", () => ({
  AuditLogTable: ({
    rows,
  }: {
    rows: Array<{ id: string; summary?: string }>;
  }) => {
    auditLogTableMock(rows);
    return <div>Audit table</div>;
  },
}));

vi.mock("@/components/audit/AuditLogDetailSheet", () => ({
  AuditLogDetailSheet: () => null,
}));

function buildListQueryState() {
  return {
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: "timestamp",
    sortOrder: "desc" as const,
    filters: [],
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
    setSortBy: vi.fn(),
    setSortOrder: vi.fn(),
    setFilters: vi.fn(),
    upsertFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearFilters: vi.fn(),
    setCreatedFrom: vi.fn(),
    setCreatedTo: vi.fn(),
    setUpdatedFrom: vi.fn(),
    setUpdatedTo: vi.fn(),
    setCreatedRange: vi.fn(),
    setUpdatedRange: vi.fn(),
    clearDateFilters: vi.fn(),
  };
}

describe("AuditLogsPage", () => {
  beforeEach(() => {
    auditLogTableMock.mockReset();
    useListQueryParamsMock.mockReturnValue(buildListQueryState());
    useAuditLogsQueryMock.mockReturnValue({
      data: { data: [], pagination: undefined },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    useAuditLogQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("blocks non-audit roles and disables the audit list query", () => {
    useAuthMock.mockReturnValue({
      user: { role: Role.DISPATCHER },
      capabilities: { permissions: [], role: Role.DISPATCHER },
      isAuthenticated: true,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("403 gate")).toBeInTheDocument();
    expect(useAuditLogsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
  });

  it("renders the sensitive audit workspace for authorized roles", () => {
    useAuthMock.mockReturnValue({
      user: { role: Role.AUDITOR },
      capabilities: {
        permissions: ["audit:read:global"],
        role: Role.AUDITOR,
      },
      isAuthenticated: true,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("Sensitive")).toBeInTheDocument();
    expect(screen.getByText("Audit filters")).toBeInTheDocument();
    expect(useAuditLogsQueryMock).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("passes newest audit rows first to the table", () => {
    useAuthMock.mockReturnValue({
      user: { role: Role.AUDITOR },
      capabilities: {
        permissions: ["audit:read:global"],
        role: Role.AUDITOR,
      },
      isAuthenticated: true,
    });
    useAuditLogsQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: "audit-older",
            summary: "Older entry",
            timestamp: "2026-05-01T09:00:00.000Z",
          },
          {
            id: "audit-newer",
            summary: "Newer entry",
            timestamp: "2026-05-01T10:00:00.000Z",
          },
        ],
        pagination: undefined,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AuditLogsPage />);

    expect(auditLogTableMock).toHaveBeenCalledTimes(1);
    expect(auditLogTableMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ id: "audit-newer" }),
      expect.objectContaining({ id: "audit-older" }),
    ]);
  });

  it("shows a forbidden state for authorized users when the backend returns 403", () => {
    useAuthMock.mockReturnValue({
      user: { role: Role.NATIONAL_ADMIN },
      capabilities: {
        permissions: ["audit:read:global"],
        role: Role.NATIONAL_ADMIN,
      },
      isAuthenticated: true,
    });
    useAuditLogsQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: new AuditLogApiClientError({
        status: 403,
        message: "Forbidden",
      }),
      refetch: vi.fn(),
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("Forbidden")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only National Admin and Auditor accounts can access audit logs.",
      ),
    ).toBeInTheDocument();
  });

  it("surfaces audit filter validation instead of the generic error banner on 422", () => {
    useAuthMock.mockReturnValue({
      user: { role: Role.AUDITOR },
      capabilities: {
        permissions: ["audit:read:global"],
        role: Role.AUDITOR,
      },
      isAuthenticated: true,
    });
    useListQueryParamsMock.mockReturnValue({
      ...buildListQueryState(),
      filters: [{ field: "statusCode", operator: "contains", value: "500" }],
    });
    useAuditLogsQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: new AuditLogApiClientError({
        status: 422,
        message: "Invalid query parameters.",
        details: {
          message: "Invalid query parameters.",
          errors: [
            {
              field: "filters[0].operator",
              message: "The contains operator is not supported for statusCode.",
            },
          ],
        },
      }),
      refetch: vi.fn(),
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("Invalid query parameters.")).toBeInTheDocument();
    expect(
      screen.queryByText("Unable to load audit logs"),
    ).not.toBeInTheDocument();
  });
});
