"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_LIST_QUERY_STATE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
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
  setCreatedFrom: (value: string | undefined) => void;
  setCreatedTo: (value: string | undefined) => void;
  setUpdatedFrom: (value: string | undefined) => void;
  setUpdatedTo: (value: string | undefined) => void;
  setCreatedRange: (from: string | undefined, to: string | undefined) => void;
  setUpdatedRange: (from: string | undefined, to: string | undefined) => void;
  clearDateFilters: () => void;
}

export type ListQueryResult = ListQueryState & ListQuerySetters;

export function useListQueryParams(defaultPageSize = DEFAULT_PAGE_SIZE): ListQueryResult {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = Number(searchParams.get("page") ?? String(DEFAULT_PAGE)) || DEFAULT_PAGE;
  const pageSize =
    Number(searchParams.get("pageSize") ?? String(defaultPageSize)) || defaultPageSize;
  const search = searchParams.get("search") ?? "";
  const sortBy = (searchParams.get("sortBy") ?? DEFAULT_SORT_BY) as ListSortBy;
  const sortOrder = (searchParams.get("sortOrder") ?? DEFAULT_SORT_ORDER) as ListSortOrder;
  const createdFrom = searchParams.get("createdFrom") ?? undefined;
  const createdTo = searchParams.get("createdTo") ?? undefined;
  const updatedFrom = searchParams.get("updatedFrom") ?? undefined;
  const updatedTo = searchParams.get("updatedTo") ?? undefined;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (!params.get("sortBy")) {
      params.set("sortBy", DEFAULT_SORT_BY);
      changed = true;
    }

    if (!params.get("sortOrder")) {
      params.set("sortOrder", DEFAULT_SORT_ORDER);
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

    if (!changed) {
      return;
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, [defaultPageSize, pathname, router, searchParams]);

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

    router.replace(`${pathname}?${params.toString()}`);
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
    router.replace(`${pathname}?${params.toString()}`);
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
    sortBy: sortBy ?? DEFAULT_LIST_QUERY_STATE.sortBy,
    sortOrder: sortOrder ?? DEFAULT_LIST_QUERY_STATE.sortOrder,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    setPage: (value: number) => setParam("page", String(value)),
    setPageSize: (value: number) => setParam("pageSize", String(value)),
    setSearch: (value: string) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setParam("search", value);
      }, 300);
    },
    setSort: (nextSortBy: ListSortBy, nextSortOrder: ListSortOrder) =>
      setParamBatch({ sortBy: nextSortBy, sortOrder: nextSortOrder }),
    setSortBy: (value: ListSortBy) => setParam("sortBy", value),
    setSortOrder: (value: ListSortOrder) => setParam("sortOrder", value),
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
