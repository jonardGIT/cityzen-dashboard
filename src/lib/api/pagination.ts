export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

function toSafePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function adaptPaginatedResponse<T>(
  payload: unknown,
  requestedPage: number,
  requestedPageSize: number,
): PaginatedResponse<T> {
  const page = toSafePositiveInt(requestedPage, 1);
  const pageSize = toSafePositiveInt(requestedPageSize, 10);

  if (Array.isArray(payload)) {
    const total = payload.length;
    const totalPages = total > 0 ? 1 : 0;
    return {
      data: payload as T[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },
    };
  }

  const record = payload as Record<string, unknown>;
  const list = Array.isArray(record.data) ? (record.data as T[]) : [];
  const meta = record.pagination as Record<string, unknown> | undefined;

  if (!meta) {
    const total = list.length;
    const totalPages = total > 0 ? 1 : 0;
    return {
      data: list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },
    };
  }

  const total = toSafePositiveInt(meta.total, list.length);
  const totalPages = toSafePositiveInt(meta.totalPages, total > 0 ? Math.ceil(total / pageSize) : 0);
  const normalizedPage = toSafePositiveInt(meta.page, page);
  const normalizedPageSize = toSafePositiveInt(meta.pageSize, pageSize);
  const hasPrevPage = typeof meta.hasPrevPage === "boolean" ? meta.hasPrevPage : normalizedPage > 1;
  const hasNextPage =
    typeof meta.hasNextPage === "boolean"
      ? meta.hasNextPage
      : totalPages > 0 && normalizedPage < totalPages;

  return {
    data: list,
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
}