// Supabase generates UUIDs natively via gen_random_uuid(); all entity IDs are strings.
export type EntityId = string;

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Incident extends BaseEntity {
  title?: string;
  description?: string;
  mediaUrl?: string;
  dateReported?: string;
  statusId?: EntityId;
  categoryId?: EntityId;
  severityId?: EntityId;
  locationId?: EntityId;
  citizenId?: EntityId;
}

export interface Assignment extends BaseEntity {
  incidentId?: EntityId;
  responderId?: EntityId;
  statusId?: EntityId;
  assignedDate?: string;
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
  name?: string;
}

export interface Location extends BaseEntity {
  district?: string;
  city?: string;
  province?: string;
  region?: string;
}

export interface Citizen extends BaseEntity {
  name?: string;
  contactInfo?: string;
  preferredChannel?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Agency extends BaseEntity {
  name?: string;
  contactNumber?: string;
}

export interface Responder extends BaseEntity {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  contactInfo?: string;
  agencyId?: string;
  agency?: {
    id: string;
    name: string;
  };
}

export interface User extends BaseEntity {
  firstName?: string;
  lastName?: string;
  email?: string;
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
