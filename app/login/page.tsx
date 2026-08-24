// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.message || "Login failed";
        setError(msg);
        showToast("error", msg);
      } else {
        showToast("success", "Login successful. Redirecting...");
        setTimeout(() => {
          if (data.role === "ADMIN") router.push("/admin");
          else router.push("/dashboard");
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
            Sign in and manage your cloud files
          </h1>
          <p className="mb-6 max-w-[44ch] leading-relaxed text-muted-foreground">
            Use your account to upload, rename, download, and delete files
            from your personal dashboard. Admins can also manage users and
            clean up data.
          </p>

          <div className="shadow-card flex gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">Secure login</div>
              <div className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                JWT-based authentication with protected routes for user and
                admin dashboards.
              </div>
            </div>
          </div>
        </>
      }
      card={
        <>
          <div className="mb-5">
            <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <KeyRoundIcon className="size-5" />
            </span>
            <h2 className="mb-1 font-heading text-2xl font-semibold tracking-tight">
              Login
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="login-password"
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
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-4 w-full">
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>

          <p className="mt-3 text-center text-sm text-muted-foreground">
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
