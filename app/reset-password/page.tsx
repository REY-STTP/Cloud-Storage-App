// app/reset-password/page.tsx
"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, ShieldIcon } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import BrandMark from "@/components/BrandMark";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

function ResetPasswordPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams?.get("token") || "";
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      showToast("error", "Invalid reset link. Token missing");
      return;
    }

    if (password.length < 6) {
      showToast("warning", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match");
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
        showToast("error", data.message || "Failed to reset password");
      } else {
        showToast("success", "Password reset successful. Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      console.error("reset error", err);
      showToast("error", "An error occurred while resetting password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      left={
        <>
          <h1 className="mb-3 max-w-[22ch] font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Set a new password
          </h1>
          <p className="mb-6 max-w-[44ch] leading-relaxed text-muted-foreground">
            Choose a strong password and confirm it. After success you will be
            redirected to login.
          </p>

          <div className="shadow-card rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldIcon className="size-4 text-primary" />
              Tips for a strong password
            </div>
            <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
              <li>Use at least 8 characters for better security.</li>
              <li>Mix letters and numbers.</li>
              <li>Do not reuse passwords used elsewhere.</li>
            </ul>
          </div>
        </>
      }
      card={
        <>
          <div className="mb-5">
            <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <BrandMark className="size-5" />
            </span>
            <h2 className="mb-1 font-heading text-2xl font-semibold tracking-tight">
              Create a new password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-password">New password</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reset-confirm">Confirm password</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfirm((prev) => !prev)}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back to login
              </Button>
              <Button type="submit" disabled={loading} className="ms-auto">
                {loading && <Spinner data-icon="inline-start" />}
                {loading ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </form>
        </>
      }
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
