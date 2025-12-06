// app/api/files/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function safeDestroy(publicId: string, file?: any) {
  const mime = (file && (file.mimeType || file.format || file.type)) || "";
  const tryList: string[] = [];

  if (mime) {
    const m = String(mime).toLowerCase();
    if (m.startsWith("image/")) tryList.push("image");
    else if (m.startsWith("video/")) tryList.push("video");
    else if (m.includes("javascript")) tryList.push("javascript");
    else if (m.includes("css")) tryList.push("css");
    else tryList.push("raw");
  }

  ["raw", "image", "video", "javascript", "css"].forEach((t) => {
    if (!tryList.includes(t)) tryList.push(t);
  });

  let lastErr: any = null;
  for (const resource_type of tryList) {
    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type });
      return { ok: true, result: res, resource_type };
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || "";
      if (err?.http_code === 400 && msg.includes("Invalid resource type")) {
        continue;
      }
      return { ok: false, error: String(err), resource_type };
    }
  }

  return { ok: false, error: String(lastErr) || "destroy failed", resource_type: null };
}

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
    }).lean();

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    const cloudinaryResults = await Promise.all(
      files.map(async (file: any) => {
        if (!file.publicId) return { ok: false, id: file._id, reason: "no-publicId" };
        try {
          const r = await safeDestroy(file.publicId, file);
          if (r.ok) return { ok: true, id: file._id, result: r.result, resource_type: r.resource_type };
          return { ok: false, id: file._id, error: r.error, resource_type: r.resource_type };
        } catch (err) {
          console.warn(`Failed to delete ${file.publicId} from Cloudinary:`, err);
          return { ok: false, id: file._id, error: String(err) };
        }
      })
    );

    const result = await FileModel.deleteMany({
      _id: { $in: ids },
      owner: payload.userId,
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} file(s)`,
      deletedCount: result.deletedCount,
      cloudinaryResults,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json({ message: "Batch delete failed" }, { status: 500 });
  }
}
