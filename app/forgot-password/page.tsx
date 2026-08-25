// app/forgot-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, InfoIcon } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import BrandMark from "@/components/BrandMark";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", data.message || "Failed to request password reset");
      } else {
        showToast("success", data.message || "If the email exists, a reset link was sent");
        setEmail("");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "An error occurred while sending reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      left={
        <>
          <h1 className="mb-3 max-w-[22ch] font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Forgot your password?
          </h1>
          <p className="mb-6 max-w-[44ch] leading-relaxed text-muted-foreground">
            Enter your account email and we will send a secure link so you can
            reset your password.
          </p>

          <div className="shadow-card rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <InfoIcon className="size-4 text-primary" />
              How it works
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
              <li>We send a one-time secure link to your email.</li>
              <li>The link is valid for a limited time (typically 1 hour).</li>
              <li>Follow the link to set a new password.</li>
            </ol>
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
              Forgot password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the email associated with your account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back to login
              </Button>
              <Button type="submit" disabled={loading} className="ms-auto">
                {loading && <Spinner data-icon="inline-start" />}
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </>
      }
    />
  );
}
