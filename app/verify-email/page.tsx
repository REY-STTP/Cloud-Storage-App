// app/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

function VerifyEmailPageContent() {
  const params = useSearchParams();
  const { showToast } = useToast();
  const token = params?.get("token") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

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
  }, [token, showToast]);

  return (
    <main className="home-landing min-h-screen d-flex align-items-center justify-content-center px-4 py-5">
      <div className="card shadow-lg" style={{ width: "400px", padding: "3rem 2rem", borderRadius: "12px" }} >
        <div className="text-center">
          <h2 className="mb-4">Verify Email</h2>

          {status === "loading" && (
            <div>
              <div
                className="spinner-border text-primary mb-3"
                role="status"
                style={{ width: "3rem", height: "3rem" }}
              >
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
    <Suspense
      fallback={
        <div className=" home-landing min-h-screen d-flex align-items-center justify-content-center px-4 py-5">
          <div className="card shadow-lg" style={{ width: "400px", padding: "3rem 2rem", borderRadius: "12px" }} >
            <div className="text-center">
              <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }} >
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}
