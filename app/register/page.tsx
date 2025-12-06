// app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast["type"], message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      const msg = "Password and password confirmation are not the same.";
      setError(msg);
      showToast("warning", msg);
      return;
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setError(msg);
      showToast("warning", msg);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.message || "Register failed";
        setError(msg);
        showToast("error", msg);
      } else {
        const successMsg = data.message || "Registration successful. Redirecting to login...";
        showToast("success", successMsg);
        setTimeout(() => {
          router.push("/login");
        }, 900);
      }
    } catch (e) {
      console.error(e);
      const msg = "An error occurred";
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="home-landing min-h-screen flex items-center justify-center px-4 py-10">
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          maxWidth: "400px",
          width: "100%",
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
            } alert-dismissible fade show mb-2 shadow-lg`}
            role="alert"
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            <div className="d-flex align-items-start">
              <div className="me-2" style={{ fontSize: "1.2rem" }}>
                {toast.type === "success" && "✅"}
                {toast.type === "error" && "❌"}
                {toast.type === "warning" && "⚠️"}
                {toast.type === "info" && "ℹ️"}
              </div>

              <div className="flex-grow-1">
                <strong className="d-block mb-1">
                  {toast.type === "success" && "Success"}
                  {toast.type === "error" && "Error"}
                  {toast.type === "warning" && "Warning"}
                  {toast.type === "info" && "Info"}
                </strong>
                <div style={{ fontSize: "0.9rem" }}>{toast.message}</div>
              </div>

              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => removeToast(toast.id)}
              />
            </div>
          </div>
        ))}
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
      `}</style>

      <div className="max-w-5xl w-full grid gap-10 md:grid-cols-2 items-center">
        <section className="d-none d-md-block">
          <div className="mb-3">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
              Get started 🚀
            </span>
          </div>
          <h1 className="fw-bold fs-3 mb-2">Create your cloud storage account</h1>
          <p className="text-muted small mb-3">
            Register as a user to upload and manage your files in a simple
            dashboard. You can rename, download, and delete files anytime.
          </p>

          <div className="row g-2 text-muted small">
            <div className="col-12">
              <div className="landing-mini-card rounded-3 p-3 h-100">
                <div className="fw-semibold mb-1">🗂️ User dashboard</div>
                <div>
                  Drag-free interface to upload multiple files, rename them,
                  and download them back when needed.
                </div>
              </div>
            </div>
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
                  Join the workspace
                </span>
                <h2 className="card-title mb-1 text-center fw-bold">Register</h2>
                <p className="text-muted small mb-0 text-center">
                  Fill in your details to create a new account.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
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

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-1"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Register"}
                </button>
              </form>

              <p className="mt-3 text-center text-muted small">
                Already have an account? <a href="/login">Login</a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
