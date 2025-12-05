// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File } from "@/models/File";
import { verifyJwt } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    const payload = token ? verifyJwt(token) : null;

    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * perPage;

    const q = (url.searchParams.get("q") || "").trim();
    const filter: any = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    const pipeline: any[] = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: perPage },
            {
              $lookup: {
                from: File.collection.name,
                let: { userId: "$_id" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$owner", "$$userId"] } } },
                  {
                    $group: {
                      _id: "$owner",
                      fileCount: { $sum: 1 },
                      totalSizeBytes: { $sum: { $ifNull: ["$size", 0] } },
                    },
                  },
                ],
                as: "stats",
              },
            },
            {
              $addFields: {
                _computedFileCount: { $ifNull: [{ $arrayElemAt: ["$stats.fileCount", 0] }, 0] },
                _computedTotalSize: { $ifNull: [{ $arrayElemAt: ["$stats.totalSizeBytes", 0] }, 0] },
              },
            },
            {
              $addFields: {
                fileCount: {
                  $cond: [{ $eq: ["$role", "ADMIN"] }, null, "$_computedFileCount"],
                },
                totalSizeBytes: {
                  $cond: [{ $eq: ["$role", "ADMIN"] }, null, "$_computedTotalSize"],
                },
              },
            },
            {
              $project: {
                stats: 0,
                _computedFileCount: 0,
                _computedTotalSize: 0,
                password: 0,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const agg = await User.aggregate(pipeline).exec();
    const facet = agg && agg[0] ? agg[0] : { data: [], totalCount: [] };
    const usersRaw = facet.data || [];
    const total = (facet.totalCount && facet.totalCount[0] && facet.totalCount[0].count) ? facet.totalCount[0].count : 0;

    const users = usersRaw.map((u: any) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      banned: !!u.banned,
      verified: u.verified,
      createdAt: u.createdAt,
      fileCount: u.fileCount === null ? null : (typeof u.fileCount === "number" ? u.fileCount : 0),
      totalSizeBytes: u.totalSizeBytes === null ? null : (typeof u.totalSizeBytes === "number" ? u.totalSizeBytes : 0),
    }));

    const [admins, banned] = await Promise.all([
      User.countDocuments({ role: "ADMIN" }),
      User.countDocuments({ banned: true }),
    ]);

    return NextResponse.json({ users, total, admins, banned, page, perPage });
  } catch (err) {
    console.error("GET /api/admin/users error", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET,OPTIONS,PATCH,DELETE",
      "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
