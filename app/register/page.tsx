// app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CloudIcon, FolderIcon } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <AuthShell
      left={
        <>
          <h1 className="mb-3 max-w-[22ch] font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Create your cloud storage account
          </h1>
          <p className="mb-6 max-w-[44ch] leading-relaxed text-muted-foreground">
            Register as a user to upload and manage your files in a simple
            dashboard. You can rename, download, and delete files anytime.
          </p>

          <div className="shadow-card flex gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderIcon className="size-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">User dashboard</div>
              <div className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Upload multiple files, rename them, and download them back
                whenever you need.
              </div>
            </div>
          </div>
        </>
      }
      card={
        <>
          <div className="mb-5">
            <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <CloudIcon className="size-5" />
            </span>
            <h2 className="mb-1 font-heading text-2xl font-semibold tracking-tight">
              Register
            </h2>
            <p className="text-sm text-muted-foreground">
              Fill in your details to create a new account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="register-name">Name</Label>
                <Input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="register-password"
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
                <Label htmlFor="register-confirm">Confirm password</Label>
                <div className="flex gap-2">
                  <Input
                    id="register-confirm"
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

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-4 w-full">
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </>
      }
    />
  );
}
