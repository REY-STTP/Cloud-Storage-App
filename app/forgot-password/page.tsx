// app/forgot-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast["type"], message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", data.message || "Failed to request password reset");
      } else {
        showToast("success", data.message || "If the email exists, a reset link was sent");
        setEmail("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "An error occurred while sending reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="home-landing min-h-screen flex items-center justify-center px-4 py-10">
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          left: "16px",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
            maxWidth: "420px",
            marginLeft: "auto",
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`alert alert-${
                toast.type === "success"
                  ? "success"
                  : toast.type === "error"
                  ? "danger"
                  : toast.type === "warning"
                  ? "warning"
                  : "info"
              } alert-dismissible fade show shadow-lg`}
              role="alert"
              style={{
                animation: "slideInRight 0.3s ease-out",
                pointerEvents: "auto",
                width: "100%",
                margin: 0,
              }}
            >
              <div className="d-flex align-items-start">
                <div className="me-2" style={{ fontSize: "1.25rem", lineHeight: 1 }}>
                  {toast.type === "success" && "✅"}
                  {toast.type === "error" && "❌"}
                  {toast.type === "warning" && "⚠️"}
                  {toast.type === "info" && "ℹ️"}
                </div>

                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <strong className="d-block mb-1">
                    {toast.type === "success" && "Success"}
                    {toast.type === "error" && "Error"}
                    {toast.type === "warning" && "Warning"}
                    {toast.type === "info" && "Info"}
                  </strong>
                  <div style={{ fontSize: "0.9rem", wordBreak: "break-word" }}>
                    {toast.message}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close ms-2"
                  aria-label="Close"
                  onClick={() => removeToast(toast.id)}
                  style={{ flexShrink: 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 576px) {
          .alert {
            font-size: 0.875rem;
          }
        }
      `}</style>

      <div className="max-w-5xl w-full grid gap-10 md:grid-cols-2 items-center">
        <section className="d-none d-md-block">
          <div className="mb-3">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
              Reset your password
            </span>
          </div>
          <h1 className="fw-bold fs-3 mb-2">
            Forgot your password?
          </h1>
          <p className="text-muted small mb-3">
            Enter your account email and we will send a secure link so you can reset your password.
          </p>

          <div className="landing-mini-card rounded-3 p-3 h-100 text-muted small">
            <div className="fw-semibold mb-1">How it works</div>
            <ol className="mb-0">
              <li>We send a one-time secure link to your email.</li>
              <li>Link is valid for a limited time (typically 1 hour).</li>
              <li>Follow the link to set a new password.</li>
            </ol>
          </div>
        </section>

        <section className="d-flex justify-content-center">
          <div
            className="card landing-card shadow-2xl border-0 w-100"
            style={{ maxWidth: 420 }}
          >
            <div className="card-body">
              <div className="d-flex flex-column align-items-center mb-3">
                <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs mb-2 font-medium uppercase tracking-[0.15em] shadow-sm">
                  Cloud Storage App
                </span>
                <h2 className="card-title mb-1 text-center fw-bold">Forgot password</h2>
                <p className="text-muted small mb-0 text-center">Enter the email associated with your account.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="d-flex gap-2">
                  <Link href="/login" className="btn btn-secondary">Back to login</Link>
                  <button type="submit" className="btn btn-primary ms-auto" disabled={loading}>
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </div>
              </form>

              <p className="mt-3 text-center text-muted small">
                Don&apos;t have an account yet? <Link href="/register">Register</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}