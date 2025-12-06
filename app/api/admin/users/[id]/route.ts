// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
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
      if (err?.http_code === 400 && msg.includes("Invalid resource type")) continue;
      return { ok: false, error: String(err), resource_type };
    }
  }

  return { ok: false, error: String(lastErr) || "destroy failed", resource_type: null };
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

  await connectDB();

  const body = (await req.json()) as {
    name?: string;
    role?: "USER" | "ADMIN";
    verified?: boolean;
    banned?: boolean;
  };

  const update: any = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.role !== undefined) update.role = body.role;
  if (body.verified !== undefined) update.verified = body.verified;
  if (body.banned !== undefined) update.banned = body.banned;

  const updated = await User.findByIdAndUpdate(id, update, {
    new: true,
  }).select("_id name email role banned verified");

  if (!updated) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated._id.toString(),
    name: updated.name,
    email: updated.email,
    role: updated.role,
    verified: updated.verified,
    banned: updated.banned,
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

  await connectDB();

  try {
    const files = await FileModel.find({ owner: id }).lean();

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

    const fileDeleteResult = await FileModel.deleteMany({ owner: id });

    const userDeleteResult = await User.findByIdAndDelete(id);

    return NextResponse.json({
      message: "User deleted",
      userDeleted: !!userDeleteResult,
      filesDeletedCount: fileDeleteResult.deletedCount ?? 0,
      cloudinaryResults,
    });
  } catch (err) {
    console.error("DELETE /api/admin/users/:id error", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
