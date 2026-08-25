// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/auth";
import { requireAuth, requireUser } from "@/lib/guards";
import { jsonNoStore } from "@/lib/http";
import { deleteObject } from "@/lib/storage";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Satu-satunya pengecualian kebijakan ban: user banned tetap boleh melihat
  // profilnya sendiri supaya UI bisa menampilkan status "dibanned".
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

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
  try {
    const guard = await requireUser(req);
    if (!guard.ok) return guard.response;
    const user = guard.user;

    const body = await req.json();
    const { name, currentPassword, newPassword } = body as {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    let newName = user.name;
    if (name && name.trim().length > 0) {
      newName = name.trim();
    }

    let newPasswordHash: string | null = null;
    let bumpPwdChangedAt = false; // M-2
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
      if (newPassword.length > 128) {
        return NextResponse.json(
          { message: "New password must be at most 128 characters" },
          { status: 400 }
        );
      }

      newPasswordHash = await hashPassword(newPassword);
      bumpPwdChangedAt = true;
    }

    // M-2: ganti password meng-invalidate semua sesi lama (iat < pwd_changed_at).
    const updated = await query<UserRow>(
      `update users set
         name = $2,
         password = coalesce($3, password),
         pwd_changed_at = case when $4 then now() else pwd_changed_at end
       where id = $1
       returning id, name, email, role, verified, banned`,
      [user.id, newName, newPasswordHash, bumpPwdChangedAt]
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
  } catch (err) {
    console.error("PATCH /api/user/profile error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // requireUser: user banned tidak bisa self-delete (ban = beku penuh;
  // penghapusan akun tetap lewat admin) — kebijakan baru disetujui di PLAN-H-1.
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

  // M-5: wajib konfirmasi password sebelum hapus akun permanen.
  const body = await req.json().catch(() => ({}));
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return NextResponse.json(
      { message: "Current password is required to delete your account" },
      { status: 400 }
    );
  }
  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { message: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const userId = user.id;

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
