export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  DISPATCHER = "DISPATCHER",
  RESPONDER = "RESPONDER",
  VIEWER = "VIEWER",
}

export interface AuthUser {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  email: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
  mfaEnabledAt?: string | null;
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
  refreshToken: string;
  tokenType: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
  mfaRequired?: boolean;
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
