// app/api/auth/forgot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createTransporter,
  generateToken,
  sendPasswordResetEmail,
  verifyTransporter,
  logEmailResult,
} from "@/lib/mail";

export const runtime = "nodejs";

const RESEND_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Batasi permintaan link reset per alamat email (anti-spam & anti-enumeration).
    const limit = checkRateLimit(`forgot:${email}`, RESEND_COOLDOWN_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: `Please wait ${limit.retryAfterSeconds}s before requesting another reset link` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await query<{ id: string; email: string }>(
      "select id, email from users where email = $1 limit 1",
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ message: "Email is not registered" }, { status: 404 });
    }

    const resetToken = generateToken(user.email, user.id, "password-reset");

    let transporterInfo;
    try {
      transporterInfo = await createTransporter();
    } catch (err) {
      console.error("createTransporter error:", err);
      return NextResponse.json({ message: "Failed to setup mailer" }, { status: 500 });
    }

    const { transporter, type } = transporterInfo;

    const isValid = await verifyTransporter(transporter);
    if (!isValid) {
      return NextResponse.json({ message: "Failed to send reset email" }, { status: 500 });
    }

    let sendInfo;
    try {
      sendInfo = await sendPasswordResetEmail(transporter, email, resetToken);
    } catch (sendErr) {
      console.error("sendPasswordResetEmail failed:", sendErr);
      if ((sendErr as any).response) {
        console.error("SMTP response:", (sendErr as any).response);
      }
      return NextResponse.json({ message: "Failed to send reset email" }, { status: 500 });
    }

    logEmailResult(sendInfo, type, "password-reset");

    if (Array.isArray(sendInfo.rejected) && sendInfo.rejected.length > 0) {
      console.warn("Recipient rejected by SMTP provider:", sendInfo.rejected);
      return NextResponse.json({ message: "Failed to send reset email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Reset link sent to email" });
  } catch (err) {
    console.error("POST /api/auth/forgot error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

