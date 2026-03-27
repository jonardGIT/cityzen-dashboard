import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CrudTable } from "@/components/crud/CrudTable";
import type { ListFilter } from "@/lib/api/list-query-params";
import type { BaseEntity } from "@/types/api";

function buildProps(overrides?: Partial<ComponentProps<typeof CrudTable>>) {
  const rows: BaseEntity[] = [
    { id: "1", name: "Alpha", createdAt: "2026-03-20T10:00:00.000Z" },
    { id: "2", name: "Beta", createdAt: "2026-03-21T10:00:00.000Z" },
  ];

  return {
    rows,
    loading: false,
    search: "",
    onSearchChange: vi.fn(),
    filters: [],
    onFilterChange: vi.fn(),
    onFilterRemove: vi.fn(),
    onClearFilters: vi.fn(),
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    onSortChange: vi.fn(),
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    paginationMeta: {
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    columnLabelsByField: { name: "Name", createdAt: "Created At" },
    selectLabelsByField: undefined,
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    canViewDetails: true,
    canEdit: true,
    canDelete: true,
    ...overrides,
  } satisfies ComponentProps<typeof CrudTable>;
}

function StatefulTable({
  initialFilters = [],
  initialSortBy = "createdAt",
  initialSortOrder = "desc",
  initialValidationState,
}: {
  initialFilters?: ListFilter[];
  initialSortBy?: string;
  initialSortOrder?: "asc" | "desc";
  initialValidationState?: ComponentProps<typeof CrudTable>["validationState"];
}) {
  const [filters, setFilters] = useState<ListFilter[]>(initialFilters);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [validationState, setValidationState] = useState(initialValidationState ?? null);

  return (
    <CrudTable
      {...buildProps({
        filters,
        sortBy,
        sortOrder,
        validationState,
        onFilterChange: (filter) => {
          setValidationState(null);
          setFilters((current) => [
            ...current.filter((item) => item.field !== filter.field),
            filter,
          ]);
        },
        onFilterRemove: (field) => {
          setValidationState(null);
          setFilters((current) => current.filter((item) => item.field !== field));
        },
        onClearFilters: () => {
          setValidationState(null);
          setFilters([]);
        },
        onSortChange: (nextSortBy, nextSortOrder) => {
          setValidationState(null);
          setSortBy(nextSortBy);
          setSortOrder(nextSortOrder);
        },
      })}
    />
  );
}

describe("CrudTable", () => {
  it("shows loading skeleton while fetching", () => {
    const { container } = render(<CrudTable {...buildProps({ loading: true })} />);

    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("updates page callbacks when a page is selected", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <CrudTable
        {...buildProps({
          onPageChange,
          pageSize: 1,
          paginationMeta: {
            page: 1,
            pageSize: 1,
            total: 2,
            totalPages: 2,
            hasNextPage: true,
            hasPrevPage: false,
          },
        })}
      />,
    );

    const pageTwo = container.querySelector(".ant-pagination-item-2");
    expect(pageTwo).toBeTruthy();
    fireEvent.click(pageTwo as Element);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("sends text column filters to the server-driven callback", () => {
    const onFilterChange = vi.fn();
    render(<CrudTable {...buildProps({ onFilterChange })} />);

    fireEvent.click(screen.getAllByLabelText("Filter Name")[0]);
    fireEvent.change(screen.getByPlaceholderText("Search Name"), {
      target: { value: "Beta" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      field: "name",
      operator: "contains",
      value: "Beta",
    });
  });

  it("sends column sort changes to the server-driven callback", () => {
    const onSortChange = vi.fn();
    render(<CrudTable {...buildProps({ onSortChange })} />);

    fireEvent.click(screen.getAllByLabelText("Sort Name")[0]);

    expect(onSortChange).toHaveBeenCalledWith("name", "asc");
  });

  it("renders 422 field validation near the filter control and clears it on recovery", () => {
    render(
      <StatefulTable
        initialFilters={[{ field: "name", operator: "contains", value: "Alpha" }]}
        initialValidationState={{
          message: "Invalid query parameters.",
          generalErrors: [],
          filterErrorsByField: { name: ["The contains operator is not supported for name."] },
          sortErrorsByField: {},
        }}
      />,
    );

    expect(screen.getByText("Name: Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText("Filter Name")[0]);
    expect(
      screen.getByText("The contains operator is not supported for name."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search Name"), {
      target: { value: "Bravo" },
    });

    expect(
      screen.queryByText("The contains operator is not supported for name."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Name: Bravo")).toBeInTheDocument();
  });

  it("clears server-driven filters and restores the default sort", () => {
    render(
      <StatefulTable
        initialFilters={[{ field: "name", operator: "contains", value: "Alpha" }]}
        initialSortBy="name"
        initialSortOrder="asc"
      />,
    );

    expect(screen.getByText("Name: Alpha")).toBeInTheDocument();
    expect(screen.getByText("Sorted by Name (ascending)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear column filters"));

    expect(screen.queryByText("Name: Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Sorted by Name (ascending)")).not.toBeInTheDocument();
  });
});
