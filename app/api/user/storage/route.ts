// app/api/user/storage/route.ts
import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { jsonNoStore } from "@/lib/http";

const MAX_STORAGE_BYTES =
  Number(process.env.MAX_STORAGE_BYTES ?? 1073741824);

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;

  const result = await query<{ totalSize: number }>(
    // sum() over bigint returns numeric, which pg would hand back as a string;
    // the ::bigint cast lets the int8 parser in lib/db.ts return a real number.
    'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
    [guard.user.id]
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
