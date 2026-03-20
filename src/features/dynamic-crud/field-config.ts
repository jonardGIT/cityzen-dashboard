import type { CrudFieldConfig, CrudOperation } from "@/features/dynamic-crud/types";

const RESOURCE_FIELD_CONFIG: Record<string, CrudFieldConfig[]> = {
  users: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", required: true },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      optionSource: {
        resource: "roles",
      },
    },
  ],
  citizens: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "contactInfo", label: "Contact Info", type: "text" },
    { name: "preferredChannel", label: "Preferred Channel", type: "text" },
  ],
  responders: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "agency", label: "Agency", type: "text" },
    { name: "role", label: "Role", type: "text" },
    { name: "contactInfo", label: "Contact Info", type: "text" },
  ],
  statuses: [{ name: "name", label: "Name", type: "text", required: true }],
  categories: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "subCategory", label: "Sub Category", type: "text" },
  ],
  severities: [
    { name: "level", label: "Level", type: "text", required: true },
    { name: "definition", label: "Definition", type: "textarea" },
  ],
  locations: [
    { name: "district", label: "District", type: "text" },
    { name: "city", label: "City", type: "text" },
    { name: "province", label: "Province", type: "text" },
    { name: "region", label: "Region", type: "text" },
  ],
  incidents: [
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "mediaUrl", label: "Media URL", type: "text" },
    {
      name: "statusId",
      label: "Status",
      type: "select",
      required: true,
      optionSource: { resource: "statuses", valueField: "id", labelField: "name" },
    },
    {
      name: "citizenId",
      label: "Citizen",
      type: "select",
      required: true,
      optionSource: { resource: "citizens", valueField: "id", labelField: "name" },
    },
    {
      name: "locationId",
      label: "Location",
      type: "select",
      required: true,
      optionSource: { resource: "locations", valueField: "id", labelField: "name" },
    },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      required: true,
      optionSource: { resource: "categories", valueField: "id", labelField: "name" },
    },
    {
      name: "severityId",
      label: "Severity",
      type: "select",
      required: true,
      optionSource: { resource: "severities", valueField: "id", labelField: "name" },
    },
  ],
  assignments: [
    {
      name: "incidentId",
      label: "Incident",
      type: "select",
      required: true,
      optionSource: { resource: "incidents", valueField: "id", labelField: "description" },
    },
    {
      name: "responderId",
      label: "Responder",
      type: "select",
      required: true,
      optionSource: { resource: "responders", valueField: "id", labelField: "name" },
    },
    { name: "responseStart", label: "Response Start", type: "datetime" },
    { name: "responseEnd", label: "Response End", type: "datetime" },
    { name: "outcome", label: "Outcome", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};

export const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "DISPATCHER", label: "DISPATCHER" },
  { value: "RESPONDER", label: "RESPONDER" },
  { value: "VIEWER", label: "VIEWER" },
];

export function getResourceFields(resourceName: string): CrudFieldConfig[] {
  return RESOURCE_FIELD_CONFIG[resourceName] ?? [];
}

export function getResourceFieldsForOperation(
  resourceName: string,
  operation: CrudOperation,
): CrudFieldConfig[] {
  const base = getResourceFields(resourceName);

  if (resourceName === "citizens" && operation === "linkMe") {
    return base.filter((field) => field.name === "name" || field.name === "preferredChannel");
  }

  if (resourceName === "incidents" && operation === "report") {
    const reportFields = [
      "description",
      "mediaUrl",
      "dateReported",
      "statusId",
      "locationId",
      "categoryId",
      "severityId",
    ];

    return [
      {
        name: "dateReported",
        label: "Date Reported",
        type: "datetime",
      },
      ...base.filter((field) => reportFields.includes(field.name) && field.name !== "dateReported"),
    ];
  }

  return base;
}
