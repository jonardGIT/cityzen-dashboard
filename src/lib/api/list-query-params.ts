export type ListSortBy = string;
export type ListSortOrder = "asc" | "desc";
export type ListFilterOperator =
  | "equals"
  | "contains"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between";

export type ListFilterPrimitive = string | number | boolean;
export type ListFilterValue = ListFilterPrimitive | ListFilterPrimitive[];

export interface ListFilter {
  field: string;
  operator: ListFilterOperator;
  value: ListFilterValue;
}

export interface ListQueryState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: ListSortBy;
  sortOrder: ListSortOrder;
  filters: ListFilter[];
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export type FetchListParams = ListQueryState;

export const DEFAULT_SORT_BY: ListSortBy = "createdAt";
export const DEFAULT_SORT_ORDER: ListSortOrder = "desc";
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export const DEFAULT_LIST_QUERY_STATE: ListQueryState = {
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  sortBy: DEFAULT_SORT_BY,
  sortOrder: DEFAULT_SORT_ORDER,
  filters: [],
};

const VALID_FILTER_OPERATORS: ListFilterOperator[] = [
  "equals",
  "contains",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
];

function isFilterPrimitive(value: unknown): value is ListFilterPrimitive {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isListFilterValue(value: unknown): value is ListFilterValue {
  if (isFilterPrimitive(value)) {
    return true;
  }

  return Array.isArray(value) && value.every(isFilterPrimitive);
}

function isListFilterOperator(value: unknown): value is ListFilterOperator {
  return (
    typeof value === "string" &&
    VALID_FILTER_OPERATORS.includes(value as ListFilterOperator)
  );
}

export function serializeListFilters(filters: ListFilter[]): string | undefined {
  if (filters.length === 0) {
    return undefined;
  }

  return JSON.stringify(filters);
}

export function parseListFilters(value: string | null | undefined): ListFilter[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ListFilter => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const record = item as Record<string, unknown>;
      return (
        typeof record.field === "string" &&
        record.field.trim().length > 0 &&
        isListFilterOperator(record.operator) &&
        isListFilterValue(record.value)
      );
    });
  } catch {
    return [];
  }
}

export function buildListQueryParams(
  params: FetchListParams,
): Record<string, string | number> {
  const result: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  if (params.search.trim()) result.search = params.search.trim();
  const serializedFilters = serializeListFilters(params.filters);
  if (serializedFilters) result.filters = serializedFilters;
  if (params.createdFrom) result.createdFrom = params.createdFrom;
  if (params.createdTo) result.createdTo = params.createdTo;
  if (params.updatedFrom) result.updatedFrom = params.updatedFrom;
  if (params.updatedTo) result.updatedTo = params.updatedTo;

  return result;
}

export function hasActiveDateFilters(state: ListQueryState): boolean {
  return Boolean(
    state.createdFrom ||
    state.createdTo ||
    state.updatedFrom ||
    state.updatedTo,
  );
}
