// app/api/auth/forgot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 15_000,
    });
    return { transporter, type: "smtp" as const };
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return { transporter, type: "ethereal" as const, testAccount };
}

async function sendResetEmailRaw(transporter: nodemailer.Transporter, to: string, from: string, link: string) {
  const mailOptions = {
    from,
    to,
    subject: "Password reset request",
    text: `You requested a password reset. Use the link below to reset your password:\n\n${link}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to reset your password:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hours. If you didn't request this, ignore this email.</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

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

    const resetToken = jwt.sign(
      { 
        email: user.email,
        userId: user._id.toString(),
        purpose: "password-reset"
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
    const link = `${base}/reset-password?token=${resetToken}`;

    let transporterInfo;
    try {
      transporterInfo = await createTransporter();
    } catch (err) {
      console.error("createTransporter error:", err);
      return NextResponse.json({ message: "Failed to setup mailer" }, { status: 500 });
    }

    const { transporter, type } = transporterInfo as any;

    try {
      await transporter.verify();
      console.info("SMTP verify OK (type=%s)", type);
    } catch (verifyErr) {
      console.error("transporter.verify() failed:", verifyErr);
      return NextResponse.json({ message: "Failed to send reset email" }, { status: 500 });
    }

    const from = process.env.SENDER || (process.env.SMTP_USER ? `${process.env.SMTP_USER}` : `no-reply@example.com`);

    let sendInfo;
    try {
      sendInfo = await sendResetEmailRaw(transporter, email, from, link);
    } catch (sendErr) {
      console.error("transporter.sendMail failed:", sendErr);
      if ((sendErr as any).response) console.error("SMTP response:", (sendErr as any).response);
      return NextResponse.json({ message: "Failed to send reset email" }, { status: 500 });
    }

    console.info("sendMail result:", {
      messageId: sendInfo.messageId,
      accepted: sendInfo.accepted,
      rejected: sendInfo.rejected,
    });

    if (type === "ethereal" && typeof nodemailer.getTestMessageUrl === "function") {
      const preview = nodemailer.getTestMessageUrl(sendInfo);
      if (preview) console.info("Ethereal preview URL:", preview);
    }

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