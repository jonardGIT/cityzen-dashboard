import { useQuery } from "@tanstack/react-query";
import { createAuthenticatedClient } from "@/lib/api/clients";
import {
  buildListQueryParams,
  DEFAULT_LIST_QUERY_STATE,
  type FetchListParams,
  type ListFilter,
} from "@/lib/api/list-query-params";
import {
  adaptPaginatedResponse,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import type { Barangay, CityMunicipality, Province, Region } from "@/types/api";

type GeographyListOptions = Partial<FetchListParams>;

interface ProvincesListOptions extends GeographyListOptions {
  regionId?: string;
}

interface CitiesMunicipalitiesListOptions extends GeographyListOptions {
  provinceId?: string;
}

interface BarangaysListOptions extends GeographyListOptions {
  cityMunicipalityId?: string;
}

const geographyApiClient = createAuthenticatedClient("/api");

const DEFAULT_GEOGRAPHY_LIST_PARAMS: FetchListParams = {
  ...DEFAULT_LIST_QUERY_STATE,
  pageSize: 100,
  sortBy: "name",
  sortOrder: "asc",
};

export const userGeographyQueryKeys = {
  all: () => ["users", "geography"] as const,
  regions: (params: FetchListParams) =>
    ["users", "geography", "regions", params] as const,
  regionDetail: (regionId: string) =>
    ["users", "geography", "regions", "detail", regionId] as const,
  provinces: (params: FetchListParams) =>
    ["users", "geography", "provinces", params] as const,
  provinceDetail: (provinceId: string) =>
    ["users", "geography", "provinces", "detail", provinceId] as const,
  citiesMunicipalities: (params: FetchListParams) =>
    ["users", "geography", "cities-municipalities", params] as const,
  cityMunicipalityDetail: (cityMunicipalityId: string) =>
    [
      "users",
      "geography",
      "cities-municipalities",
      "detail",
      cityMunicipalityId,
    ] as const,
  barangays: (params: FetchListParams) =>
    ["users", "geography", "barangays", params] as const,
  barangayDetail: (barangayId: string) =>
    ["users", "geography", "barangays", "detail", barangayId] as const,
};

function appendCascadeFilter(
  filters: ListFilter[],
  field: string,
  value?: string,
): ListFilter[] {
  if (!value) {
    return filters;
  }

  return [
    ...filters.filter((filter) => filter.field !== field),
    {
      field,
      operator: "equals",
      value,
    },
  ];
}

function buildGeographyListParams(
  options?: GeographyListOptions,
  cascadeFilter?: {
    field: string;
    value?: string;
  },
): FetchListParams {
  const params: FetchListParams = {
    ...DEFAULT_GEOGRAPHY_LIST_PARAMS,
    ...options,
    filters: options?.filters ? [...options.filters] : [],
  };

  if (!cascadeFilter) {
    return params;
  }

  return {
    ...params,
    filters: appendCascadeFilter(
      params.filters,
      cascadeFilter.field,
      cascadeFilter.value,
    ),
  };
}

async function fetchGeographyList<T>(
  path: string,
  params: FetchListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<T>> {
  const response = await geographyApiClient.get<unknown>(path, {
    params: buildListQueryParams(params),
    signal,
  });

  return adaptPaginatedResponse<T>(response.data, params.page, params.pageSize);
}

async function fetchGeographyEntityById<T>(
  path: string,
  id: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const response = await fetchGeographyList<T>(
    path,
    buildGeographyListParams({
      page: 1,
      pageSize: 1,
      filters: [
        {
          field: "id",
          operator: "equals",
          value: id,
        },
      ],
    }),
    signal,
  );

  return response.data[0] ?? null;
}

export async function fetchRegions(
  options?: GeographyListOptions,
  signal?: AbortSignal,
) {
  const params = buildGeographyListParams(options);
  return fetchGeographyList<Region>("/regions", params, signal);
}

export async function fetchProvinces(
  options?: ProvincesListOptions,
  signal?: AbortSignal,
) {
  const params = buildGeographyListParams(options, {
    field: "regionId",
    value: options?.regionId,
  });
  return fetchGeographyList<Province>("/provinces", params, signal);
}

export async function fetchCitiesMunicipalities(
  options?: CitiesMunicipalitiesListOptions,
  signal?: AbortSignal,
) {
  const params = buildGeographyListParams(options, {
    field: "provinceId",
    value: options?.provinceId,
  });
  return fetchGeographyList<CityMunicipality>(
    "/cities-municipalities",
    params,
    signal,
  );
}

export async function fetchRegionById(regionId: string, signal?: AbortSignal) {
  return fetchGeographyEntityById<Region>("/regions", regionId, signal);
}

export async function fetchProvinceById(
  provinceId: string,
  signal?: AbortSignal,
) {
  return fetchGeographyEntityById<Province>("/provinces", provinceId, signal);
}

export async function fetchCityMunicipalityById(
  cityMunicipalityId: string,
  signal?: AbortSignal,
) {
  return fetchGeographyEntityById<CityMunicipality>(
    "/cities-municipalities",
    cityMunicipalityId,
    signal,
  );
}

export async function fetchBarangayById(
  barangayId: string,
  signal?: AbortSignal,
) {
  return fetchGeographyEntityById<Barangay>("/barangays", barangayId, signal);
}

export async function fetchBarangays(
  options?: BarangaysListOptions,
  signal?: AbortSignal,
) {
  const params = buildGeographyListParams(options, {
    field: "cityMunicipalityId",
    value: options?.cityMunicipalityId,
  });
  return fetchGeographyList<Barangay>("/barangays", params, signal);
}

export function useRegionsQuery(
  options?: GeographyListOptions,
  enabled = true,
) {
  const params = buildGeographyListParams(options);

  return useQuery({
    queryKey: userGeographyQueryKeys.regions(params),
    queryFn: ({ signal }) => fetchRegions(options, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useRegionByIdQuery(regionId?: string, enabled = true) {
  return useQuery({
    queryKey: userGeographyQueryKeys.regionDetail(regionId ?? ""),
    queryFn: ({ signal }) => fetchRegionById(regionId!, signal),
    enabled: enabled && Boolean(regionId),
  });
}

export function useProvincesQuery(
  options?: ProvincesListOptions,
  enabled = true,
) {
  const params = buildGeographyListParams(options, {
    field: "regionId",
    value: options?.regionId,
  });

  return useQuery({
    queryKey: userGeographyQueryKeys.provinces(params),
    queryFn: ({ signal }) => fetchProvinces(options, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useProvinceByIdQuery(provinceId?: string, enabled = true) {
  return useQuery({
    queryKey: userGeographyQueryKeys.provinceDetail(provinceId ?? ""),
    queryFn: ({ signal }) => fetchProvinceById(provinceId!, signal),
    enabled: enabled && Boolean(provinceId),
  });
}

export function useCitiesMunicipalitiesQuery(
  options?: CitiesMunicipalitiesListOptions,
  enabled = true,
) {
  const params = buildGeographyListParams(options, {
    field: "provinceId",
    value: options?.provinceId,
  });

  return useQuery({
    queryKey: userGeographyQueryKeys.citiesMunicipalities(params),
    queryFn: ({ signal }) => fetchCitiesMunicipalities(options, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useCityMunicipalityByIdQuery(
  cityMunicipalityId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: userGeographyQueryKeys.cityMunicipalityDetail(
      cityMunicipalityId ?? "",
    ),
    queryFn: ({ signal }) =>
      fetchCityMunicipalityById(cityMunicipalityId!, signal),
    enabled: enabled && Boolean(cityMunicipalityId),
  });
}

export function useBarangaysQuery(
  options?: BarangaysListOptions,
  enabled = true,
) {
  const params = buildGeographyListParams(options, {
    field: "cityMunicipalityId",
    value: options?.cityMunicipalityId,
  });

  return useQuery({
    queryKey: userGeographyQueryKeys.barangays(params),
    queryFn: ({ signal }) => fetchBarangays(options, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useBarangayByIdQuery(barangayId?: string, enabled = true) {
  return useQuery({
    queryKey: userGeographyQueryKeys.barangayDetail(barangayId ?? ""),
    queryFn: ({ signal }) => fetchBarangayById(barangayId!, signal),
    enabled: enabled && Boolean(barangayId),
  });
}
