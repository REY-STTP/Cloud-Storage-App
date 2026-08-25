// app/api/admin/users/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

/** Keep only well-formed uuids so Postgres doesn't throw on bad input. */
function toUuidList(ids: unknown[]): string[] {
  return ids.filter(
    (id): id is string =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}

export async function PATCH(req: NextRequest) {
  // Role dari DB, bukan JWT (temuan H-1).
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { ids, banned } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No user IDs provided" }, { status: 400 });
    }

    if (typeof banned !== "boolean") {
      return NextResponse.json({ message: "Invalid banned status" }, { status: 400 });
    }

    const uuidIds = toUuidList(ids);
    if (uuidIds.length === 0) {
      return NextResponse.json({
        message: `Successfully ${banned ? "banned" : "unbanned"} 0 user(s)`,
        modifiedCount: 0,
      });
    }

    // Admin accounts are protected: only USER rows are touched.
    // `banned is distinct from $2` keeps modifiedCount close to Mongo semantics.
    const result = await query(
      `update users set banned = $2
       where id = any($1::uuid[]) and role = 'USER' and banned is distinct from $2`,
      [uuidIds, banned]
    );
    const modifiedCount = result.rowCount ?? 0;

    return NextResponse.json({
      message: `Successfully ${banned ? "banned" : "unbanned"} ${modifiedCount} user(s)`,
      modifiedCount,
    });
  } catch (error) {
    console.error("Batch ban/unban error:", error);
    return NextResponse.json({ message: "Batch operation failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No user IDs provided" }, { status: 400 });
    }

    const uuidIds = toUuidList(ids);
    if (uuidIds.length === 0) {
      return NextResponse.json({ message: "No valid users to delete" }, { status: 404 });
    }

    // Only regular users can be deleted; admins are protected.
    const usersResult = await query<{ id: string }>(
      "select id from users where id = any($1::uuid[]) and role = 'USER'",
      [uuidIds]
    );
    const usersToDelete = usersResult.rows;

    if (usersToDelete.length === 0) {
      return NextResponse.json({ message: "No valid users to delete" }, { status: 404 });
    }

    const userIds = usersToDelete.map((u) => u.id);

    const filesResult = await query<{ id: string; publicId: string | null }>(
      `select id, public_id as "publicId" from files where owner = any($1::uuid[])`,
      [userIds]
    );
    const files = filesResult.rows;

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

    const fileDeleteResult = await query(
      "delete from files where owner = any($1::uuid[])",
      [userIds]
    );

    const userDeleteResult = await query(
      "delete from users where id = any($1::uuid[])",
      [userIds]
    );

    return NextResponse.json({
      message: `Successfully deleted ${userDeleteResult.rowCount ?? 0} user(s) and their files`,
      deletedCount: userDeleteResult.rowCount ?? 0,
      filesDeleted: fileDeleteResult.rowCount ?? 0,
      storageResults,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ message: "Batch delete failed" }, { status: 500 });
  }
}
