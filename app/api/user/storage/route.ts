// app/api/user/storage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { File as FileModel } from "@/models/File";
import { Types } from "mongoose";

const MAX_STORAGE_BYTES =
  Number(process.env.MAX_STORAGE_BYTES ?? 1073741824);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const agg = await FileModel.aggregate([
    { $match: { owner: new Types.ObjectId(payload.userId) } },
    { $group: { _id: null, totalSize: { $sum: "$size" } } },
  ]);

  const usedBytes = agg[0]?.totalSize ?? 0;
  const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - usedBytes);
  const usedPercent =
    MAX_STORAGE_BYTES > 0
      ? Math.min(100, Math.round((usedBytes / MAX_STORAGE_BYTES) * 100))
      : 0;

  return NextResponse.json({
    usedBytes,
    remainingBytes,
    maxBytes: MAX_STORAGE_BYTES,
    usedPercent,
  });
}
