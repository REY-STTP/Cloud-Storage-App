// app/api/admin/stats/route.ts
// Agregat global untuk halaman /admin overview (P0-1).
//
// Latar: overview sebelumnya fetch `/api/admin/users?limit=500` lalu
// menghitung total/verified/storage/signups di browser. Itu berarti
// transfer 500 rows + 1 query IN(500 uuid) + 2x COUNT(*) tiap load.
// Endpoint ini menghitung semuanya di SQL (4 statement agregat murah)
// sehingga payload overview <10KB dan tidak ada lagi `limit=500`.
//
// Cache: hasil di-cache di memori proses selama 30 detik (global,
// admin-only, aman). Respons HTTP tetap `no-store` agar tidak disimpan
// browser/CDN lintas-user — yang dihemat adalah RTT ke Postgres.
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";

const STATS_TTL_MS = 30_000;

interface CachedStats {
  at: number;
  data: {
    total: number;
    admins: number;
    banned: number;
    verified: number;
    unverified: number;
    totalBytes: number;
    totalFiles: number;
    signupsByMonth: { month: string; users: number }[];
    topStorage: {
      id: string;
      name: string;
      fileCount: number;
      totalSizeBytes: number;
    }[];
  };
}

let cache: CachedStats | null = null;

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;

    const now = Date.now();
    if (cache && now - cache.at < STATS_TTL_MS) {
      return jsonNoStore(cache.data);
    }

    // 4 agregat independen -> jalan paralel dalam 1 batch.
    const [userAgg, fileAgg, signups, top] = await Promise.all([
      query<{
        total: number;
        admins: number;
        banned: number;
        verified: number;
        unverified: number;
      }>(
        `select
           count(*) as total,
           count(*) filter (where role = 'ADMIN') as admins,
           count(*) filter (where banned) as banned,
           count(*) filter (where verified and not banned) as verified,
           count(*) filter (where not verified and not banned) as unverified
         from users`
      ),
      query<{ total_files: number; total_bytes: number }>(
        `select count(*)::int as total_files,
                coalesce(sum(size), 0)::bigint as total_bytes
         from files`
      ),
      query<{ month: Date; users: number }>(
        `select date_trunc('month', created_at)::date as month,
                count(*)::int as users
         from users
         where created_at >= date_trunc('month', now()) - interval '5 months'
         group by 1
         order by 1`
      ),
      query<{
        id: string;
        name: string;
        file_count: number;
        total_size: number;
      }>(
        `select u.id, u.name, s.file_count, s.total_size
         from (
           select f.owner,
                  count(*)::int as file_count,
                  coalesce(sum(f.size), 0)::bigint as total_size
           from files f
           join users u on u.id = f.owner
           where u.role = 'USER'
           group by f.owner
           order by sum(f.size) desc
           limit 6
         ) s
         join users u on u.id = s.owner`
      ),
    ]);

    const u = userAgg.rows[0];
    const f = fileAgg.rows[0];

    const data: CachedStats["data"] = {
      total: Number(u?.total ?? 0),
      admins: Number(u?.admins ?? 0),
      banned: Number(u?.banned ?? 0),
      verified: Number(u?.verified ?? 0),
      unverified: Number(u?.unverified ?? 0),
      totalBytes: Number(f?.total_bytes ?? 0),
      totalFiles: Number(f?.total_files ?? 0),
      signupsByMonth: signups.rows.map((r) => ({
        month: new Date(r.month).toISOString(),
        users: Number(r.users ?? 0),
      })),
      topStorage: top.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        fileCount: Number(r.file_count ?? 0),
        totalSizeBytes: Number(r.total_size ?? 0),
      })),
    };

    cache = { at: now, data };
    return jsonNoStore(data);
  } catch (err) {
    console.error("GET /api/admin/stats error", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET,OPTIONS",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
