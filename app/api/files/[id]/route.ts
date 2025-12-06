// app/api/files/[id]/route.ts
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
  const mime = (file && (file.mimeType || file.mime_type || file.format || file.type)) || "";
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

  await connectDB();

  const file = await FileModel.findById(id);

  if (!file || file.owner.toString() !== payload.userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (file.url) {
    return NextResponse.redirect(file.url);
  }

  return NextResponse.json({ message: "File URL not available" }, { status: 404 });
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

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const filename = body?.filename;
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ message: "Invalid filename" }, { status: 400 });
  }

  const file = await FileModel.findById(id);

  if (!file || file.owner.toString() !== payload.userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  file.filename = filename;
  await file.save();

  return NextResponse.json({
    id: file._id.toString(),
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

  await connectDB();

  const file = await FileModel.findById(id);

  if (!file || file.owner.toString() !== payload.userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!file.publicId) {
    await file.deleteOne();
    return NextResponse.json({ message: "Deleted (no cloud resource)" });
  }

  try {
    const r = await safeDestroy(file.publicId, file);
    if (!r.ok) {
      console.warn("Failed to delete from Cloudinary:", r);
      await file.deleteOne();
      return NextResponse.json({
        message: "Deleted (cloud delete failed)",
        cloudinaryError: r.error,
        resource_type: r.resource_type,
      }, { status: 200 });
    } else {
      await file.deleteOne();
      return NextResponse.json({
        message: "Deleted",
        cloudinaryResult: r.result,
        resource_type: r.resource_type,
      });
    }
  } catch (err) {
    console.warn("Unexpected error deleting from Cloudinary:", err);
    try { await file.deleteOne(); } catch (_) {}
    return NextResponse.json({ message: "Deleted (cloud delete encountered unexpected error)" }, { status: 200 });
  }
}
