// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").toString();

    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return NextResponse.json({ message: "Token has expired" }, { status: 400 });
      }
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    if (decoded.purpose !== "email-verify") {
      return NextResponse.json({ message: "Invalid token purpose" }, { status: 400 });
    }

    const email = decoded.email;
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: "Already verified" }, { status: 200 });
    }

    user.verified = true;
    await user.save();

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("POST /api/auth/verify error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
