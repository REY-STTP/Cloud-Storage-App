// app/api/auth/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { verifyToken } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").toString().trim();
    const password = (body.password || "").toString();

    if (!token || !password) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });
    }

    // Batas per-IP agar endpoint tidak bisa di-brute-force massal.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`reset:ip:${ip}`, 60 * 60 * 1000, 20);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    // Selaras dengan registrasi (min 8): kebijakan password tidak boleh
    // lebih longgar di jalur reset dibanding jalur daftar.
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
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

    const result = await query<{ password: string; pwdChangedAt: Date | null }>(
      'select password, pwd_changed_at as "pwdChangedAt" from users where email = $1 limit 1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 400 });
    }

    // Single-use: token reset yang sudah dipakai menggeser pwd_changed_at,
    // sehingga replay dalam jendela 1 jam langsung ditolak di sini.
    if (typeof decoded.pwdc === "number" && user.pwdChangedAt) {
      const current = Math.floor(new Date(user.pwdChangedAt).getTime() / 1000);
      if (current > decoded.pwdc) {
        return NextResponse.json(
          { message: "This reset link has already been used. Please request a new one." },
          { status: 400 }
        );
      }
    }

    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return NextResponse.json({
        message: "New password must be different from old password"
      }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // M-2: catat waktu ganti password — semua sesi JWT lama (iat lebih kecil)
    // otomatis invalid lewat pengecekan di lib/guards.ts.
    await query(
      "update users set password = $1, pwd_changed_at = now() where email = $2",
      [hashedPassword, email]
    );

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("POST /api/auth/reset error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
