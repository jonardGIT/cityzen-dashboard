import { describe, expect, it } from "vitest";
import { getCrudResource } from "@/features/dynamic-crud/config";
import {
  canShowCrudNavigationItem,
  hasPermission,
} from "@/features/dynamic-crud/permissions";
import { Role } from "@/types/auth";

describe("canShowCrudNavigationItem", () => {
  it("shows read-enabled reference tables for operational roles", () => {
    const agencies = getCrudResource("agencies");
    const statuses = getCrudResource("statuses");

    expect(agencies).toBeDefined();
    expect(statuses).toBeDefined();
    expect(canShowCrudNavigationItem(agencies!, Role.DISPATCHER, true)).toBe(
      true,
    );
    expect(canShowCrudNavigationItem(statuses!, Role.RESPONDER, true)).toBe(
      true,
    );
  });

  it("keeps actionable resources visible for operational roles", () => {
    const incidents = getCrudResource("incidents");
    const assignments = getCrudResource("assignments");

    expect(incidents).toBeDefined();
    expect(assignments).toBeDefined();
    expect(canShowCrudNavigationItem(incidents!, Role.DISPATCHER, true)).toBe(
      true,
    );
    expect(canShowCrudNavigationItem(assignments!, Role.DISPATCHER, true)).toBe(
      true,
    );
  });

  it("keeps self-service resources visible for citizen reporters", () => {
    const incidents = getCrudResource("incidents");
    const assignments = getCrudResource("assignments");
    const citizens = getCrudResource("citizens");

    expect(incidents).toBeDefined();
    expect(assignments).toBeDefined();
    expect(citizens).toBeDefined();
    expect(
      canShowCrudNavigationItem(incidents!, Role.CITIZEN_REPORTER, true),
    ).toBe(true);
    expect(
      canShowCrudNavigationItem(assignments!, Role.CITIZEN_REPORTER, true),
    ).toBe(false);
    expect(
      canShowCrudNavigationItem(citizens!, Role.CITIZEN_REPORTER, true),
    ).toBe(true);
  });

  it("hides citizens management navigation for operational roles", () => {
    const citizens = getCrudResource("citizens");

    expect(citizens).toBeDefined();
    expect(canShowCrudNavigationItem(citizens!, Role.DISPATCHER, true)).toBe(
      false,
    );
    expect(canShowCrudNavigationItem(citizens!, Role.RESPONDER, true)).toBe(
      false,
    );
    expect(canShowCrudNavigationItem(citizens!, Role.RESPONDER, true)).toBe(
      false,
    );
  });

  it("does not show standard incident navigation for auditors", () => {
    const incidents = getCrudResource("incidents");

    expect(incidents).toBeDefined();
    expect(canShowCrudNavigationItem(incidents!, Role.AUDITOR, true)).toBe(
      false,
    );
  });

  it("splits geography write access by LGU level", () => {
    const regions = getCrudResource("regions");
    const provinces = getCrudResource("provinces");
    const cities = getCrudResource("cities-municipalities");
    const barangays = getCrudResource("barangays");

    expect(regions).toBeDefined();
    expect(provinces).toBeDefined();
    expect(cities).toBeDefined();
    expect(barangays).toBeDefined();

    expect(
      hasPermission(regions!.endpoints.create, Role.NATIONAL_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(regions!.endpoints.create, Role.REGIONAL_DIRECTOR, true),
    ).toBe(true);
    expect(
      hasPermission(regions!.endpoints.create, Role.PROVINCIAL_ADMIN, true),
    ).toBe(false);

    expect(
      hasPermission(provinces!.endpoints.create, Role.NATIONAL_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(provinces!.endpoints.create, Role.REGIONAL_DIRECTOR, true),
    ).toBe(true);
    expect(
      hasPermission(provinces!.endpoints.create, Role.PROVINCIAL_ADMIN, true),
    ).toBe(false);

    expect(
      hasPermission(cities!.endpoints.create, Role.NATIONAL_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(cities!.endpoints.create, Role.REGIONAL_DIRECTOR, true),
    ).toBe(true);
    expect(
      hasPermission(cities!.endpoints.create, Role.PROVINCIAL_ADMIN, true),
    ).toBe(true);
    expect(hasPermission(cities!.endpoints.create, Role.CITY_ADMIN, true)).toBe(
      false,
    );

    expect(
      hasPermission(barangays!.endpoints.create, Role.NATIONAL_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(barangays!.endpoints.create, Role.REGIONAL_DIRECTOR, true),
    ).toBe(true);
    expect(
      hasPermission(barangays!.endpoints.create, Role.PROVINCIAL_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(barangays!.endpoints.create, Role.CITY_ADMIN, true),
    ).toBe(true);
    expect(
      hasPermission(barangays!.endpoints.create, Role.DISPATCHER, true),
    ).toBe(false);
  });

  it("denies unauthenticated geography list access", () => {
    const geographyResources = [
      getCrudResource("regions"),
      getCrudResource("provinces"),
      getCrudResource("cities-municipalities"),
      getCrudResource("barangays"),
    ];

    for (const resource of geographyResources) {
      expect(resource).toBeDefined();
      expect(
        hasPermission(resource!.endpoints.list, Role.NATIONAL_ADMIN, false),
      ).toBe(false);
      expect(
        canShowCrudNavigationItem(resource!, Role.NATIONAL_ADMIN, false),
      ).toBe(false);
    }
  });
});
