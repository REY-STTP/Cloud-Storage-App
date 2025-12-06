// app/verify-email/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params?.get("token") || "";

  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [msg, setMsg] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast["type"], message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (!token) {
      showToast("error", "Invalid verification link.");
      setStatus("error");
      setMsg("Invalid verification link.");
      return;
    }

    async function doVerify() {
      setStatus("loading");

      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          showToast("success", data.message || "Email verified!");
          setStatus("success");
          setMsg(data.message || "Email verified.");

          setTimeout(() => {
            window.location.href = "/dashboard/profile?verified=1";
          }, 1500);

          return;
        } else {
          showToast("error", data.message || `Verification failed (${res.status})`);
          setStatus("error");
          setMsg(data.message || `Verification failed (${res.status})`);
        }
      } catch (e) {
        console.error("verify error", e);
        showToast("error", "Verification failed.");
        setStatus("error");
        setMsg("Verification failed.");
      }
    }

    doVerify();
  }, [token]);

  return (
    <main className="container py-6">
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
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div className="card p-4">
        <h2>Verify email</h2>

        {status === "loading" && <p>Verifying...</p>}
        {status === "success" && <div className="alert alert-success">{msg}</div>}
        {status === "error" && <div className="alert alert-danger">{msg}</div>}
      </div>
    </main>
  );
}
