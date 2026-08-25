// lib/users.ts
// Shared user lookup for API route guards.
import { query } from "@/lib/db";
import type { UserRow } from "@/lib/types";

/**
 * Ambil baris user berdasarkan id JWT. Selalu panggil ulang ke DB (jangan
 * percaya klaim di dalam token) supaya perubahan status — banned, deleted —
 * langsung berlaku tanpa menunggu token expire.
 */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `select id, name, email, password, role, verified, banned,
            pwd_changed_at as "pwdChangedAt",
            created_at as "createdAt", updated_at as "updatedAt"
     from users where id = $1 limit 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}
