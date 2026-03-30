import { describe, expect, it } from "vitest";
import {
  compareValues,
  createColumnEntries,
  formatFilterTagValue,
  getColumnFilterKind,
  matchesFilter,
  type SimpleResourceColumn,
} from "@/components/common/interactive-table-utils";

type Row = {
  id: string;
  name?: string;
  createdAt?: string;
  status?: string;
  score?: number;
  details?: {
    label?: string;
  };
};

describe("interactive-table-utils", () => {
  const rows: Row[] = [
    {
      id: "1",
      name: "Alpha",
      createdAt: "2026-03-30T10:00:00.000Z",
      status: "active",
      score: 4,
      details: { label: "North" },
    },
    {
      id: "2",
      name: "Bravo",
      createdAt: "2026-03-31T10:00:00.000Z",
      status: "inactive",
      score: 2,
      details: { label: "South" },
    },
  ];

  const columns: SimpleResourceColumn<Row>[] = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Created", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "Status",
      key: "status",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      valueGetter: (row) => row.status,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      filterKind: "number",
    },
    {
      title: "Region",
      dataIndex: ["details", "label"],
      key: "details.label",
    },
  ];

  it("creates column entries with stable ids and labels", () => {
    const entries = createColumnEntries(columns);

    expect(entries.map((entry) => entry.id)).toEqual([
      "name",
      "createdAt",
      "status",
      "score",
      "details.label",
    ]);
    expect(entries.map((entry) => entry.label)).toEqual([
      "Name",
      "Created",
      "Status",
      "Score",
      "Region",
    ]);
  });

  it("detects inferred column filter kinds", () => {
    const entries = createColumnEntries(columns);

    expect(getColumnFilterKind(entries[0], rows)).toBe("text");
    expect(getColumnFilterKind(entries[1], rows)).toBe("date");
    expect(getColumnFilterKind(entries[2], rows)).toBe("select");
    expect(getColumnFilterKind(entries[3], rows)).toBe("number");
  });

  it("matches select and numeric filters against derived values", () => {
    const entries = createColumnEntries(columns);

    expect(
      matchesFilter(
        rows[0],
        entries[2],
        { field: "status", operator: "equals", value: "active" },
        "select",
      ),
    ).toBe(true);
    expect(
      matchesFilter(
        rows[1],
        entries[3],
        { field: "score", operator: "gte", value: 3 },
        "number",
      ),
    ).toBe(false);
  });

  it("sorts dates and text values correctly", () => {
    const entries = createColumnEntries(columns);

    expect(compareValues(rows[0], rows[1], entries[1], "date")).toBeLessThan(0);
    expect(compareValues(rows[0], rows[1], entries[0], "text")).toBeLessThan(0);
  });

  it("formats filter tag values using option labels", () => {
    const labels = new Map([
      ["active", "Active"],
      ["inactive", "Inactive"],
    ]);

    expect(
      formatFilterTagValue(
        { field: "status", operator: "in", value: ["active", "inactive"] },
        labels,
      ),
    ).toBe("Active, Inactive");
  });
});
