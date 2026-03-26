export type ListSortBy = "createdAt" | "updatedAt";
export type ListSortOrder = "asc" | "desc";

export interface ListQueryState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: ListSortBy;
  sortOrder: ListSortOrder;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export type FetchListParams = Omit<ListQueryState, "search">;

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
};

export function buildListQueryParams(params: FetchListParams): Record<string, string | number> {
  const result: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  if (params.createdFrom) result.createdFrom = params.createdFrom;
  if (params.createdTo) result.createdTo = params.createdTo;
  if (params.updatedFrom) result.updatedFrom = params.updatedFrom;
  if (params.updatedTo) result.updatedTo = params.updatedTo;

  return result;
}

export function hasActiveDateFilters(state: ListQueryState): boolean {
  return Boolean(state.createdFrom || state.createdTo || state.updatedFrom || state.updatedTo);
}
