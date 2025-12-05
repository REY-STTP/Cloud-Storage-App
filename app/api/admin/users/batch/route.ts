// app/api/admin/users/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const { ids, banned } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No user IDs provided" }, { status: 400 });
    }

    if (typeof banned !== "boolean") {
      return NextResponse.json({ message: "Invalid banned status" }, { status: 400 });
    }

    const result = await User.updateMany(
      {
        _id: { $in: ids },
        role: "USER",
      },
      {
        $set: { banned },
      }
    );

    return NextResponse.json({
      message: `Successfully ${banned ? "banned" : "unbanned"} ${result.modifiedCount} user(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Batch ban/unban error:", error);
    return NextResponse.json({ message: "Batch operation failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No user IDs provided" }, { status: 400 });
    }

    const usersToDelete = await User.find({
      _id: { $in: ids },
      role: "USER",
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({ message: "No valid users to delete" }, { status: 404 });
    }

    const userIds = usersToDelete.map((u) => u._id);

    const files = await FileModel.find({
      owner: { $in: userIds },
    });

    const deleteFilePromises = files.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.warn(`Failed to delete file ${file.path}:`, err);
      }
    });

    await Promise.all(deleteFilePromises);

    await FileModel.deleteMany({
      owner: { $in: userIds },
    });

    const result = await User.deleteMany({
      _id: { $in: userIds },
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} user(s) and their files`,
      deletedCount: result.deletedCount,
      filesDeleted: files.length,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ message: "Batch delete failed" }, { status: 500 });
  }
}