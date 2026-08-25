// app/api/files/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { deleteObject } from "@/lib/storage";
import type { FileRow } from "@/lib/types";

export const runtime = "nodejs";

/** Keep only well-formed uuids so Postgres doesn't throw on bad input. */
function toUuidList(ids: unknown[]): string[] {
  return ids.filter(
    (id): id is string =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}

export async function DELETE(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No file IDs provided" }, { status: 400 });
    }

    const uuidIds = toUuidList(ids);
    if (uuidIds.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    const filesResult = await query<FileRow>(
      `select id, filename, original_name as "originalName", mime_type as "mimeType",
              resource_type as "resourceType", url, public_id as "publicId",
              size, owner, created_at as "createdAt", updated_at as "updatedAt"
       from files where id = any($1::uuid[]) and owner = $2`,
      [uuidIds, user.id]
    );
    const files = filesResult.rows;

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    // Hapus objek dari R2; kegagalan satu objek tidak menggagalkan yang lain.
    const storageResults = await Promise.all(
      files.map(async (file) => {
        if (!file.publicId) return { ok: false, id: file.id, reason: "no-key" };
        try {
          await deleteObject(file.publicId);
          return { ok: true, id: file.id };
        } catch (err) {
          console.warn(`Failed to delete ${file.publicId} from storage:`, err);
          return { ok: false, id: file.id, error: err instanceof Error ? err.message : String(err) };
        }
      })
    );

    const deleteResult = await query(
      "delete from files where id = any($1::uuid[]) and owner = $2",
      [uuidIds, user.id]
    );
    const deletedCount = deleteResult.rowCount ?? 0;

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} file(s)`,
      deletedCount,
      storageResults,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ message: "Batch delete failed" }, { status: 500 });
  }
}
