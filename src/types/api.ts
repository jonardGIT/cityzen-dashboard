export interface ApiValidationIssue {
  field?: string;
  message?: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: ApiValidationIssue[];
}

// Supabase generates UUIDs natively via gen_random_uuid(); all entity IDs are strings.
export type EntityId = string;

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  [key: string]: unknown;
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

export interface Status extends BaseEntity {
  name?: string;
}

export interface Category extends BaseEntity {
  name?: string;
  subCategory?: string;
}

export interface Severity extends BaseEntity {
  level?: string;
  definition?: string;
}

export interface Incident extends BaseEntity {
  description?: string;
  mediaUrl?: string;
  dateReported?: string;
  statusId?: EntityId;
  citizenId?: EntityId;
  categoryId?: EntityId;
  severityId?: EntityId;
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

export interface IncidentMedia {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  incidentId: EntityId;
  mediaUrl: string;
  displayOrder?: number;
}

export type JurisdictionType = "region" | "province" | "city" | "barangay";

export interface Region extends BaseEntity {
  code?: string;
  name?: string;
  designation?: string | null;
}

export interface Province extends BaseEntity {
  code?: string;
  name?: string;
  regionId?: EntityId;
}

export interface CityMunicipality extends BaseEntity {
  code?: string;
  name?: string;
  type?: string;
  provinceId?: EntityId;
}

export interface Barangay extends BaseEntity {
  code?: string;
  name?: string;
  cityMunicipalityId?: EntityId;
}

export type UserJurisdictionType = JurisdictionType | "municipality";

export interface User extends BaseEntity {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  mobileNumber?: string | null;
  mobileNumberVerifiedAt?: string | null;
  citizenId?: string | null;
  role?: string;
  jurisdictionType?: UserJurisdictionType | null;
  jurisdictionId?: EntityId | null;
}

export interface MobileAppContent extends BaseEntity {
  slug?: string;
  title?: string;
  summary?: string | null;
  body?: string;
  contentType?: string;
  placement?: string;
  audience?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  publishedAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLog extends BaseEntity {
  timestamp?: string;
  action?: string;
  summary?: string;
  outcome?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resource?: string;
  method?: string;
  path?: string;
  statusCode?: number | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface HealthResponse {
  status: string;
}
