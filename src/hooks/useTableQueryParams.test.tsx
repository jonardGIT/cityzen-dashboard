import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTableQueryParams } from "@/hooks/useTableQueryParams";

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
  const state = useTableQueryParams(10);

  return (
    <div>
      <div data-testid="state">{`${state.page}|${state.pageSize}|${state.search}`}</div>
      <button onClick={() => state.setPageSize(25)}>size</button>
      <button onClick={() => state.setSearch("fire")}>search</button>
    </div>
  );
}

describe("useTableQueryParams", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    params = new URLSearchParams("page=3&pageSize=10");
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  it("resets page to 1 when page size changes", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("size"));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/incidents?page=1&pageSize=25");
  });

  it("debounces search updates", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("search"));
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(replaceMock).toHaveBeenCalledWith("/incidents?page=1&pageSize=10");
    expect(window.sessionStorage.getItem("table-query-search:/incidents")).toBe(
      "fire",
    );
    expect(screen.getByTestId("state").textContent).toBe("3|10|fire");
  });
});
