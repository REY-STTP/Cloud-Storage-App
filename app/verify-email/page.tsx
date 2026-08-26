// app/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useToast } from "@/components/ToastProvider";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Spinner } from "@/components/ui/spinner";

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
          showToast("success", data.message || "Email verified.");
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
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] rounded-2xl border bg-card p-8 text-center text-card-foreground shadow-xl sm:p-12">
          <span className="mx-auto mb-4 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrandMark className="size-7" />
          </span>

          <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">
            Verify email
          </h2>

          {status === "loading" && (
            <div>
              <div className="mb-3 flex justify-center">
                <Spinner className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {(status === "success" || status === "error") && (
            <div>
              <div
                className={`mx-auto mb-3 flex size-11 items-center justify-center rounded-full ${
                  status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {status === "success" ? (
                  <CircleCheckIcon className="size-6" />
                ) : (
                  <CircleAlertIcon className="size-6" />
                )}
              </div>
              <p
                className={`rounded-lg border px-3 py-2 text-sm ${
                  status === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {msg}
              </p>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center px-4 py-5">
          <div className="w-full max-w-[400px] rounded-2xl border bg-card p-8 text-center shadow-xl sm:p-12">
            <Spinner className="size-6" />
          </div>
        </div>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}
