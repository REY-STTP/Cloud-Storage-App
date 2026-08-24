// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyJwt, hashPassword, comparePassword } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { deleteObject } from "@/lib/storage";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await query<UserRow>(
    `select id, name, email, password, role, verified, banned, created_at as "createdAt", updated_at as "updatedAt"
     from users where id = $1 limit 1`,
    [payload.userId]
  );
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return jsonNoStore({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    banned: user.banned,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, currentPassword, newPassword } = body as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const result = await query<UserRow>(
    `select id, name, email, password, role, verified, banned, created_at as "createdAt", updated_at as "updatedAt"
     from users where id = $1 limit 1`,
    [payload.userId]
  );
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  let newName = user.name;
  if (name && name.trim().length > 0) {
    newName = name.trim();
  }

  let newPasswordHash: string | null = null;
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { message: "Current password is required to change password" },
        { status: 400 }
      );
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    newPasswordHash = await hashPassword(newPassword);
  }

  const updated = await query<UserRow>(
    `update users set
       name = $2,
       password = coalesce($3, password)
     where id = $1
     returning id, name, email, role, verified, banned`,
    [payload.userId, newName, newPasswordHash]
  );

  const updatedUser = updated.rows[0];

  return NextResponse.json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    verified: updatedUser.verified,
    banned: updatedUser.banned,
  });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.userId;

  const filesResult = await query<{ id: string; publicId: string | null }>(
    `select id, public_id as "publicId" from files where owner = $1`,
    [userId]
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

  const fileDeleteResult = await query("delete from files where owner = $1", [userId]);

  const userDeleteResult = await query("delete from users where id = $1", [userId]);

  const res = NextResponse.json({
    message: "Account deleted",
    userDeleted: (userDeleteResult.rowCount ?? 0) > 0,
    filesDeletedCount: fileDeleteResult.rowCount ?? 0,
    storageResults,
  });

  res.cookies.set("token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
