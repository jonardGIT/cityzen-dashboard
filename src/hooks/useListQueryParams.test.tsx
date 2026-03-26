import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
      <div data-testid="state">{`${state.page}|${state.pageSize}|${state.sortBy}|${state.sortOrder}`}</div>
      <button onClick={() => state.setSort("updatedAt", "desc")}>quick-filter</button>
      <button
        onClick={() =>
          state.setCreatedRange("2026-03-20T00:00:00.000Z", "2026-03-20T23:59:59.999Z")
        }
      >
        created-range
      </button>
    </div>
  );
}

describe("useListQueryParams", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    params = new URLSearchParams("page=3&pageSize=20&sortBy=createdAt&sortOrder=desc");
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

    vi.advanceTimersByTime(299);
    expect(replaceMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceMock).toHaveBeenCalledWith(
      "/incidents?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&createdFrom=2026-03-20T00%3A00%3A00.000Z&createdTo=2026-03-20T23%3A59%3A59.999Z",
    );
  });
});
