// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File } from "@/models/File";
import { verifyJwt, hashPassword, comparePassword } from "@/lib/auth";
import fs from "fs/promises";

export const runtime = "nodejs";

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

  const files = await File.find({ owner: userId });

  for (const f of files) {
    try {
      await fs.unlink(f.path);
    } catch (e) {
      console.warn("Failed to delete physical file for user delete:", e);
    }
  }

  await File.deleteMany({ owner: userId });
  
  await User.findByIdAndDelete(userId);

  const res = NextResponse.json({ message: "Account deleted" });
  res.cookies.set("token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
