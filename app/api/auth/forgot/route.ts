// app/api/auth/forgot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  createTransporter,
  generateToken,
  sendPasswordResetEmail,
  verifyTransporter,
  logEmailResult,
} from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: "Email is not registered" }, { status: 404 });
    }

    const resetToken = generateToken(user.email, user._id.toString(), "password-reset");

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

