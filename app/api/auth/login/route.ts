import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, signJwt, hashPassword, BCRYPT_COST } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import type { UserRow } from "@/lib/types";

// Hash bcrypt valid untuk timing equalization: saat email tidak terdaftar,
// kita tetap menjalankan bcrypt.compare terhadap hash ini agar durasi respons
// mirip dengan kasus "password salah", sehingga keberadaan email tidak bisa
// dibedakan dari waktu respons. Dihitung sekali saat module dimuat.
const DUMMY_HASH = bcrypt.hashSync("timing-equalization-dummy-input", 10);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // ---- Rate limiting ----
    // Dua kunci: per-IP (anti password spraying lintas akun) dan per-email
    // (anti penargetan satu akun). Window ketat 60 detik seperti endpoint
    // forgot/verify-request.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    for (const key of [`login:ip:${ip}`, `login:email:${email}`]) {
      const limit = checkRateLimit(key, 60_000);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            message:
              "Too many login attempts. Please wait before trying again.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(limit.retryAfterSeconds) },
          }
        );
      }
    }

    const result = await query<UserRow>(
      "select * from users where email = $1 limit 1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      // Timing equalization: bandingkan dengan hash dummy supaya waktu respons
      // setara dengan kasus user ada tapi password salah.
      await comparePassword(password, DUMMY_HASH);
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ message: "Your account has been banned." }, { status: 403 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    }

    // L-3: progressive rehash — jika hash lama memakai cost di bawah standar
    // saat ini, tingkatkan diam-diam saat login berhasil.
    const costMatch = /^\$2[aby]\$(\d{2})\$/.exec(user.password);
    if (costMatch && Number(costMatch[1]) < BCRYPT_COST) {
      await query("update users set password = $1 where id = $2", [
        await hashPassword(password),
        user.id,
      ]);
    }

    const token = signJwt({ userId: user.id, role: user.role });

    const res = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      banned: user.banned,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
