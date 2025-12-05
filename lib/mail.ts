// lib/mail.ts
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export type TransporterInfo = {
  transporter: nodemailer.Transporter;
  type: "smtp" | "ethereal";
  testAccount?: any;
};

export async function createTransporter(): Promise<TransporterInfo> {
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
    return { transporter, type: "smtp" };
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return { transporter, type: "ethereal", testAccount };
}

export function generateToken(
  email: string,
  userId: string,
  purpose: "email-verify" | "password-reset",
  expiresIn: string | number = "1h"
): string {
  return jwt.sign(
    {
      email,
      userId,
      purpose,
    },
    JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyToken(token: string): {
  email: string;
  userId: string;
  purpose: string;
} {
  return jwt.verify(token, JWT_SECRET) as any;
}

export function getSenderEmail(): string {
  return (
    process.env.SENDER ||
    (process.env.SMTP_USER ? `${process.env.SMTP_USER}` : `no-reply@example.com`)
  );
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
}

export async function sendPasswordResetEmail(
  transporter: nodemailer.Transporter,
  to: string,
  resetToken: string
): Promise<nodemailer.SentMessageInfo> {
  const from = getSenderEmail();
  const link = `${getBaseUrl()}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from,
    to,
    subject: "Password reset request",
    text: `You requested a password reset. Use the link below to reset your password:\n\n${link}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to reset your password:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendVerificationEmail(
  transporter: nodemailer.Transporter,
  to: string,
  verifyToken: string
): Promise<nodemailer.SentMessageInfo> {
  const from = getSenderEmail();
  const link = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(verifyToken)}`;

  const mailOptions = {
    from,
    to,
    subject: "Verify your email address",
    text: `Please verify your email by visiting:\n\n${link}\n\nIf you didn't request this, ignore this message.`,
    html: `<p>Click the link below to verify your email:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  };

  return transporter.sendMail(mailOptions);
}

export async function verifyTransporter(transporter: nodemailer.Transporter): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    console.error("Transporter verification failed:", err);
    return false;
  }
}

export function logEmailResult(
  info: nodemailer.SentMessageInfo,
  type: "smtp" | "ethereal",
  action: string = "email"
): string | null {
  console.info(`${action} sent:`, {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    type,
  });

  if (type === "ethereal" && typeof nodemailer.getTestMessageUrl === "function") {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.info("Ethereal preview URL:", preview);
      return preview;
    }
  }

  return null;
}