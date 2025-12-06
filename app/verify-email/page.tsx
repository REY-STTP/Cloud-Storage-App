// app/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

function VerifyEmailPageContent() {
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
    }, 3000);
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
    <main style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "1rem",
      backgroundColor: "#f8f9fa"
    }}>
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

      <div 
        className="card shadow-lg" 
        style={{ 
          width: "400px",
          padding: "3rem 2rem",
          borderRadius: "12px"
        }}
      >
        <div className="text-center">
          <h2 className="mb-4">Verify Email</h2>

          {status === "loading" && (
            <div>
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Verifying your email...</p>
            </div>
          )}
          
          {status === "success" && (
            <div>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
              <div className="alert alert-success mb-0">{msg}</div>
            </div>
          )}
          
          {status === "error" && (
            <div>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
              <div className="alert alert-danger mb-0">{msg}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#f8f9fa"
      }}>
        <div className="card shadow-lg" style={{ width: "400px", padding: "3rem 2rem", borderRadius: "12px" }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailPageContent />
    </Suspense>
  );
}