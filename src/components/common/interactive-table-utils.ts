import type { ColumnType } from "antd/es/table";
import type {
  ListFilter,
  ListFilterOperator,
} from "@/lib/api/list-query-params";
import {
  formatDisplayValue,
  humanizeKey,
  isDateLikeFieldName,
} from "@/lib/format/display";
import { formatDateLikeString } from "@/lib/format/date-time";

export type SimpleColumnFilterKind = "text" | "number" | "date" | "select";

export type SimpleColumnOption = {
  label: string;
  value: string;
};

export type SimpleResourceColumn<
  T extends { id: string; [key: string]: unknown },
> = ColumnType<T> & {
  filterKind?: SimpleColumnFilterKind;
  filterOptions?: SimpleColumnOption[];
  valueGetter?: (record: T) => unknown;
  sortable?: boolean;
  filterable?: boolean;
};

export type ColumnEntry<T extends { id: string; [key: string]: unknown }> = {
  id: string;
  label: string;
  column: SimpleResourceColumn<T>;
};

export function getColumnId<T extends { id: string; [key: string]: unknown }>(
  column: SimpleResourceColumn<T>,
  index: number,
): string {
  if (column.key != null) {
    return String(column.key);
  }

  if (Array.isArray(column.dataIndex)) {
    return column.dataIndex.join(".");
  }

  if (column.dataIndex != null) {
    return String(column.dataIndex);
  }

  return `column-${index}`;
}

export function getColumnLabel<
  T extends { id: string; [key: string]: unknown },
>(column: SimpleResourceColumn<T>, columnId: string): string {
  return typeof column.title === "string"
    ? column.title
    : humanizeKey(columnId);
}

export function getValueFromDataIndex<
  T extends { id: string; [key: string]: unknown },
>(record: T, dataIndex: ColumnType<T>["dataIndex"]): unknown {
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[String(segment)];
    }, record);
  }

  if (dataIndex == null) {
    return undefined;
  }

  return record[String(dataIndex)];
}

export function getColumnValue<
  T extends { id: string; [key: string]: unknown },
>(record: T, column: SimpleResourceColumn<T>, columnId: string): unknown {
  if (column.valueGetter) {
    return column.valueGetter(record);
  }

  const dataIndexValue = getValueFromDataIndex(record, column.dataIndex);
  if (dataIndexValue !== undefined) {
    return dataIndexValue;
  }

  return record[columnId];
}

export function getColumnFilterKind<
  T extends { id: string; [key: string]: unknown },
>(entry: ColumnEntry<T>, rows: T[]): SimpleColumnFilterKind {
  if (entry.column.filterKind) {
    return entry.column.filterKind;
  }

  if (entry.column.filterOptions?.length) {
    return "select";
  }

  const sample = rows.find((row) => {
    const value = getColumnValue(row, entry.column, entry.id);
    return value !== undefined && value !== null && value !== "";
  });
  const sampleValue = sample
    ? getColumnValue(sample, entry.column, entry.id)
    : undefined;

  if (typeof sampleValue === "number") {
    return "number";
  }

  if (typeof sampleValue === "string" && formatDateLikeString(sampleValue)) {
    return "date";
  }

  if (isDateLikeFieldName(entry.id)) {
    return "date";
  }

  return "text";
}

export function getDefaultOperator(
  kind: SimpleColumnFilterKind,
): ListFilterOperator {
  switch (kind) {
    case "date":
      return "between";
    case "number":
      return "equals";
    case "select":
      return "equals";
    default:
      return "contains";
  }
}

export function getOperatorOptions(kind: SimpleColumnFilterKind): Array<{
  label: string;
  value: ListFilterOperator;
}> {
  switch (kind) {
    case "date":
      return [
        { label: "Equals", value: "equals" },
        { label: "After", value: "gt" },
        { label: "On or after", value: "gte" },
        { label: "Before", value: "lt" },
        { label: "On or before", value: "lte" },
        { label: "Between", value: "between" },
      ];
    case "number":
      return [
        { label: "Equals", value: "equals" },
        { label: "Greater than", value: "gt" },
        { label: "At least", value: "gte" },
        { label: "Less than", value: "lt" },
        { label: "At most", value: "lte" },
        { label: "In", value: "in" },
      ];
    case "select":
      return [
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ];
    default:
      return [
        { label: "Contains", value: "contains" },
        { label: "Equals", value: "equals" },
        { label: "In", value: "in" },
      ];
  }
}

export function formatFilterTagValue(
  filter: ListFilter,
  optionLabels?: Map<string, string>,
): string {
  if (Array.isArray(filter.value)) {
    return filter.value
      .map((value) => formatDisplayValue(value, optionLabels))
      .join(filter.operator === "between" ? " to " : ", ");
  }

  return formatDisplayValue(filter.value, optionLabels);
}

export function matchesFilter<T extends { id: string; [key: string]: unknown }>(
  row: T,
  entry: ColumnEntry<T>,
  filter: ListFilter,
  kind: SimpleColumnFilterKind,
): boolean {
  const value = getColumnValue(row, entry.column, entry.id);

  if (kind === "date") {
    const candidate = typeof value === "string" ? Date.parse(value) : Number.NaN;
    if (Number.isNaN(candidate)) {
      return false;
    }

    if (filter.operator === "between" && Array.isArray(filter.value)) {
      if (filter.value.length !== 2) {
        return true;
      }

      const start = Date.parse(String(filter.value[0]));
      const end = Date.parse(String(filter.value[1]));
      return !Number.isNaN(start) && !Number.isNaN(end)
        ? candidate >= start && candidate <= end
        : true;
    }

    const target = Date.parse(String(filter.value));
    if (Number.isNaN(target)) {
      return true;
    }

    switch (filter.operator) {
      case "equals":
        return candidate === target;
      case "gt":
        return candidate > target;
      case "gte":
        return candidate >= target;
      case "lt":
        return candidate < target;
      case "lte":
        return candidate <= target;
      default:
        return true;
    }
  }

  if (kind === "number") {
    const candidate = Number(value);
    if (Number.isNaN(candidate)) {
      return false;
    }

    if (filter.operator === "in" && Array.isArray(filter.value)) {
      return filter.value.some((item) => Number(item) === candidate);
    }

    const target = Number(filter.value);
    if (Number.isNaN(target)) {
      return true;
    }

    switch (filter.operator) {
      case "equals":
        return candidate === target;
      case "gt":
        return candidate > target;
      case "gte":
        return candidate >= target;
      case "lt":
        return candidate < target;
      case "lte":
        return candidate <= target;
      default:
        return true;
    }
  }

  const candidate = formatDisplayValue(value).toLowerCase();

  if (filter.operator === "in" && Array.isArray(filter.value)) {
    return filter.value
      .map((item) => String(item).toLowerCase())
      .includes(candidate);
  }

  const target = String(filter.value).toLowerCase();
  switch (filter.operator) {
    case "equals":
      return candidate === target;
    case "contains":
      return candidate.includes(target);
    default:
      return true;
  }
}

export function compareValues<T extends { id: string; [key: string]: unknown }>(
  left: T,
  right: T,
  entry: ColumnEntry<T>,
  kind: SimpleColumnFilterKind,
): number {
  const leftValue = getColumnValue(left, entry.column, entry.id);
  const rightValue = getColumnValue(right, entry.column, entry.id);

  if (kind === "date") {
    const leftDate = typeof leftValue === "string" ? Date.parse(leftValue) : Number.NaN;
    const rightDate = typeof rightValue === "string" ? Date.parse(rightValue) : Number.NaN;

    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
      return 0;
    }

    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    return leftDate - rightDate;
  }

  if (kind === "number") {
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);

    if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) {
      return 0;
    }

    if (Number.isNaN(leftNumber)) {
      return 1;
    }

    if (Number.isNaN(rightNumber)) {
      return -1;
    }

    return leftNumber - rightNumber;
  }

  return formatDisplayValue(leftValue).localeCompare(
    formatDisplayValue(rightValue),
    undefined,
    {
      sensitivity: "base",
    },
  );
}

export function createColumnEntries<
  T extends { id: string; [key: string]: unknown },
>(columns: SimpleResourceColumn<T>[]): Array<ColumnEntry<T>> {
  return columns.map((column, index) => {
    const id = getColumnId(column, index);
    return {
      id,
      label: getColumnLabel(column, id),
      column,
    };
  });
}

export function createOptionLabelsByField<
  T extends { id: string; [key: string]: unknown },
>(columnEntries: Array<ColumnEntry<T>>): Map<string, Map<string, string>> {
  return new Map(
    columnEntries
      .filter((entry) => entry.column.filterOptions?.length)
      .map((entry) => [
        entry.id,
        new Map(
          (entry.column.filterOptions ?? []).map((option) => [
            option.value,
            option.label,
          ]),
        ),
      ] as const),
  );
}