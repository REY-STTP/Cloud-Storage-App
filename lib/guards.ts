// lib/guards.ts
// Guard terpusat untuk semua API route (temuan H-1).
//
// Prinsip: klaim di dalam JWT (userId, role) TIDAK dipercaya untuk keputusan
// otorisasi — selalu re-validasi ke DB supaya perubahan status (ban, demote,
// penghapusan akun) berlaku seketika tanpa menunggu token expire (24 jam).
//
// Kebijakan ban (disetujui user): ban = akun beku penuh. Satu-satunya pengecualian
// adalah GET profil sendiri lewat `requireAuth` agar UI tetap bisa menampilkan
// status "Anda diblokir".

import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, type JwtPayload } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import type { UserRow } from "@/lib/types";

export type GuardResult =
  | { ok: true; user: UserRow }
  | { ok: false; response: NextResponse };

/** Verifikasi JWT + pastikan user masih ada di DB. Tanpa cek ban. */
export async function requireAuth(req: NextRequest): Promise<GuardResult> {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "User not found" }, { status: 404 }),
    };
  }

  // M-2: sesi diterbitkan sebelum pergantian password terakhir → invalid.
  // Menutup celah "reset/ganti password tidak mengeluarkan sesi lama".
  const { iat = 0 } = payload as JwtPayload & { iat?: number };
  const pwdChangedAtSec = user.pwdChangedAt
    ? Math.floor(new Date(user.pwdChangedAt).getTime() / 1000)
    : 0;
  if (pwdChangedAtSec > iat) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Session expired due to password change. Please log in again." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, user };
}

/** requireAuth + tolak user yang di-ban (403). */
export async function requireUser(req: NextRequest): Promise<GuardResult> {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard;

  if (guard.user.banned) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Your account has been banned" },
        { status: 403 }
      ),
    };
  }

  return guard;
}

/**
 * Guard route admin: role dicek dari BARIS DB, bukan klaim di JWT.
 * Admin yang di-demote langsung kehilangan akses.
 */
export async function requireAdmin(req: NextRequest): Promise<GuardResult> {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard;

  if (guard.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return guard;
}
