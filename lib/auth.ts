// lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/types";
import { JWT_SECRET } from "@/lib/env";

export type { Role };

/** Cost bcrypt baru (OWASP merekomendasikan ≥12 untuk bcryptjs). */
export const BCRYPT_COST = 12;

export interface JwtPayload {
  userId: string;
  role: Role;
}

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
