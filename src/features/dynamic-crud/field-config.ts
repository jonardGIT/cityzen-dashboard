import type {
  CrudFieldConfig,
  CrudOperation,
} from "@/features/dynamic-crud/types";

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
    {
      name: "agencyId",
      label: "Agency",
      type: "select",
      required: true,
      optionSource: {
        resource: "agencies",
        valueField: "id",
        labelField: "name",
      },
    },
    { name: "role", label: "Role", type: "text" },
    { name: "contactInfo", label: "Contact Info", type: "text" },
  ],
  agencies: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "contactNumber", label: "Contact Number", type: "text" },
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
  incidents: [
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
    },
    { name: "mediaUrl", label: "Media URL", type: "text" },
    { name: "dateReported", label: "Date Reported", type: "datetime" },
    { name: "latitude", label: "Latitude", type: "text" },
    { name: "longitude", label: "Longitude", type: "text" },
    { name: "addressLine1", label: "Address Line 1", type: "text" },
    { name: "addressLine2", label: "Address Line 2", type: "text" },
    { name: "barangay", label: "Barangay", type: "text" },
    { name: "districtName", label: "District", type: "text" },
    { name: "cityName", label: "City", type: "text" },
    { name: "provinceName", label: "Province", type: "text" },
    { name: "regionName", label: "Region", type: "text" },
    { name: "postalCode", label: "Postal Code", type: "text" },
    { name: "landmark", label: "Landmark", type: "text" },
    {
      name: "statusId",
      label: "Status",
      type: "select",
      required: true,
      optionSource: {
        resource: "statuses",
        valueField: "id",
        labelField: "name",
      },
    },
    {
      name: "citizenId",
      label: "Citizen",
      type: "select",
      required: true,
      optionSource: {
        resource: "citizens",
        valueField: "id",
        labelField: "name",
      },
    },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      required: true,
      optionSource: {
        resource: "categories",
        valueField: "id",
        labelField: "name",
      },
    },
    {
      name: "severityId",
      label: "Severity",
      type: "select",
      required: true,
      optionSource: {
        resource: "severities",
        valueField: "id",
        labelField: "level",
      },
    },
  ],
  assignments: [
    {
      name: "incidentId",
      label: "Incident",
      type: "select",
      required: true,
      optionSource: {
        resource: "incidents",
        valueField: "id",
        labelField: "description",
      },
    },
    {
      name: "responderId",
      label: "Responder",
      type: "select",
      required: true,
      optionSource: {
        resource: "responders",
        valueField: "id",
        labelField: "name",
      },
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

const CREATE_REQUIRED_FIELDS: Partial<Record<string, string[]>> = {
  users: ["name", "email", "password"],
  citizens: ["name", "contactInfo", "preferredChannel"],
  responders: ["name", "agencyId", "role", "contactInfo"],
  agencies: ["name"],
  statuses: ["name"],
  categories: ["name"],
  severities: ["level"],
  incidents: [
    "description",
    "statusId",
    "citizenId",
    "categoryId",
    "severityId",
  ],
  assignments: ["incidentId", "responderId"],
};

const OPERATION_REQUIRED_FIELDS: Partial<
  Record<CrudOperation, Partial<Record<string, string[]>>>
> = {
  create: CREATE_REQUIRED_FIELDS,
  report: {
    incidents: ["description", "categoryId", "severityId"],
  },
  linkMe: {
    citizens: [],
  },
  update: {
    users: [],
    citizens: [],
    responders: [],
    agencies: [],
    statuses: [],
    categories: [],
    severities: [],
    incidents: [],
    assignments: [],
  },
};

function withRequiredFields(
  fields: CrudFieldConfig[],
  requiredFieldNames?: string[],
): CrudFieldConfig[] {
  const requiredNames = new Set(requiredFieldNames ?? []);

  return fields.map((field) => ({
    ...field,
    required: requiredNames.has(field.name),
  }));
}

export function getResourceFields(resourceName: string): CrudFieldConfig[] {
  return RESOURCE_FIELD_CONFIG[resourceName] ?? [];
}

export function getResourceFieldsForOperation(
  resourceName: string,
  operation: CrudOperation,
): CrudFieldConfig[] {
  const base = withRequiredFields(
    getResourceFields(resourceName),
    OPERATION_REQUIRED_FIELDS[operation]?.[resourceName] ??
      CREATE_REQUIRED_FIELDS[resourceName],
  );

  if (resourceName === "citizens" && operation === "linkMe") {
    return withRequiredFields(
      base.filter(
        (field) => field.name === "name" || field.name === "preferredChannel",
      ),
      OPERATION_REQUIRED_FIELDS.linkMe?.citizens,
    );
  }

  if (resourceName === "incidents" && operation === "report") {
    const reportFields = [
      "description",
      "mediaUrl",
      "dateReported",
      "latitude",
      "longitude",
      "addressLine1",
      "addressLine2",
      "barangay",
      "districtName",
      "cityName",
      "provinceName",
      "regionName",
      "postalCode",
      "landmark",
      "categoryId",
      "severityId",
    ];

    return withRequiredFields(
      [
        {
          name: "dateReported",
          label: "Date Reported",
          type: "datetime",
        },
        ...base.filter(
          (field) =>
            reportFields.includes(field.name) && field.name !== "dateReported",
        ),
      ],
      OPERATION_REQUIRED_FIELDS.report?.incidents,
    );
  }

  return base;
}
