export enum Role {
  NATIONAL_ADMIN = "NATIONAL_ADMIN",
  REGIONAL_DIRECTOR = "REGIONAL_DIRECTOR",
  PROVINCIAL_ADMIN = "PROVINCIAL_ADMIN",
  CITY_ADMIN = "CITY_ADMIN",
  CITY_CONTENT_EDITOR = "CITY_CONTENT_EDITOR",
  DISPATCHER = "DISPATCHER",
  RESPONDER = "RESPONDER",
  CITIZEN_REPORTER = "CITIZEN_REPORTER",
  AUDITOR = "AUDITOR",
}

export type LegacyRole = "SUPER_ADMIN" | "ADMIN" | "VIEWER";

export interface AuthUser {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  email: string;
  name: string;
  mobileNumber?: string | null;
  mobileNumberVerifiedAt?: string | null;
  citizenId?: string | null;
  role: Role;
  mfaEnabled: boolean;
  mfaEnabledAt?: string | null;
}

export interface UserCapabilities {
  role: Role;
  label: string;
  permissions: string[];
  scope: string[];
  canUpdateUser: boolean;
  canDeleteUser: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PasswordResetRequestRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  message: string;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken: string;
  tokenType: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
  user: AuthUser;
}

export interface StoredAuthSession {
  tokenType: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

export interface AuthSessionSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  refreshExpiresAt: string;
  refreshUsedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
  issuer: string;
  accountName: string;
}

export interface MfaCodeRequest {
  code: string;
  refreshToken: string;
}

export interface MessageResponse {
  message: string;
}

export interface LoginResult {
  mfaRequired: boolean;
  auth?: AuthResponse;
}

export type LoginReason =
  | "signed-out"
  | "session-expired"
  | "session-revoked"
  | "mfa-updated"
  | "password-changed"
  | "role-changed";
