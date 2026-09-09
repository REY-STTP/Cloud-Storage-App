// lib/users.ts
// Shared user lookup for API route guards.
import { cache } from "react";
import { query } from "@/lib/db";
import type { UserRow } from "@/lib/types";

/**
 * Ambil baris user berdasarkan id JWT. Selalu panggil ulang ke DB (jangan
 * percaya klaim di dalam token) supaya perubahan status — banned, deleted —
 * langsung berlaku tanpa menunggu token expire.
 *
 * P1-3: dibungkus React `cache()` — pemanggilan berulang dengan id yang sama
 * DALAM satu request server (mis. beberapa guard/komponen paralel) hanya
 * menembak DB sekali. Tidak ada cache lintas-request: tiap API request tetap
 * validasi segar ke DB.
 */
export const getUserById = cache(async (userId: string): Promise<UserRow | null> => {
  const result = await query<UserRow>(
    `select id, name, email, password, role, verified, banned,
            pwd_changed_at as "pwdChangedAt",
            created_at as "createdAt", updated_at as "updatedAt"
     from users where id = $1 limit 1`,
    [userId]
  );
  return result.rows[0] ?? null;
});
