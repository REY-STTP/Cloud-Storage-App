// app/api/auth/verify-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createTransporter,
  generateToken,
  sendVerificationEmail,
  verifyTransporter,
  logEmailResult,
} from "@/lib/mail";

export const runtime = "nodejs";

const RESEND_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();
    const tokenCookie = req.cookies.get("token")?.value;

    if (!email && !tokenCookie) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Batasi pengiriman ulang email verifikasi per alamat email.
    const limit = checkRateLimit(`verify:${email || "cookie"}`, RESEND_COOLDOWN_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: `Please wait ${limit.retryAfterSeconds}s before requesting another verification email` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await query<{ id: string; email: string; verified: boolean }>(
      "select id, email, verified from users where email = $1 limit 1",
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ message: "Email is not registered" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: "Account already verified" }, { status: 400 });
    }

    const verifyToken = generateToken(user.email, user.id, "email-verify");

    const transporterInfo = await createTransporter();
    const { transporter, type } = transporterInfo;

    const isValid = await verifyTransporter(transporter);
    if (!isValid) {
      return NextResponse.json({ message: "Failed to send verification email" }, { status: 500 });
    }

    const info = await sendVerificationEmail(transporter, user.email, verifyToken);

    logEmailResult(info, type, "verify-mail");

    return NextResponse.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("POST /api/auth/verify-request error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
