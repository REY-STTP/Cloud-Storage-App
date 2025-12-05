import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File } from "@/models/File";
import { verifyJwt } from "@/lib/auth";

export const runtime = "nodejs";

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

  const body = await req.json() as {
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
  }).select("_id name email role banned");

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

  await File.deleteMany({ owner: id });
  await User.findByIdAndDelete(id);

  return NextResponse.json({ message: "User deleted" });
}
