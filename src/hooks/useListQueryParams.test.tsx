import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListQueryParams } from "@/hooks/useListQueryParams";

const replaceMock = vi.fn();
let params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/incidents",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
  }),
}));

function Harness() {
  const state = useListQueryParams(20);

  return (
    <div>
      <div data-testid="state">{`${state.page}|${state.pageSize}|${state.sortBy}|${state.sortOrder}|${state.filters.length}|${state.search}`}</div>
      <button onClick={() => state.setSort("updatedAt", "desc")}>
        quick-filter
      </button>
      <button
        onClick={() =>
          state.upsertFilter({
            field: "name",
            operator: "contains",
            value: "fire",
          })
        }
      >
        apply-filter
      </button>
      <button
        onClick={() =>
          state.setCreatedRange(
            "2026-03-20T00:00:00.000Z",
            "2026-03-20T23:59:59.999Z",
          )
        }
      >
        created-range
      </button>
      <button onClick={() => state.setSearch("fire")}>search</button>
    </div>
  );
}

describe("useListQueryParams", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    params = new URLSearchParams(
      "page=3&pageSize=20&sortBy=createdAt&sortOrder=desc",
    );
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  it("updates sort fields together and resets page for quick filter switching", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("quick-filter"));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=updatedAt&sortOrder=desc",
    );
  });

  it("debounces created date range updates", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("created-range"));
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&createdFrom=2026-03-20T00%3A00%3A00.000Z&createdTo=2026-03-20T23%3A59%3A59.999Z",
    );
  });

  it("encodes filters as JSON and resets the page", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("apply-filter"));

    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&filters=%5B%7B%22field%22%3A%22name%22%2C%22operator%22%3A%22contains%22%2C%22value%22%3A%22fire%22%7D%5D",
    );
  });

  it("stores search in session storage and only resets the page in the URL", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("search"));
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc",
    );
    expect(window.sessionStorage.getItem("list-query-search:/incidents")).toBe(
      "fire",
    );
    expect(screen.getByTestId("state").textContent).toBe(
      "3|20|createdAt|desc|0|fire",
    );
  });

  it("supports custom default sorting for pages that do not use createdAt", () => {
    params = new URLSearchParams("page=1&pageSize=20");

    function CustomSortHarness() {
      const state = useListQueryParams({
        defaultPageSize: 20,
        defaultSortBy: "timestamp",
        defaultSortOrder: "desc",
      });

      return (
        <div data-testid="custom-state">{`${state.sortBy}|${state.sortOrder}`}</div>
      );
    }

    render(<CustomSortHarness />);

    expect(screen.getByTestId("custom-state").textContent).toBe(
      "timestamp|desc",
    );
    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc",
    );
  });
});
