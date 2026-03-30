"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_LIST_QUERY_STATE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  parseListFilters,
  serializeListFilters,
  type ListFilter,
  type ListSortBy,
  type ListSortOrder,
  type ListQueryState,
} from "@/lib/api/list-query-params";

export interface ListQuerySetters {
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
  setSort: (sortBy: ListSortBy, sortOrder: ListSortOrder) => void;
  setSortBy: (value: ListSortBy) => void;
  setSortOrder: (value: ListSortOrder) => void;
  setFilters: (value: ListFilter[]) => void;
  upsertFilter: (value: ListFilter) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  setCreatedFrom: (value: string | undefined) => void;
  setCreatedTo: (value: string | undefined) => void;
  setUpdatedFrom: (value: string | undefined) => void;
  setUpdatedTo: (value: string | undefined) => void;
  setCreatedRange: (from: string | undefined, to: string | undefined) => void;
  setUpdatedRange: (from: string | undefined, to: string | undefined) => void;
  clearDateFilters: () => void;
}

export type ListQueryResult = ListQueryState & ListQuerySetters;

export interface UseListQueryParamsOptions {
  defaultPageSize?: number;
  defaultSortBy?: ListSortBy;
  defaultSortOrder?: ListSortOrder;
}

function resolveOptions(
  options?: number | UseListQueryParamsOptions,
): Required<UseListQueryParamsOptions> {
  if (typeof options === "number") {
    return {
      defaultPageSize: options,
      defaultSortBy: DEFAULT_SORT_BY,
      defaultSortOrder: DEFAULT_SORT_ORDER,
    };
  }

  return {
    defaultPageSize: options?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
    defaultSortBy: options?.defaultSortBy ?? DEFAULT_SORT_BY,
    defaultSortOrder: options?.defaultSortOrder ?? DEFAULT_SORT_ORDER,
  };
}

function getSearchStorageKey(pathname: string): string {
  return `list-query-search:${pathname}`;
}

function getInitialSearchValue(
  searchParams: ReadonlyURLSearchParams,
  searchStorageKey: string,
): string {
  const urlSearch = searchParams.get("search") ?? "";
  if (urlSearch) {
    return urlSearch;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(searchStorageKey) ?? "";
}

export function useListQueryParams(
  options?: number | UseListQueryParamsOptions,
): ListQueryResult {
  const { defaultPageSize, defaultSortBy, defaultSortOrder } =
    resolveOptions(options);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchStorageKey = getSearchStorageKey(pathname);

  const page =
    Number(searchParams.get("page") ?? String(DEFAULT_PAGE)) || DEFAULT_PAGE;
  const pageSize =
    Number(searchParams.get("pageSize") ?? String(defaultPageSize)) ||
    defaultPageSize;
  const [search, setSearchState] = useState(() =>
    getInitialSearchValue(searchParams, searchStorageKey),
  );
  const sortBy = (searchParams.get("sortBy") ?? defaultSortBy) as ListSortBy;
  const sortOrder = (searchParams.get("sortOrder") ??
    defaultSortOrder) as ListSortOrder;
  const filters = parseListFilters(searchParams.get("filters"));
  const createdFrom = searchParams.get("createdFrom") ?? undefined;
  const createdTo = searchParams.get("createdTo") ?? undefined;
  const updatedFrom = searchParams.get("updatedFrom") ?? undefined;
  const updatedTo = searchParams.get("updatedTo") ?? undefined;

  const replaceIfChanged = useCallback(
    (params: URLSearchParams) => {
      const current = searchParams.toString();
      const next = params.toString();

      if (current === next) {
        return;
      }

      if (!next) {
        router.replace(pathname);
        return;
      }

      router.replace(`${pathname}?${next}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (!params.get("sortBy")) {
      params.set("sortBy", defaultSortBy);
      changed = true;
    }

    if (!params.get("sortOrder")) {
      params.set("sortOrder", defaultSortOrder);
      changed = true;
    }

    if (!params.get("page")) {
      params.set("page", String(DEFAULT_PAGE));
      changed = true;
    }

    if (!params.get("pageSize")) {
      params.set("pageSize", String(defaultPageSize));
      changed = true;
    }

    if (params.get("search")) {
      params.delete("search");
      changed = true;
    }

    if (!changed) {
      return;
    }

    replaceIfChanged(params);
  }, [
    defaultPageSize,
    defaultSortBy,
    defaultSortOrder,
    replaceIfChanged,
    searchParams,
  ]);

  const setParam = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    if (key !== "page") {
      params.set("page", "1");
    }

    replaceIfChanged(params);
  };

  const setParamBatch = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    params.set("page", "1");
    replaceIfChanged(params);
  };

  const setParamBatchDebounced = (
    updates: Record<string, string | undefined>,
    timeoutMs: number,
  ) => {
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
    }

    dateDebounceRef.current = setTimeout(() => {
      setParamBatch(updates);
    }, timeoutMs);
  };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (dateDebounceRef.current) {
        clearTimeout(dateDebounceRef.current);
      }
    };
  }, []);

  return {
    page,
    pageSize,
    search,
    sortBy: sortBy ?? defaultSortBy ?? DEFAULT_LIST_QUERY_STATE.sortBy,
    sortOrder:
      sortOrder ?? defaultSortOrder ?? DEFAULT_LIST_QUERY_STATE.sortOrder,
    filters,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    setPage: (value: number) => setParam("page", String(value)),
    setPageSize: (value: number) => setParam("pageSize", String(value)),
    setSearch: (value: string) => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      searchDebounceRef.current = setTimeout(() => {
        const nextValue = value.trim();
        setSearchState(nextValue);

        if (typeof window !== "undefined") {
          if (nextValue) {
            window.sessionStorage.setItem(searchStorageKey, nextValue);
          } else {
            window.sessionStorage.removeItem(searchStorageKey);
          }
        }

        setParam("page", "1");
      }, 300);
    },
    setSort: (nextSortBy: ListSortBy, nextSortOrder: ListSortOrder) =>
      setParamBatch({ sortBy: nextSortBy, sortOrder: nextSortOrder }),
    setSortBy: (value: ListSortBy) => setParam("sortBy", value),
    setSortOrder: (value: ListSortOrder) => setParam("sortOrder", value),
    setFilters: (value: ListFilter[]) =>
      setParam("filters", serializeListFilters(value)),
    upsertFilter: (value: ListFilter) => {
      const nextFilters = [
        ...filters.filter((filter) => filter.field !== value.field),
        value,
      ];
      setParam("filters", serializeListFilters(nextFilters));
    },
    removeFilter: (field: string) => {
      const nextFilters = filters.filter((filter) => filter.field !== field);
      setParam("filters", serializeListFilters(nextFilters));
    },
    clearFilters: () => setParam("filters", undefined),
    setCreatedFrom: (value?: string) => setParam("createdFrom", value),
    setCreatedTo: (value?: string) => setParam("createdTo", value),
    setUpdatedFrom: (value?: string) => setParam("updatedFrom", value),
    setUpdatedTo: (value?: string) => setParam("updatedTo", value),
    setCreatedRange: (from, to) =>
      setParamBatchDebounced({ createdFrom: from, createdTo: to }, 300),
    setUpdatedRange: (from, to) =>
      setParamBatchDebounced({ updatedFrom: from, updatedTo: to }, 300),
    clearDateFilters: () =>
      setParamBatch({
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
      }),
  };
}
