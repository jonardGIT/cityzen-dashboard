export interface IncidentAddressSnapshot {
  latitude: string;
  longitude: string;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  state_district?: string;
  municipality?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
}

interface NominatimReverseResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

type FetchLike = typeof fetch;

function firstDefined(
  ...values: Array<string | undefined>
): string | undefined {
  return values
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim();
}

function joinParts(
  parts: Array<string | undefined>,
  separator: string,
): string | undefined {
  const filtered = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (filtered.length === 0) {
    return undefined;
  }

  return filtered.join(separator);
}

export function buildReverseGeocodeUrl(
  latitude: number,
  longitude: number,
): string {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
  });

  return `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
}

export function mapReverseGeocodeToIncidentAddress(
  latitude: number,
  longitude: number,
  response: NominatimReverseResponse,
): IncidentAddressSnapshot {
  const address = response.address ?? {};
  const landmark = firstDefined(
    response.name,
    response.display_name?.split(",")[0],
  );
  const addressLine1 = firstDefined(
    joinParts([address.house_number, address.road], " "),
    address.road,
    landmark,
  );

  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    addressLine1,
    addressLine2: joinParts(
      [address.neighbourhood, address.suburb, address.quarter, address.hamlet],
      ", ",
    ),
    barangay: firstDefined(
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.village,
      address.hamlet,
    ),
    districtName: firstDefined(
      address.city_district,
      address.state_district,
      address.municipality,
      address.county,
    ),
    cityName: firstDefined(
      address.city,
      address.town,
      address.municipality,
      address.village,
    ),
    provinceName: firstDefined(address.county, address.state),
    regionName: firstDefined(address.region, address.state),
    postalCode: address.postcode?.trim(),
    landmark,
  };
}

export async function reverseGeocodeIncidentAddress(
  latitude: number,
  longitude: number,
  fetchImpl: FetchLike = fetch,
): Promise<IncidentAddressSnapshot> {
  const response = await fetchImpl(
    buildReverseGeocodeUrl(latitude, longitude),
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NominatimReverseResponse;
  return mapReverseGeocodeToIncidentAddress(latitude, longitude, payload);
}
