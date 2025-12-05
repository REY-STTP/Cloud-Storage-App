// app/verify-email/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
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
          setStatus("success");
          setMsg(data.message || "Email verified. You can now use the app.");
          window.location.href = "/dashboard/profile?verified=1";
          return;
        } else {
          setStatus("error");
          setMsg(data.message || `Verification failed (${res.status})`);
        }
      } catch (e) {
        console.error("verify error", e);
        setStatus("error");
        setMsg("Verification failed");
      }
    }

    doVerify();
  }, [token]);

  return (
    <main className="container py-6">
      <div className="card p-4">
        <h2>Verify email</h2>
        {status === "loading" && <p>Verifying...</p>}
        {status === "success" && <div className="alert alert-success">{msg}</div>}
        {status === "error" && <div className="alert alert-danger">{msg}</div>}
      </div>
    </main>
  );
}
