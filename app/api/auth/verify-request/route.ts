// app/api/auth/verify-request/route.ts
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

async function sendVerifyEmail(transporter: nodemailer.Transporter, from: string, to: string, link: string) {
  const mailOptions = {
    from,
    to,
    subject: "Verify your email address",
    text: `Please verify your email by visiting:\n\n${link}\n\nIf you didn't request this, ignore this message.`,
    html: `<p>Click the link below to verify your email:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hours. If you didn't request this, ignore this email.</p>`,
  };
  return transporter.sendMail(mailOptions);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();
    const tokenCookie = req.cookies.get("token")?.value;

    if (!email && !tokenCookie) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    let user;
    if (tokenCookie) {
    }

    user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: "Email is not registered" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: "Account already verified" }, { status: 400 });
    }

    const verifyToken = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
        purpose: "email-verify",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
    const link = `${base}/verify-email?token=${encodeURIComponent(verifyToken)}`;

    const transporterInfo = await createTransporter();
    const { transporter, type } = transporterInfo as any;

    try {
      await transporter.verify();
    } catch (err) {
      console.error("SMTP verify failed:", err);
      return NextResponse.json({ message: "Failed to send verification email" }, { status: 500 });
    }

    const from = process.env.SENDER || (process.env.SMTP_USER ? `${process.env.SMTP_USER}` : `no-reply@example.com`);
    const info = await sendVerifyEmail(transporter, from, user.email, link);

    console.info("verify-mail sent:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      type,
    });

    if (type === "ethereal" && typeof nodemailer.getTestMessageUrl === "function") {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.info("Ethereal preview URL:", preview);
    }

    await user.save();

    return NextResponse.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("POST /api/auth/verify-request error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
