// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { verifyToken } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").toString();

    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
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

    if (decoded.purpose !== "email-verify") {
      return NextResponse.json({ message: "Invalid token purpose" }, { status: 400 });
    }

    const email = decoded.email;
    const result = await query<{ verified: boolean }>(
      "select verified from users where email = $1 limit 1",
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: "Already verified" }, { status: 200 });
    }

    await query("update users set verified = true where email = $1", [email]);

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("POST /api/auth/verify error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
