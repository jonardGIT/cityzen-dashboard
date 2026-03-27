import React from "react";
import { SharedTable } from "./SharedTable";
import type { BaseEntity } from "@/types/api";

// Example data
const rows: BaseEntity[] = [
  {
    id: "1",
    name: "Alice",
    age: 30,
    createdAt: "2024-01-01T10:00:00Z",
    status: "active",
  },
  {
    id: "2",
    name: "Bob",
    age: 25,
    createdAt: "2024-02-15T12:30:00Z",
    status: "inactive",
  },
  {
    id: "3",
    name: "Charlie",
    age: 35,
    createdAt: "2024-03-10T09:15:00Z",
    status: "active",
  },
];

const columns = ["name", "age", "createdAt", "status"];

const columnLabels = {
  name: "Full Name",
  age: "Age",
  createdAt: "Created At",
  status: "Status",
};

const selectLabelsByField = {
  status: new Map([
    ["active", "Active"],
    ["inactive", "Inactive"],
  ]),
};

export default function SharedTableExample() {
  return (
    <div style={{ padding: 24 }}>
      <h2>SharedTable Example</h2>
      <SharedTable
        rows={rows}
        columns={columns}
        columnLabels={columnLabels}
        selectLabelsByField={selectLabelsByField}
        storageKey="shared-table-example-widths"
        loading={false}
      />
    </div>
  );
}
