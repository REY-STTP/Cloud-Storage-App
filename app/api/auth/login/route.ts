import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, signJwt } from "@/lib/auth";
import type { UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const result = await query<UserRow>(
      "select * from users where email = $1 limit 1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ message: "Your account has been banned." }, { status: 403 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
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
