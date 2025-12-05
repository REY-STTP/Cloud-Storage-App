"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("rey.zakaria123@gmail.com");
  const [password, setPassword] = useState("Kamtis32");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed");
      } else {
        const data = await res.json();
        if (data.role === "ADMIN") router.push("/admin");
        else router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred");
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
              Welcome back 👋
            </span>
          </div>
          <h1 className="fw-bold fs-3 mb-2">
            Sign in and manage your cloud files
          </h1>
          <p className="text-muted small mb-3">
            Use your account to upload, rename, download, and delete files
            from your personal dashboard. Admins can also manage users and
            clean up data.
          </p>

          <div className="row g-2 text-muted small">
            <div className="col-12">
              <div className="landing-mini-card rounded-3 p-3 h-100">
                <div className="fw-semibold mb-1">🔐 Secure login</div>
                <div>
                  JWT-based authentication with protected routes for User
                  and Admin dashboards.
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
                  Cloud Storage App
                </span>
                <h2 className="card-title mb-1 text-center fw-bold">
                  Login
                </h2>
                <p className="text-muted small mb-0 text-center">
                  Enter your email and password to continue.
                </p>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
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

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-1"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Login"}
                </button>
              </form>

              <p className="mt-3 text-center text-muted small">
                <a href="/forgot-password">Forgot Password?</a>
              </p>

              <p className="mt-3 text-center text-muted small">
                Don&apos;t have an account yet?{" "}
                <a href="/register">Register</a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
