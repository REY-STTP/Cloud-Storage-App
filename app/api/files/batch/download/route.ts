// app/api/files/batch/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import archiver from "archiver";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    }).lean();

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    if (files.length === 1) {
      const file = files[0];
      const fs = await import("fs/promises");
      
      try {
        const buffer = await fs.readFile(file.path);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
          },
        });
      } catch (err) {
        return NextResponse.json({ message: "File not found" }, { status: 404 });
      }
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    
    for (const file of files) {
      try {
        archive.file(file.path, { name: file.filename });
      } catch (err) {
        console.warn(`Failed to add file ${file.filename} to archive:`, err);
      }
    }

    archive.finalize();

    const stream = Readable.toWeb(archive as any);
    
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="files-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error("Batch download error:", error);
    return NextResponse.json({ message: "Batch download failed" }, { status: 500 });
  }
}