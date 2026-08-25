import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, signJwt } from "@/lib/auth";
import { checkRateLimitAll } from "@/lib/rate-limit";
import type { UserRow } from "@/lib/types";

const ALLOWED_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // M-6: email dinormalisasi lowercase sejak awal — penyimpanan, lookup,
    // dan rate-limit key memakai bentuk yang sama.
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Fields are empty" }, { status: 400 });
    }

    // ---- Rate limiting ----
    // Dua kunci: per-IP (maks 3 akun per jam, anti bot signup & spam SMTP) dan
    // per-email (1x per 10 menit, anti spam ulang alamat yang sama).
    // checkRateLimitAll memvalidasi semua kunci dulu — request yang ditolak
    // kunci email tidak ikut membakar slot IP (temuan L-11).
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimitAll([
      [`register:ip:${ip}`, 60 * 60 * 1000, 3],
      [`register:email:${email}`, 10 * 60 * 1000, 1],
    ]);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const emailDomain = email.split("@")[1];
    if (!emailDomain) {
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }

    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
      return NextResponse.json(
        { message: `Email domain '${emailDomain}' is not allowed. Please use email from: ${ALLOWED_DOMAINS.join(", ")}` },
        { status: 400 }
      );
    }

    // ---- H-2: password policy & batas input ----
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json(
        { message: "Name must be at most 100 characters" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (password.length > 128) {
      // bcrypt hanya memproses 72 byte pertama — batasi agar tidak memberi
      // kesan keamanan palsu dan mencegah payload besar.
      return NextResponse.json(
        { message: "Password must be at most 128 characters" },
        { status: 400 }
      );
    }

    const already = await query<{ id: string }>(
      "select id from users where email = $1 limit 1",
      [email]
    );
    if (already.rowCount && already.rowCount > 0) {
      return NextResponse.json({ message: "Email is already in use" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    let result;
    try {
      result = await query<UserRow>(
        `insert into users (name, email, password, role, verified, banned)
         values ($1, $2, $3, 'USER', false, false)
         returning id, name, email, role, verified, banned`,
        [name, email, hashed]
      );
    } catch (e) {
      // Race dengan registrasi paralel email yang sama → unique constraint.
      if (pgErrorCode(e) === "23505") {
        return NextResponse.json({ message: "Email is already in use" }, { status: 400 });
      }
      throw e;
    }

    const user = result.rows[0];

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
