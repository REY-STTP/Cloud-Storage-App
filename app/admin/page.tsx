// app/admin/page.tsx
// Admin overview: real stats and charts drawn from the user base.
"use client";

import useSWR from "swr";
import {
  BanIcon,
  CircleCheckIcon,
  HardDriveIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { swrFetcher } from "@/components/SwrProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <CardContent className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex grow flex-col gap-1.5">
              <Skeleton className="h-2.5 w-[60%]" />
              <Skeleton className="h-5 w-[40%]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  // One call, wide limit: the overview needs the whole user base to compute honestly.
  const { data, isLoading, error } = useSWR<AdminUsersResponse>(
    "/api/admin/users?limit=500",
    swrFetcher
  );

  const users: UserItem[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const admins = data?.admins ?? 0;
  const banned = data?.banned ?? 0;
  const verified = users.filter((u) => u.verified && !u.banned).length;
  const unverified = users.filter((u) => !u.verified && !u.banned).length;
  const totalBytes = users.reduce((sum, u) => sum + (u.totalSizeBytes ?? 0), 0);
  const totalFiles = users.reduce((sum, u) => sum + (u.fileCount ?? 0), 0);

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

  const stats = [
    { label: "Total users", value: String(total), hint: `${totalFiles} files stored`, icon: UsersIcon, tone: "text-foreground", tint: "bg-primary/10 text-primary" },
    { label: "Verified", value: String(verified), hint: `${unverified} awaiting verification`, icon: CircleCheckIcon, tone: "text-success", tint: "bg-success/10 text-success" },
    { label: "Banned", value: String(banned), hint: banned > 0 ? "Cannot sign in" : "No banned accounts", icon: BanIcon, tone: "text-destructive", tint: "bg-destructive/10 text-destructive" },
    { label: "Admins", value: String(admins), hint: "Protected accounts", icon: ShieldIcon, tone: "text-foreground", tint: "bg-accent text-accent-foreground" },
    { label: "Storage used", value: formatSize(totalBytes), hint: `across ${total} accounts`, icon: HardDriveIcon, tone: "text-foreground", tint: "bg-chart-2/15 text-chart-2" },
  ];

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The state of your storage service, computed from live account data.
          </p>
        </div>

        {isLoading ? (
          <StatSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Could not load admin data. Refresh the page to try again.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Stat strip */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-3">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.tint}`}>
                      <stat.icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                      <p className={`tnum truncate text-xl font-semibold tracking-tight ${stat.tone}`}>
                        {stat.value}
                      </p>
                    </div>
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
                      <Bar dataKey="users" fill="var(--color-users)" radius={6} isAnimationActive={false} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storage per user</CardTitle>
                  <CardDescription>
                    Top consumers, in megabytes. {totalFiles} files stored in total.
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
                          content={<ChartTooltipContent formatter={(_v, _n, item) => item?.payload?.formatted} />}
                        />
                        <Bar dataKey="size" fill="var(--color-size)" radius={6} isAnimationActive={false} />
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
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {users
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/40"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <UserIcon className="size-4" />
                        </span>
                        <div className="min-w-0 grow">
                          <p className="truncate text-sm font-medium">
                            {u.name}
                            {u.role === "ADMIN" && (
                              <span className="ms-2 text-xs font-normal text-muted-foreground">admin</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email.toLowerCase()}</p>
                        </div>
                        <span className="tnum shrink-0 text-xs text-muted-foreground">
                          Joined {new Date(u.createdAt).toLocaleDateString("en-US")}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
