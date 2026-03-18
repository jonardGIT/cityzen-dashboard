"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface TableQueryParams {
  page: number;
  pageSize: number;
  search: string;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
}

export function useTableQueryParams(defaultPageSize = 10): TableQueryParams {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? String(defaultPageSize)) || defaultPageSize;
  const search = searchParams.get("search") ?? "";

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

  return {
    page,
    pageSize,
    search,
    setPage: (value: number) => setParam("page", String(value)),
    setPageSize: (value: number) => setParam("pageSize", String(value)),
    setSearch: (value: string) => setParam("search", value),
  };
}
