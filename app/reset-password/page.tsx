// app/reset-password/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenFromQuery = searchParams?.get("token") || "";

  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Invalid reset link. Token missing.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to reset password");
      } else {
        setMessage(data.message || "Password reset successful. Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      console.error("reset error", err);
      setError("An error occurred while resetting password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="home-landing min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full grid gap-10 md:grid-cols-2 items-center">
        <section className="d-none d-md-block">
          <div className="mb-3">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
              Reset password
            </span>
          </div>
          <h1 className="fw-bold fs-3 mb-2">Set a new password</h1>
          <p className="text-muted small mb-3">
            Choose a strong password and confirm it. After success you will be redirected to login.
          </p>

          <div className="landing-mini-card rounded-3 p-3 h-100 text-muted small">
            <div className="fw-semibold mb-1">Tips</div>
            <ul className="mb-0">
              <li>Use at least 8 characters for better security.</li>
              <li>Mix letters and numbers.</li>
              <li>Do not reuse passwords used elsewhere.</li>
            </ul>
          </div>
        </section>

        <section className="d-flex justify-content-center">
          <div className="card landing-card shadow-2xl border-0 w-100" style={{ maxWidth: 420 }}>
            <div className="card-body">
              <div className="d-flex flex-column align-items-center mb-3">
                <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs mb-2 font-medium uppercase tracking-[0.15em] shadow-sm">
                  Cloud Storage App
                </span>
                <h2 className="card-title mb-1 text-center fw-bold">Create a new password</h2>
                <p className="text-muted small mb-0 text-center">Enter your new password below.</p>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirm((prev) => !prev)}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <a className="btn btn-secondary" href="/login">Back to login</a>
                  <button type="submit" className="btn btn-primary ms-auto" disabled={loading}>
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}