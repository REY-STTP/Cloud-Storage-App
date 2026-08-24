// lib/mail.ts
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export type TransporterInfo = {
  transporter: nodemailer.Transporter;
  type: "smtp" | "ethereal";
  testAccount?: nodemailer.TestAccount;
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
      // Google menampilkan App Password sebagai 4 grup berspasi ("abcd efgh
      // ijkl mnop"); spasi harus dibuang sebelum dikirim ke SMTP.
      auth: { user, pass: pass.replace(/\s+/g, "") },
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
  return jwt.verify(token, JWT_SECRET) as {
    email: string;
    userId: string;
    purpose: string;
  };
}

/** Alamat pengirim dengan nama tampilan, mis. "Cloud Storage <you@gmail.com>". */
export function getSenderEmail(): string {
  const address =
    process.env.SENDER ||
    process.env.SMTP_USER ||
    "no-reply@example.com";
  return `"Cloud Storage" <${address.replace(/^"?.*"? <|>/g, "")}>`;
}

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000"
  );
}

/* ============================================================
   Email HTML template
   Table-based + inline styles agar tampil konsisten di Gmail,
   Outlook, dan klien email lama.
   ============================================================ */

interface EmailContent {
  /** Judul besar di dalam kartu. */
  title: string;
  /** Paragraf pembuka. */
  intro: string;
  /** Teks tombol aksi utama. */
  ctaLabel: string;
  /** URL tujuan tombol. */
  ctaUrl: string;
  /** Teks bantuan tambahan di bawah tombol (mis. masa berlaku token). */
  note?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml({ title, intro, ctaLabel, ctaUrl, note }: EmailContent): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <!-- Preheader: teks preview di daftar inbox -->
    <span style="display:none;font-size:1px;color:#f4f5f7;">${escapeHtml(intro)}</span>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

            <!-- Logo / brand -->
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color:#111827;border-radius:10px;padding:9px 14px;">
                      <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                        &#9729; Cloud Storage
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Kartu utama -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
                  <!-- Aksen atas -->
                  <tr>
                    <td style="height:6px;background-color:#111827;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:36px 40px 40px 40px;">

                      <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">
                        ${escapeHtml(title)}
                      </h1>

                      <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#4b5563;">
                        ${escapeHtml(intro)}
                      </p>

                      <!-- Tombol CTA -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding-bottom:24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="border-radius:10px;background-color:#111827;">
                                  <a href="${safeUrl}"
                                     style="display:inline-block;padding:13px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                                    ${escapeHtml(ctaLabel)}
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Link cadangan jika tombol tidak berfungsi -->
                      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6b7280;">
                        If the button doesn&apos;t work, copy and paste this link into your browser:
                      </p>
                      <p style="margin:0 0 24px 0;font-size:13px;line-height:1.5;word-break:break-all;">
                        <a href="${safeUrl}" style="color:#2563eb;text-decoration:underline;">${safeUrl}</a>
                      </p>

                      ${note ? `
                      <!-- Catatan penting -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;">
                            <p style="margin:0;font-size:13px;line-height:1.55;color:#854d0e;">
                              &#9888;&#65039; ${escapeHtml(note)}
                            </p>
                          </td>
                        </tr>
                      </table>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:24px;">
                <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  You received this email because a request was made for your account.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  If you didn&apos;t request it, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmailText({ title, ctaUrl }: EmailContent): string {
  return `${title}\n\nOpen the link below to continue:\n${ctaUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
}

export async function sendPasswordResetEmail(
  transporter: nodemailer.Transporter,
  to: string,
  resetToken: string
): Promise<nodemailer.SentMessageInfo> {
  const content: EmailContent = {
    title: "Reset your password",
    intro:
      "We received a request to reset the password for your account. Click the button below to choose a new password.",
    ctaLabel: "Reset password",
    ctaUrl: `${getBaseUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`,
    note: "This link expires in 1 hour and can only be used once.",
  };

  return transporter.sendMail({
    from: getSenderEmail(),
    to,
    subject: "Reset your password · Cloud Storage",
    text: buildEmailText(content),
    html: buildEmailHtml(content),
  });
}

export async function sendVerificationEmail(
  transporter: nodemailer.Transporter,
  to: string,
  verifyToken: string
): Promise<nodemailer.SentMessageInfo> {
  const content: EmailContent = {
    title: "Verify your email address",
    intro:
      "Welcome aboard! Confirm your email address so you can start uploading files to your personal cloud storage.",
    ctaLabel: "Verify email",
    ctaUrl: `${getBaseUrl()}/verify-email?token=${encodeURIComponent(verifyToken)}`,
    note: "This link expires in 1 hour.",
  };

  return transporter.sendMail({
    from: getSenderEmail(),
    to,
    subject: "Verify your email · Cloud Storage",
    text: buildEmailText(content),
    html: buildEmailHtml(content),
  });
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
