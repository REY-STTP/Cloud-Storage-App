import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, signJwt } from "@/lib/auth";
import type { UserRow } from "@/lib/types";

const ALLOWED_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
];

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Fields are empty" }, { status: 400 });
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();

    if (!emailDomain) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
      return NextResponse.json(
        { message: `Email domain '${emailDomain}' is not allowed. Please use email from: ${ALLOWED_DOMAINS.join(", ")}` },
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

    const result = await query<UserRow>(
      `insert into users (name, email, password, role, verified, banned)
       values ($1, $2, $3, 'USER', false, false)
       returning id, name, email, role, verified, banned`,
      [name, email, hashed]
    );

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
