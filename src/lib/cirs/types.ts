// Supabase generates UUIDs natively via gen_random_uuid(); all entity IDs are strings.
export type EntityId = string;

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  [key: string]: unknown;
}

export interface Incident extends BaseEntity {
  description?: string;
  mediaUrl?: string;
  dateReported?: string;
  statusId?: EntityId;
  categoryId?: EntityId;
  severityId?: EntityId;
  citizenId?: EntityId;
  latitude?: number;
  longitude?: number;
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

export interface Assignment extends BaseEntity {
  incidentId?: EntityId;
  responderId?: EntityId;
  assignedDate?: string;
  responseStart?: string | null;
  responseEnd?: string | null;
  outcome?: string | null;
  notes?: string;
}

export interface Status extends BaseEntity {
  name?: string;
}

export interface Category extends BaseEntity {
  name?: string;
}

export interface Severity extends BaseEntity {
  level?: string;
  definition?: string;
}

export interface Citizen extends BaseEntity {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactInfo?: string;
  preferredChannel?: string;
}

export interface Agency extends BaseEntity {
  name?: string;
  contactNumber?: string;
}

export interface Responder extends BaseEntity {
  name?: string;
  role?: string;
  contactInfo?: string;
  agencyId?: string;
  agency?: {
    id: string;
    name: string;
  };
}

export interface User extends BaseEntity {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  role?: string;
}

export interface ApiValidationIssue {
  field?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: ApiValidationIssue[];
  [key: string]: unknown;
}

export interface RateLimitMeta {
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}
