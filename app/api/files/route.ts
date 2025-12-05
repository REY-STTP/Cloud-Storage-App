// app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
  const skip = (page - 1) * limit;

  const q = (url.searchParams.get("q") || "").trim();

  const filter: any = { owner: payload.userId };
  if (q) {
    filter.filename = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const total = await FileModel.countDocuments(filter);

  const docs = await FileModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const files = docs.map((f: any) => ({
    id: f._id.toString(),
    filename: f.filename,
    size: f.size ?? 0,
    createdAt: f.createdAt,
  }));

  return NextResponse.json({
    files,
    total,
    page,
    perPage: limit,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ message: "No files" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const savedFiles: Array<{ id: string; filename: string; size: number; createdAt: Date }> = [];

  for (const file of files) {
    if (!(file instanceof Blob)) continue;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(uploadDir, `${Date.now()}-${file.name}`);
    await fs.writeFile(filePath, buffer);

    const saved = await FileModel.create({
      filename: file.name,
      path: filePath,
      size: (file as any).size ?? buffer.length,
      owner: payload.userId,
    });

    savedFiles.push({
      id: saved._id.toString(),
      filename: saved.filename,
      size: saved.size ?? 0,
      createdAt: saved.createdAt,
    });
  }

  return NextResponse.json(savedFiles, { status: 201 });
}
