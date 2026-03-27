"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface TableQueryParams {
  page: number;
  pageSize: number;
  search: string;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
}

function getSearchStorageKey(pathname: string): string {
  return `table-query-search:${pathname}`;
}

export function useTableQueryParams(defaultPageSize = 10): TableQueryParams {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchStorageKey = getSearchStorageKey(pathname);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize =
    Number(searchParams.get("pageSize") ?? String(defaultPageSize)) ||
    defaultPageSize;
  const [search, setSearchState] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("search")) {
      return;
    }

    params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const urlSearch = searchParams.get("search") ?? "";
    if (urlSearch) {
      setSearchState(urlSearch);
      window.sessionStorage.setItem(searchStorageKey, urlSearch);
      return;
    }

    const storedSearch = window.sessionStorage.getItem(searchStorageKey) ?? "";
    setSearchState(storedSearch);
  }, [searchParams, searchStorageKey]);

  const setParam = (key: string, value: string) => {
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

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return {
    page,
    pageSize,
    search,
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
  };
}
