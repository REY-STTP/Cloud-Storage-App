// app/api/user/storage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

const MAX_STORAGE_BYTES =
  Number(process.env.MAX_STORAGE_BYTES ?? 1073741824);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await query<{ totalSize: number }>(
    // sum() over bigint returns numeric, which pg would hand back as a string;
    // the ::bigint cast lets the int8 parser in lib/db.ts return a real number.
    'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
    [payload.userId]
  );

  const usedBytes = Number(result.rows[0]?.totalSize ?? 0);
  const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - usedBytes);
  const usedPercent =
    MAX_STORAGE_BYTES > 0
      ? Math.min(100, Math.round((usedBytes / MAX_STORAGE_BYTES) * 100))
      : 0;

  return jsonNoStore({
    usedBytes,
    remainingBytes,
    maxBytes: MAX_STORAGE_BYTES,
    usedPercent,
  });
}
