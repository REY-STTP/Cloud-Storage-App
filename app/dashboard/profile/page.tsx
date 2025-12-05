// app/dashboard/profile/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [requestLoading, setRequestLoading] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    variant: "success" | "error" | "info";
  }>({ show: false, msg: "", variant: "info" });

  function showToastMessage(msg: string, variant: "success" | "error" | "info" = "info", timeout = 3500) {
    setToast({ show: true, msg, variant });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), timeout);
  }

  async function loadProfile() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setLoadError(data?.message || "Failed to load profile");
      } else {
        const data: Profile = await res.json();
        setProfile(data);
        setName(data.name || "");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Server error");
    } finally {
      setLoading(false);
    }
  }

  const params = useSearchParams();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const v = params?.get("verified");
    if (v === "1") {
      loadProfile();
    }
  }, [params]);

  async function handleDeleteAccount() {
    setSubmitError(null);
    setSuccess(null);

    const ok = confirm(
      "Are you sure you want to delete your account? All your files will be permanently deleted."
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError(data?.message || "Failed to delete account");
      } else {
        alert("Your account has been deleted.");
        window.location.href = "/register";
      }
    } catch (e) {
      console.error(e);
      setSubmitError("Server error when deleting account.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (newPassword || confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        setSubmitError("New password and confirmation do not match.");
        return;
      }
      if (!currentPassword) {
        setSubmitError("Current password is required to change password.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError(data?.message || "Failed to update profile");
      } else {
        setSuccess("Profile has been updated successfully.");
        if (data?.name) {
          setProfile((prev) => (prev ? { ...prev, name: data.name } : prev));
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (e) {
      console.error(e);
      setSubmitError("Server error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function requestVerificationEmail() {
    if (!profile) return;
    if (!confirm("Send verification email to your address?")) return;

    setRequestLoading(true);
    try {
      const res = await fetch("/api/auth/verify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        showToastMessage(data?.message || "Verification email sent. Check your inbox.", "success");
      } else {
        showToastMessage(data?.message || "Failed to send verification email.", "error");
      }
    } catch (e) {
      console.error("requestVerificationEmail error", e);
      showToastMessage("Server error when sending verification email.", "error");
    } finally {
      setRequestLoading(false);
    }
  }

  return (
    <main className="home-landing app-shell">
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 1060 }}
      >
        <div
          style={{
            display: toast.show ? "flex" : "none",
            minWidth: 280,
            maxWidth: 420,
            background:
              toast.variant === "success" ? "#e9f7ef" : toast.variant === "error" ? "#fff0f0" : "#eef4ff",
            borderLeft:
              toast.variant === "success" ? "4px solid #28a745" : toast.variant === "error" ? "4px solid #dc3545" : "4px solid #0d6efd",
            color: "#0f1724",
            padding: "12px 12px",
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(2,6,23,0.4)",
            alignItems: "center",
            gap: 12,
            animation: toast.show ? "toastIn .18s ease-out" : "toastOut .12s ease-in",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {toast.variant === "success" ? "Success" : toast.variant === "error" ? "Error" : "Info"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.25 }}>{toast.msg}</div>
          </div>

          <button
            className="btn btn-sm btn-light"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
            aria-label="close toast"
            style={{ height: 34 }}
          >
            ×
          </button>
        </div>
      </div>

      <style>{`
        @keyframes toastIn { from { transform: translateY(-6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes toastOut { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-6px); opacity: 0 } }
      `}</style>

      <nav className="navbar navbar-expand-lg px-4 navbar-dark bg-dark">
        <span className="navbar-brand">User Profile</span>
        <div className="ms-auto d-flex gap-2">
          <a href="/dashboard" className="btn btn-outline-light btn-sm">
            Back to Dashboard
          </a>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container app-shell-main">
        <div className="app-section-header">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
              <span>👤</span> Account settings
            </span>
          </div>
          <h1 className="app-section-title mb-1">Profile & security</h1>
          <p className="app-section-subtitle mb-0">Update your personal information and manage your password.</p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : loadError ? (
          <div className="alert alert-danger">{loadError}</div>
        ) : !profile ? (
          <div className="alert alert-danger">Profile not found.</div>
        ) : (
          <div className="row g-4">
            <div className="col-md-4">
              <div className="landing-card shadow-lg border-0 p-4 h-100">
                <h5 className="mb-3 fw-bold">Account overview</h5>

                <div className="landing-mini-card rounded-3 p-3 mb-3">
                  <p className="text-muted small mb-1">
                    Email : <strong>{profile.email.toLowerCase()}</strong>
                  </p>
                  <p className="text-muted small mb-1">
                    Role : <strong>{profile.role}</strong>
                  </p>
                  <p className="text-muted small mb-0">
                    Joined: {new Date(profile.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="mb-3">
                  <h6 className="mb-2 fw-semibold">Verification</h6>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    {profile.verified ? (
                      <span className="badge bg-success px-3 py-2" style={{ fontSize: "0.9rem" }}>
                        ✔ VERIFIED
                      </span>
                    ) : (
                      <span className="badge bg-warning text-dark px-3 py-2" style={{ fontSize: "0.9rem" }}>
                        ⚠ NOT VERIFIED
                      </span>
                    )}

                    {!profile.verified && (
                      <div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={requestVerificationEmail}
                          disabled={requestLoading}
                        >
                          {requestLoading ? "Sending..." : "Request Verification Email"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-muted small mb-2">• Your email is used for login and cannot be changed here.</p>
                <p className="text-muted small mb-2">• Use a strong password and keep it private.</p>

                <hr />

                <p className="text-muted small mb-2 mt-2">Need to leave this service?</p>
                <button
                  type="button"
                  className="btn btn-outline-danger w-100"
                  onClick={handleDeleteAccount}
                  disabled={saving}
                >
                  Delete Account
                </button>
              </div>
            </div>

            <div className="col-md-8">
              <div className="landing-card shadow-lg border-0 p-4">
                {submitError && <div className="alert alert-danger">{submitError}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <h5 className="mb-3 fw-bold">Edit profile</h5>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <hr className="my-3" />

                  <p className="small text-muted mb-2">
                    If you want to change your password, fill in these fields. Otherwise, you can leave them empty.
                  </p>

                  <div className="mb-3">
                    <label className="form-label">Current password</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCurrent((p) => !p)}>
                        {showCurrent ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-right text-muted small">
                    <a href="/forgot-password">Forgot Password?</a>
                  </p>

                  <div className="mb-3">
                    <label className="form-label">New password</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (optional)"
                      />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNew((p) => !p)}>
                        {showNew ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Confirm new password</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        type={showConfirm ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                      />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowConfirm((p) => !p)}>
                        {showConfirm ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
