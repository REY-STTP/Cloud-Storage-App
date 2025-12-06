// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File as FileModel } from "@/models/File";
import { verifyJwt, hashPassword, comparePassword } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function safeDestroy(publicId: string, file?: any) {
  const mime = (file && (file.resourceType || file.mimeType || file.format || file.type)) || "";
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

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(payload.userId);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id.toString(),
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

  await connectDB();

  const body = await req.json();
  const { name, currentPassword, newPassword } = body as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await User.findById(payload.userId);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (name && name.trim().length > 0) {
    user.name = name.trim();
  }

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

    user.password = await hashPassword(newPassword);
  }

  await user.save();

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    banned: user.banned,
  });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const userId = payload.userId;

  const files = await FileModel.find({ owner: userId }).lean();

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

  const fileDeleteResult = await FileModel.deleteMany({ owner: userId });

  const userDeleteResult = await User.findByIdAndDelete(userId);

  const res = NextResponse.json({
    message: "Account deleted",
    userDeleted: !!userDeleteResult,
    filesDeletedCount: fileDeleteResult.deletedCount ?? 0,
    cloudinaryResults,
  });

  res.cookies.set("token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
