// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?: string;
    role?: "USER" | "ADMIN";
    verified?: boolean;
    banned?: boolean;
  };

  const updated = await query<{
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    verified: boolean;
    banned: boolean;
  }>(
    `update users set
       name = coalesce($2, name),
       role = coalesce($3, role),
       verified = coalesce($4, verified),
       banned = coalesce($5, banned)
     where id = $1
     returning id, name, email, role, verified, banned`,
    [
      id,
      body.name !== undefined ? body.name : null,
      body.role !== undefined ? body.role : null,
      body.verified !== undefined ? body.verified : null,
      body.banned !== undefined ? body.banned : null,
    ]
  );

  const updatedUser = updated.rows[0];

  if (!updatedUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    verified: updatedUser.verified,
    banned: updatedUser.banned,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  try {
    const filesResult = await query<{ id: string; publicId: string | null }>(
      `select id, public_id as "publicId" from files where owner = $1`,
      [id]
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

    const fileDeleteResult = await query("delete from files where owner = $1", [id]);

    const userDeleteResult = await query("delete from users where id = $1", [id]);

    return NextResponse.json({
      message: "User deleted",
      userDeleted: (userDeleteResult.rowCount ?? 0) > 0,
      filesDeletedCount: fileDeleteResult.rowCount ?? 0,
      storageResults,
    });
  } catch (err) {
    console.error("DELETE /api/admin/users/:id error", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
