// app/dashboard/profile/page.tsx
"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  LogOutIcon,
  MailIcon,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import AppNavbar from "@/components/AppNavbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  createdAt: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
      <Card className="md:col-span-1">
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[55%]" />
          <Skeleton className="h-3 w-[80%]" />
          <Skeleton className="h-3 w-[70%]" />
          <Skeleton className="h-3 w-[45%]" />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[30%]" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfilePageContent() {
  const params = useSearchParams();

  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

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
  const [requestLoading, setRequestLoading] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast("error", data?.message || "Failed to load profile");
      } else {
        const data: Profile = await res.json();
        setProfile(data);
        setName(data.name || "");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Server error while loading profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = params?.get("verified");
    if (v === "1") {
      showToast("success", "Email verified successfully.");
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleDeleteAccount() {
    const ok = await confirm({
      title: "Delete your account?",
      description:
        "This will permanently delete your account and all files. This action cannot be undone. Are you sure?",
      confirmLabel: "Delete account",
      cancelLabel: "Cancel",
      danger: true,
    })

    if (!ok) return;

    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast("error", data?.message || "Failed to delete account");
      } else {
        showToast("success", "Your account has been deleted");
        setTimeout(() => {
          window.location.href = "/register";
        }, 1200);
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Server error when deleting account");
    }
  }

  async function requestVerificationEmail() {
    if (!profile) return;
    const ok = await confirm({
      title: "Send verification email?",
      description: `Send a verification email to ${profile.email}? Check your inbox (and spam) after sending.`,
      confirmLabel: "Send email",
      cancelLabel: "Cancel",
      danger: false,
    })

    if (!ok) return;

    setRequestLoading(true);
    try {
      const res = await fetch("/api/auth/verify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        showToast("success", data?.message || "Verification email sent. Check your inbox");
      } else {
        showToast("error", data?.message || "Failed to send verification email");
      }
    } catch (e) {
      console.error("requestVerificationEmail error", e);
      showToast("error", "Server error when sending verification email");
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword || confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        showToast("error", "New password and confirmation do not match");
        return;
      }
      if (!currentPassword) {
        showToast("warning", "Current password is required to change password");
        return;
      }
      if (newPassword.length < 6) {
        showToast("warning", "New password must be at least 6 characters");
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
        showToast("error", data?.message || "Failed to update profile");
      } else {
        showToast("success", "Profile updated successfully");
        if (data?.name) {
          setProfile((prev) => (prev ? { ...prev, name: data.name } : prev));
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Server error while updating profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-dvh">
      <AppNavbar title="Profile">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOutIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </AppNavbar>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Profile &amp; security
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your personal information and manage your password.
          </p>
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : !profile ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Profile not found</AlertTitle>
            <AlertDescription>Please sign in again to view your profile.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Account overview */}
            <Card className="h-full md:col-span-1">
              <CardContent>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-bold tracking-tight">{profile.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {profile.email.toLowerCase()}
                    </div>
                  </div>
                </div>

                <div className="mb-3 space-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-semibold">
                      {profile.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {profile.verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    )}
                  </div>
                  <div className="tnum flex justify-between">
                    <span className="text-muted-foreground">Joined</span>
                    <span className="font-semibold">
                      {new Date(profile.createdAt).toLocaleDateString("en-US")}
                    </span>
                  </div>
                </div>

                {!profile.verified && (
                  <Button
                    type="button"
                    size="sm"
                    className="mb-3 w-full"
                    onClick={requestVerificationEmail}
                    disabled={requestLoading}
                  >
                    {requestLoading ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MailIcon data-icon="inline-start" />
                        Request verification
                      </>
                    )}
                  </Button>
                )}

                <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                  · Your email is used for login and cannot be changed here.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  · Use a strong password and keep it private.
                </p>

                <Separator className="my-4" />

                <p className="mb-2 text-xs text-muted-foreground">
                  Need to leave this service?
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteAccount}
                  disabled={saving}
                >
                  Delete account
                </Button>
              </CardContent>
            </Card>

            {/* Edit profile */}
            <Card className="h-full md:col-span-2">
              <CardHeader>
                <CardTitle>Edit profile</CardTitle>
                <CardDescription>Update your name, or change your password.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="flex max-w-[420px] flex-col gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <Separator className="my-1" />

                    <p className="text-xs text-muted-foreground">
                      If you want to change your password, fill in these fields. Otherwise, you can leave them empty.
                    </p>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-current">Current password</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profile-current"
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCurrent((p) => !p)}
                        >
                          {showCurrent ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <Link href="/forgot-password" className="text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </p>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-new">New password</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profile-new"
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (optional)"
                        />
                        <Button type="button" variant="outline" onClick={() => setShowNew((p) => !p)}>
                          {showNew ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-confirm">Confirm new password</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profile-confirm"
                          type={showConfirm ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repeat new password"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowConfirm((p) => !p)}
                        >
                          {showConfirm ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="mt-4">
                    {saving && <Spinner data-icon="inline-start" />}
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
