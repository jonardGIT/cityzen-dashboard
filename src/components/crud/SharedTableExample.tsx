import React from "react";
import { SharedTable, type SharedTableColumn } from "./SharedTable";
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

const columns: Array<SharedTableColumn<BaseEntity>> = [
  { key: "name", title: "Full Name", filterKind: "text" },
  { key: "age", title: "Age", filterKind: "text" },
  { key: "createdAt", title: "Created At", filterKind: "date", sortable: true },
  { key: "status", title: "Status", filterKind: "select", selectOptions: new Map([
    ["active", "Active"],
    ["inactive", "Inactive"],
  ]) },
];

export default function SharedTableExample() {
  return (
    <div style={{ padding: 24 }}>
      <h2>SharedTable Example</h2>
      <SharedTable
        rows={rows}
        columns={columns}
        loading={false}
        page={1}
        pageSize={20}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        sortState={{ key: "createdAt", order: "desc" }}
        onSortChange={() => undefined}
      />
    </div>
  );
}
