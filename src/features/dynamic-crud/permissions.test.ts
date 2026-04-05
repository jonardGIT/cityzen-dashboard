import { describe, expect, it } from "vitest";
import { getCrudResource } from "@/features/dynamic-crud/config";
import { canShowCrudNavigationItem } from "@/features/dynamic-crud/permissions";
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

  it("shows incident navigation for auditors with read access", () => {
    const incidents = getCrudResource("incidents");

    expect(incidents).toBeDefined();
    expect(canShowCrudNavigationItem(incidents!, Role.AUDITOR, true)).toBe(
      true,
    );
  });
});
