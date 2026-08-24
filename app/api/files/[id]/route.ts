// app/api/files/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { deleteObject, getDownloadUrl } from "@/lib/storage";
import type { FileRow } from "@/lib/types";

export const runtime = "nodejs";

const FILE_SELECT = `select id, filename, original_name as "originalName", mime_type as "mimeType",
        resource_type as "resourceType", url, public_id as "publicId",
        size, owner, created_at as "createdAt", updated_at as "updatedAt"
 from files where id = $1 and owner = $2 limit 1`;

/** Guard: valid uuid format for Postgres. */
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const result = await query<FileRow>(FILE_SELECT, [id, payload.userId]);
  const file = result.rows[0];

  if (!file || !file.publicId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Bucket R2 privat: buat link download presigned yang berlaku terbatas.
  try {
    const downloadUrl = await getDownloadUrl(file.publicId);
    return NextResponse.redirect(downloadUrl);
  } catch (err) {
    console.error("Failed to create download URL:", err);
    return NextResponse.json(
      { message: "File storage is not configured. Please contact the administrator." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const filename = body?.filename;
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ message: "Invalid filename" }, { status: 400 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Banned users keep read access until their token expires, but may not
  // modify anything.
  const actor = await getUserById(payload.userId);
  if (!actor) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  if (actor.banned) {
    return NextResponse.json({ message: "Your account has been banned" }, { status: 403 });
  }

  const updated = await query<FileRow>(
    `update files set filename = $3 where id = $1 and owner = $2
     returning id, filename, created_at as "createdAt"`,
    [id, payload.userId, filename]
  );
  const file = updated.rows[0];

  if (!file) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: file.id,
    filename: file.filename,
    createdAt: file.createdAt,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const actor = await getUserById(payload.userId);
  if (!actor) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  if (actor.banned) {
    return NextResponse.json({ message: "Your account has been banned" }, { status: 403 });
  }

  const result = await query<FileRow>(FILE_SELECT, [id, payload.userId]);
  const file = result.rows[0];

  if (!file) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  async function deleteRow() {
    await query("delete from files where id = $1 and owner = $2", [id, payload!.userId]);
  }

  if (!file.publicId) {
    await deleteRow();
    return NextResponse.json({ message: "Deleted (no stored object)" });
  }

  let objectDeleted = true;
  let objectError: unknown = null;
  try {
    await deleteObject(file.publicId);
  } catch (err) {
    console.warn(`Failed to delete ${file.publicId} from storage:`, err);
    objectDeleted = false;
    objectError = err instanceof Error ? err.message : String(err);
  }

  // Hapus baris DB meskipun objek gagal dihapus — data tidak boleh nyangkut.
  await deleteRow();

  if (!objectDeleted) {
    return NextResponse.json({
      message: "Deleted (storage cleanup failed)",
      storageError: objectError,
    }, { status: 200 });
  }

  return NextResponse.json({ message: "Deleted" });
}
