// app/admin/page.tsx
// Admin overview: real stats and charts drawn from the user base.
"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BanIcon,
  CircleCheckIcon,
  HardDriveIcon,
  RefreshCwIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { swrFetcher } from "@/components/SwrProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  banned: boolean;
  createdAt: string;
  fileCount?: number | null;
  totalSizeBytes?: number | null;
}

interface AdminUsersResponse {
  users: UserItem[];
  total: number;
  admins: number;
  banned: number;
}

function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function relativeJoin(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "joined today";
  if (days === 1) return "joined yesterday";
  if (days < 30) return `joined ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `joined ${months}mo ago`;
  return `joined ${Math.floor(months / 12)}y ago`;
}

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short" });

const storageConfig = {
  size: { label: "Storage used", color: "var(--chart-2)" },
} satisfies ChartConfig;

const signupsConfig = {
  users: { label: "New users", color: "var(--chart-1)" },
} satisfies ChartConfig;

function StatSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-2.5 w-[55%]" />
              <Skeleton className="h-7 w-[40%]" />
              <Skeleton className="h-2.5 w-[70%]" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  // One call, wide limit: the overview needs the whole user base to compute honestly.
  // Freshness stamp comes from SWR's own success callback — no effect needed.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const { data, isLoading, error, mutate, isValidating } = useSWR<AdminUsersResponse>(
    "/api/admin/users?limit=500",
    swrFetcher,
    { onSuccess: () => setUpdatedAt(new Date()) }
  );

  const users: UserItem[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const admins = data?.admins ?? 0;
  const banned = data?.banned ?? 0;
  const verified = users.filter((u) => u.verified && !u.banned).length;
  const unverified = users.filter((u) => !u.verified && !u.banned).length;
  const totalBytes = users.reduce((sum, u) => sum + (u.totalSizeBytes ?? 0), 0);
  const totalFiles = users.reduce((sum, u) => sum + (u.fileCount ?? 0), 0);
  const verifiedShare = total > 0 ? Math.round((verified / total) * 100) : 0;
  const avgBytes = total > 0 ? totalBytes / total : 0;

  // Storage per user, top consumers first.
  const storageData = users
    .filter((u) => (u.totalSizeBytes ?? 0) > 0)
    .sort((a, b) => (b.totalSizeBytes ?? 0) - (a.totalSizeBytes ?? 0))
    .slice(0, 6)
    .map((u) => ({
      name: u.name,
      size: Math.round(((u.totalSizeBytes ?? 0) / (1024 * 1024)) * 10) / 10, // MB
      formatted: formatSize(u.totalSizeBytes ?? 0),
    }));

  // Signups per month, last six months.
  const now = new Date();
  const months: { month: string; users: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: monthLabel.format(d), users: 0 });
  }
  for (const u of users) {
    const d = new Date(u.createdAt);
    const diff =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diff >= 0 && diff < 6) months[5 - diff].users += 1;
  }

  const latestSignups = users
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: "Total users",
      value: String(total),
      hint: `${verifiedShare}% verified`,
      icon: UsersIcon,
      tint: "bg-primary/10 text-primary",
    },
    {
      label: "Verified",
      value: String(verified),
      hint: `${unverified} awaiting verification`,
      icon: CircleCheckIcon,
      tint: "bg-success/10 text-success",
    },
    {
      label: "Banned",
      value: String(banned),
      hint: banned > 0 ? "Cannot sign in" : "No banned accounts",
      icon: BanIcon,
      tint: "bg-destructive/10 text-destructive",
    },
    {
      label: "Admins",
      value: String(admins),
      hint: "with full account access",
      icon: ShieldIcon,
      tint: "bg-accent text-accent-foreground",
    },
    {
      label: "Storage used",
      value: formatSize(totalBytes),
      hint: `avg ${formatSize(avgBytes)} per account`,
      icon: HardDriveIcon,
      tint: "bg-chart-2/15 text-chart-2",
    },
  ];

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The state of your storage service, computed from live account data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {updatedAt && (
              <span className="tnum hidden text-xs text-muted-foreground sm:block">
                Updated{" "}
                {updatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => mutate()}
              disabled={isValidating}
              aria-label="Refresh data"
            >
              <RefreshCwIcon className={isValidating ? "animate-spin" : ""} />
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/users" />}>
              Manage users
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <>
            <StatSkeleton />
            {/* Charts skeleton keeps the layout shape stable while loading. */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-hidden="true">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[45%]" />
                    <Skeleton className="h-3 w-[60%]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-56 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertCircleIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Could not load admin data</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check your connection, then try again.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => mutate()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Stat strip */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="tnum mt-1 font-heading text-2xl font-semibold tracking-tight">
                        {stat.value}
                      </p>
                      <p className="tnum mt-1 truncate text-xs text-muted-foreground">
                        {stat.hint}
                      </p>
                    </div>
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.tint}`}
                    >
                      <stat.icon className="size-5" />
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>New users by month</CardTitle>
                  <CardDescription>Registrations over the last six months.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={signupsConfig} className="h-56 w-full">
                    <BarChart data={months}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="users"
                        fill="var(--color-users)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storage per user</CardTitle>
                  <CardDescription>
                    Top consumers, in megabytes. {totalFiles.toLocaleString("en-US")} files stored
                    in total.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {storageData.length === 0 ? (
                    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                      No files stored yet — the chart fills in as users upload.
                    </div>
                  ) : (
                    <ChartContainer config={storageConfig} className="h-56 w-full">
                      <BarChart data={storageData} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(v: number) => `${v} MB`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={90}
                          tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent formatter={(_v, _n, item) => item?.payload?.formatted} />
                          }
                        />
                        <Bar
                          dataKey="size"
                          fill="var(--color-size)"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={20}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Latest signups */}
            <Card>
              <CardHeader>
                <CardTitle>Latest signups</CardTitle>
                <CardDescription>The five most recent accounts.</CardDescription>
                <CardAction>
                  <Badge variant="secondary" className="tnum">
                    {total.toLocaleString("en-US")} accounts
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {latestSignups.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/40"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback
                          className={`text-xs font-medium ${
                            u.role === "ADMIN"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 grow">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          <span className="truncate">{u.name}</span>
                          {u.role === "ADMIN" && <Badge variant="secondary">admin</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email.toLowerCase()}
                        </p>
                      </div>
                      <span
                        className="hidden shrink-0 sm:block"
                        title={
                          u.banned
                            ? "Banned"
                            : u.verified
                              ? "Email verified"
                              : "Awaiting verification"
                        }
                      >
                        {u.banned ? (
                          <BanIcon className="size-4 text-destructive" />
                        ) : u.verified ? (
                          <CircleCheckIcon className="size-4 text-success" />
                        ) : (
                          <span className="block size-2 rounded-full bg-warning" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {u.banned ? "Banned" : u.verified ? "Email verified" : "Awaiting verification"}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-xs text-muted-foreground" title={new Date(u.createdAt).toLocaleString("en-US")}>
                        {relativeJoin(u.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t">
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  nativeButton={false}
                  render={<Link href="/admin/users" />}
                >
                  View all users
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
