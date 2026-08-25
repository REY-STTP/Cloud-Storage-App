// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { jsonNoStore } from "@/lib/http";
import { escapeLike } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Role dicek dari baris DB (bukan klaim JWT) — admin yang di-demote
    // langsung kehilangan akses (temuan H-1).
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10)));

    // L-2: escape wildcard LIKE dari input user.
    const q = escapeLike((url.searchParams.get("q") || "").trim());

    // ---- Keyset pagination (kursor = created_at|id baris terakhir) ----
    let cursorTime: string | null = null;
    let cursorId: string | null = null;
    const cursorRaw = url.searchParams.get("cursor");
    if (cursorRaw) {
      try {
        const [iso, id] = Buffer.from(cursorRaw, "base64url").toString("utf8").split("|");
        if (
          !Number.isNaN(Date.parse(iso || "")) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")
        ) {
          cursorTime = iso!;
          cursorId = id!;
        }
      } catch {
        // kursor tidak valid -> halaman pertama
      }
    }
    const keyset = cursorTime !== null && cursorId !== null;

    // Query 1 (Opsi B): halaman user saja — murah, tanpa join.
    const whereParts: string[] = [];
    const values: unknown[] = [];
    if (q) {
      values.push(`%${q}%`);
      whereParts.push(
        `(name ilike '%' || $${values.length} || '%' or email ilike '%' || $${values.length} || '%')`
      );
    }
    if (keyset) {
      values.push(cursorTime, cursorId);
      whereParts.push(
        `(created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`
      );
    }
    const whereClause = whereParts.length ? `where ${whereParts.join(" and ")}` : "";

    values.push(perPage + 1);
    const pageResult = await query<{
      id: string;
      name: string;
      email: string;
      role: "USER" | "ADMIN";
      banned: boolean;
      verified: boolean;
      createdAt: Date;
    }>(
      `select id, name, email, role, banned, verified, created_at as "createdAt"
       from users
       ${whereClause}
       order by created_at desc, id desc
       limit $${values.length}`,
      values
    );

    const rows = pageResult.rows;
    const hasMore = rows.length > perPage;
    const pageRows = hasMore ? rows.slice(0, perPage) : rows;

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = Buffer.from(
        `${new Date(last.createdAt).toISOString()}|${last.id}`
      ).toString("base64url");
    }

    // Query 2 (Opsi B): stats file untuk 10-id halaman ini dalam SATU statement.
    const ids = pageRows.map((u) => u.id);
    const statsMap = new Map<string, { file_count: number; total_size: number }>();
    if (ids.length > 0) {
      const statsResult = await query<{
        owner: string;
        file_count: number;
        total_size: number;
      }>(
        `select owner, count(*)::int as file_count,
                coalesce(sum(size), 0)::bigint as total_size
         from files where owner = any($1::uuid[])
         group by owner`,
        [ids]
      );
      for (const row of statsResult.rows) {
        statsMap.set(row.owner, row);
      }
    }

    const totalResult = await query<{ count: number }>(
      `select count(*) as count from users
       where ($1 = '' or name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%')`,
      [q]
    );


    const statsResult = await query<{ admins: number; banned: number }>(
      `select
         count(*) filter (where role = 'ADMIN') as admins,
         count(*) filter (where banned) as banned
       from users`
    );

    const total = Number(totalResult.rows[0]?.count ?? 0);
    const admins = Number(statsResult.rows[0]?.admins ?? 0);
    const banned = Number(statsResult.rows[0]?.banned ?? 0);

    const users = pageRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      banned: !!u.banned,
      verified: u.verified,
      createdAt: u.createdAt,
      // Admin tidak ditampilkan statnya (proteksi, perilaku lama).
      fileCount:
        u.role === "ADMIN" ? null : Number(statsMap.get(u.id)?.file_count ?? 0),
      totalSizeBytes:
        u.role === "ADMIN" ? null : Number(statsMap.get(u.id)?.total_size ?? 0),
    }));

    return jsonNoStore({ users, total, admins, banned, page, perPage, nextCursor });
  } catch (err) {
    console.error("GET /api/admin/users error", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET,OPTIONS,PATCH,DELETE",
      "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
