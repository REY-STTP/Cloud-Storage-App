// app/api/auth/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import { verifyToken } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").toString().trim();
    const password = (body.password || "").toString();

    if (!token || !password) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return NextResponse.json({ message: "Token has expired" }, { status: 400 });
      }
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    if (decoded.purpose !== "password-reset") {
      return NextResponse.json({ message: "Invalid token purpose" }, { status: 400 });
    }

    const email = decoded.email;

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 400 });
    }

    const oldPassword = (user as any).password;
    const isSamePassword = await bcrypt.compare(password, oldPassword);
    
    if (isSamePassword) {
      return NextResponse.json({ 
        message: "New password must be different from old password" 
      }, { status: 400 });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    (user as any).password = hashedPassword;
    await user.save();

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("POST /api/auth/reset error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

