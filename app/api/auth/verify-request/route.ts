// app/api/auth/verify-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  createTransporter,
  generateToken,
  sendVerificationEmail,
  verifyTransporter,
  logEmailResult,
} from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();
    const tokenCookie = req.cookies.get("token")?.value;

    if (!email && !tokenCookie) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: "Email is not registered" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: "Account already verified" }, { status: 400 });
    }

    const verifyToken = generateToken(user.email, user._id.toString(), "email-verify");

    const transporterInfo = await createTransporter();
    const { transporter, type } = transporterInfo;

    const isValid = await verifyTransporter(transporter);
    if (!isValid) {
      return NextResponse.json({ message: "Failed to send verification email" }, { status: 500 });
    }

    const info = await sendVerificationEmail(transporter, user.email, verifyToken);

    logEmailResult(info, type, "verify-mail");

    await user.save();

    return NextResponse.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("POST /api/auth/verify-request error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

