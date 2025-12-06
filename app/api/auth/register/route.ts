import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword, signJwt } from "@/lib/auth";

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

    await connectDB();

    const already = await User.findOne({ email });
    if (already) {
      return NextResponse.json({ message: "Email is already in use" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "USER",
      verified: false,
      banned: false,
    });

    const token = signJwt({ userId: user._id.toString(), role: user.role });

    const res = NextResponse.json({
      id: user._id.toString(),
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