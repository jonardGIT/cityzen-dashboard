import {
  buildReverseGeocodeUrl,
  mapReverseGeocodeToIncidentAddress,
} from "./reverse-geocode";

describe("reverse geocode helpers", () => {
  it("builds the reverse geocode URL with query params", () => {
    const url = new URL(buildReverseGeocodeUrl(14.5995, 120.9842));

    expect(url.origin).toBe("https://nominatim.openstreetmap.org");
    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("lat")).toBe("14.5995");
    expect(url.searchParams.get("lon")).toBe("120.9842");
    expect(url.searchParams.get("addressdetails")).toBe("1");
  });

  it("maps reverse geocode payload to the incident address snapshot", () => {
    const result = mapReverseGeocodeToIncidentAddress(14.5995123, 120.9842987, {
      name: "Manila City Hall",
      display_name:
        "Manila City Hall, Antonio Villegas Road, Ermita, Manila, Metro Manila, 1000, Philippines",
      address: {
        house_number: "1",
        road: "Antonio Villegas Road",
        suburb: "Barangay 659-A",
        neighbourhood: "Ermita",
        city_district: "Fifth District",
        city: "Manila",
        county: "Metro Manila",
        region: "National Capital Region",
        postcode: "1000",
      },
    });

    expect(result).toEqual({
      latitude: "14.599512",
      longitude: "120.984299",
      addressLine1: "1 Antonio Villegas Road",
      addressLine2: "Ermita, Barangay 659-A",
      barangay: "Barangay 659-A",
      districtName: "Fifth District",
      cityName: "Manila",
      provinceName: "Metro Manila",
      regionName: "National Capital Region",
      postalCode: "1000",
      landmark: "Manila City Hall",
    });
  });
});
