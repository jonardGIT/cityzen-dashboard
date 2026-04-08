import type { Assignment, Incident, Responder } from "@/types/api";

export function getStatusColor(statusName: string): string {
  const normalized = statusName.trim().toLowerCase();

  if (
    ["resolved", "closed", "cancelled", "canceled", "completed"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "green";
  }

  if (
    ["in progress", "dispatched", "responding", "ongoing"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "processing";
  }

  return "gold";
}

export function joinDisplayParts(
  parts: Array<string | undefined>,
): string | null {
  const filtered = parts.filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0,
  );

  return filtered.length > 0 ? filtered.join(", ") : null;
}

export function buildIncidentAddressLabel(
  incident: Pick<
    Incident,
    | "addressLine1"
    | "addressLine2"
    | "barangay"
    | "districtName"
    | "cityName"
    | "provinceName"
    | "regionName"
    | "postalCode"
  >,
  mode: "short" | "full" = "short",
): string {
  const parts =
    mode === "full"
      ? [
          incident.addressLine1,
          incident.addressLine2,
          incident.barangay,
          incident.districtName,
          incident.cityName,
          incident.provinceName,
          incident.regionName,
          incident.postalCode,
        ]
      : [
          incident.addressLine1,
          incident.addressLine2,
          incident.barangay,
          incident.cityName,
          incident.provinceName,
        ];

  return joinDisplayParts(parts) ?? "N/A";
}

export function buildIncidentCoordinatesLabel(
  incident: Pick<Incident, "latitude" | "longitude">,
): string {
  if (incident.latitude === undefined || incident.longitude === undefined) {
    return "N/A";
  }

  return `${incident.latitude}, ${incident.longitude}`;
}

export function getResponderDisplayName(
  responder: Pick<Responder, "id" | "name"> | undefined,
): string {
  if (!responder) {
    return "Unassigned";
  }

  return responder.name || String(responder.id);
}

export function getAssignmentDisplayDate(
  assignment: Pick<Assignment, "assignedDate" | "createdAt" | "updatedAt">,
): string | undefined {
  return (
    assignment.assignedDate ?? assignment.createdAt ?? assignment.updatedAt
  );
}
