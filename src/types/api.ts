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
  [key: string]: unknown;
}

export interface Citizen extends BaseEntity {
  name?: string;
  contactInfo?: string;
  preferredChannel?: string;
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
  statusId?: EntityId;
  assignedDate?: string;
  notes?: string;
}

export interface User extends BaseEntity {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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
