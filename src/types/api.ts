export interface ApiValidationIssue {
  field?: string;
  message?: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: ApiValidationIssue[];
}

export type EntityId = string | number;

export interface BaseEntity {
  id: EntityId;
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
}

export interface Responder extends BaseEntity {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  contactInfo?: string;
  agencyId?: number;
  agency?: {
    id: number;
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
  name?: string;
}

export interface Location extends BaseEntity {
  name?: string;
  address?: string;
}

export interface Incident extends BaseEntity {
  title?: string;
  description?: string;
  dateReported?: string;
  statusId?: EntityId;
  citizenId?: EntityId;
  locationId?: EntityId;
  categoryId?: EntityId;
  severityId?: EntityId;
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

export interface HealthResponse {
  status: string;
}
