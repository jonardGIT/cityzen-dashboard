import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { CrudTable } from "@/components/crud/CrudTable";
import type { BaseEntity } from "@/types/api";

function renderTable(overrides?: Partial<ComponentProps<typeof CrudTable>>) {
  const rows: BaseEntity[] = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Beta" },
  ];

  const props: ComponentProps<typeof CrudTable> = {
    rows,
    loading: false,
    search: "",
    onSearchChange: vi.fn(),
    page: 1,
    pageSize: 1,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    paginationMeta: {
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false,
    },
    columnLabelsByField: undefined,
    selectLabelsByField: undefined,
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    canViewDetails: true,
    canEdit: true,
    canDelete: true,
    ...overrides,
  };

  return {
    ...render(<CrudTable {...props} />),
    props,
  };
}

describe("CrudTable", () => {
  it("shows loading skeleton while fetching", () => {
    const { container } = renderTable({ loading: true });

    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("shows empty state when rows are empty", () => {
    renderTable({ rows: [], paginationMeta: undefined, pageSize: 10 });

    expect(screen.getByText("No records found")).toBeInTheDocument();
  });

  it("updates page callbacks when a page is selected", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { container } = renderTable({ onPageChange, onPageSizeChange });

    const pageTwo = container.querySelector(".ant-pagination-item-2");
    expect(pageTwo).toBeTruthy();

    fireEvent.click(pageTwo as Element);

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it("disables previous button on first page and next button on last page", () => {
    const firstPage = renderTable({ page: 1 });
    expect(firstPage.container.querySelector(".ant-pagination-prev")).toHaveClass("ant-pagination-disabled");
    expect(firstPage.container.querySelector(".ant-pagination-next")).not.toHaveClass("ant-pagination-disabled");

    firstPage.unmount();

    const lastPage = renderTable({
      page: 2,
      paginationMeta: {
        page: 2,
        pageSize: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });

    expect(lastPage.container.querySelector(".ant-pagination-prev")).not.toHaveClass("ant-pagination-disabled");
    expect(lastPage.container.querySelector(".ant-pagination-next")).toHaveClass("ant-pagination-disabled");
  });
});
