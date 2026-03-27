export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  DISPATCHER = "DISPATCHER",
  RESPONDER = "RESPONDER",
  VIEWER = "VIEWER",
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  token?: string;
  access_token?: string;
  jwt?: string;
  data?: {
    accessToken?: string;
    token?: string;
    access_token?: string;
    jwt?: string;
    user?: AuthUser;
  };
  user?: AuthUser;
}
