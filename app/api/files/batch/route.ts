// app/api/files/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No file IDs provided" }, { status: 400 });
    }

    const files = await FileModel.find({
      _id: { $in: ids },
      owner: payload.userId,
    });

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    const deletePromises = files.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.warn(`Failed to delete file ${file.path}:`, err);
      }
    });

    await Promise.all(deletePromises);

    const result = await FileModel.deleteMany({
      _id: { $in: ids },
      owner: payload.userId,
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} file(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ message: "Batch delete failed" }, { status: 500 });
  }
}