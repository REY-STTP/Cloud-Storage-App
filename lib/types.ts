// lib/types.ts
// Shared database row types (Postgres / Supabase).

export type Role = "USER" | "ADMIN";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  verified: boolean;
  banned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRow {
  id: string;
  filename: string;
  originalName: string | null;
  mimeType: string | null;
  resourceType: string | null;
  url: string;
  publicId: string;
  size: number;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  verified: boolean;
  banned: boolean;
  createdAt?: Date;
}

/** Strip sensitive fields from a user row. */
export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    banned: user.banned,
    createdAt: user.createdAt,
  };
}
