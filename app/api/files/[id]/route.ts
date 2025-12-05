import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import fs from "fs/promises";

export const runtime = "nodejs";

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

  const file = await File.findById(id);

  if (!file || file.owner.toString() !== payload.userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const buffer = await fs.readFile(file.path);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        file.filename
      )}"`,
      "Content-Length": String(file.size ?? buffer.length)
    },
  });
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

  const { filename } = await req.json();
  const file = await File.findById(id);

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

  const file = await File.findById(id);

  if (!file || file.owner.toString() !== payload.userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    await fs.unlink(file.path);
  } catch (e) {
    console.warn("Failed to delete physical file", e);
  }

  await file.deleteOne();

  return NextResponse.json({ message: "Deleted" });
}
