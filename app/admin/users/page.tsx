// app/admin/users/page.tsx
// User management: search, ban/unban, delete, batch actions.
"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  SearchIcon,
  SearchXIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { swrFetcher } from "@/components/SwrProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
  nextCursor?: string | null;
}

function formatSize(bytes?: number | null) {
  if (bytes === null || bytes === undefined || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
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

function UserSkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
      <Skeleton className="size-10 rounded-lg" />
      <div className="flex grow flex-col gap-2 py-1">
        <Skeleton className="h-3 w-[30%]" />
        <Skeleton className="h-2.5 w-[42%]" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()

  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const pageNumber = cursors.length;
  const perPage = 10;

  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Debounce pencarian agar tidak nembak API tiap ketikan.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Ganti pencarian -> reset seleksi + kembali ke halaman pertama.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      setCursors((prev) => (prev.length === 1 ? prev : [null]));
      setSelectedUsers(new Set());
    }
  }, [debouncedQuery]);

  // ---- data via SWR: cache + dedupe otomatis antar navigasi ----
  const params = new URLSearchParams({ limit: String(perPage) });
  if (debouncedQuery) params.set("q", debouncedQuery);
  if (cursor) params.set("cursor", cursor);
  const { data, isLoading: loading, mutate: mutateUsers } = useSWR<AdminUsersResponse>(
    `/api/admin/users?${params.toString()}`,
    swrFetcher,
    { keepPreviousData: true }
  );

  const users: UserItem[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const hasNextPage = !!data?.nextCursor;
  const lastPageApprox = Math.max(pageNumber, Math.ceil(total / perPage));

  function toggleSelectAll(checked: boolean | "indeterminate") {
    const selectableIds = users.filter((u) => u.role === "USER").map((u) => u.id);

    setSelectedUsers((prev) => {
      const next = new Set(prev);
      for (const id of selectableIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function banUser(id: string) {
    const ok = await confirm({
      title: "Ban this user?",
      description: "Banning will prevent this user from logging in. You can unban later.",
      confirmLabel: "Ban user",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: true }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast("error", data?.message || "Failed to ban user");
        return;
      }

      showToast("success", "User banned successfully");
      await mutateUsers();
    } catch (e) {
      console.error("ban error", e);
      showToast("error", "An error occurred while banning user");
    }
  }

  async function unbanUser(id: string) {
    const ok = await confirm({
      title: "Unban this user?",
      description: "Restore access for this user?",
      confirmLabel: "Unban user",
      cancelLabel: "Cancel",
      danger: false,
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: false }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast("error", data?.message || "Failed to unban user");
        return;
      }

      showToast("success", "User unbanned successfully");
      await mutateUsers();
    } catch (e) {
      console.error("unban error", e);
      showToast("error", "An error occurred while unbanning user");
    }
  }

  async function deleteUser(id: string) {
    const ok = await confirm({
      title: "Delete this user?",
      description: "This will permanently delete the user and all their files. This action cannot be undone.",
      confirmLabel: "Delete user",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast("error", data?.message || "Failed to delete user");
        return;
      }

      showToast("success", "User deleted successfully");
      // Jika ini baris terakhir di halaman > 1, mundur satu halaman.
      if (users.length === 1 && pageNumber > 1) setCursors((prev) => prev.slice(0, -1));
      else await mutateUsers();
    } catch (e) {
      console.error("delete error", e);
      showToast("error", "An error occurred while deleting user");
    }
  }

  async function runBatch(
    method: "PATCH" | "DELETE",
    successMessage: string,
    body: Record<string, unknown>
  ) {
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", successMessage);
        setSelectedUsers(new Set());
        await mutateUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Batch operation failed");
      }
    } catch (e) {
      console.error("batch error", e);
      showToast("error", "An error occurred during the batch operation");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchBan() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to ban");
      return;
    }
    const ids = Array.from(selectedUsers);
    const ok = await confirm({
      title: `Ban ${ids.length} user(s)?`,
      description: `This will ban ${ids.length} selected user(s).`,
      confirmLabel: "Ban selected",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    await runBatch("PATCH", `${ids.length} user(s) banned successfully`, { ids, banned: true });
  }

  async function handleBatchUnban() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to unban");
      return;
    }
    const ids = Array.from(selectedUsers);
    const ok = await confirm({
      title: `Unban ${ids.length} user(s)?`,
      description: `This will unban ${ids.length} selected user(s).`,
      confirmLabel: "Unban selected",
      cancelLabel: "Cancel",
      danger: false,
    });
    if (!ok) return;
    await runBatch("PATCH", `${ids.length} user(s) unbanned successfully`, { ids, banned: false });
  }

  async function handleBatchDelete() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to delete");
      return;
    }
    const ids = Array.from(selectedUsers);
    const ok = await confirm({
      title: `Delete ${ids.length} user(s)?`,
      description: `This will permanently delete ${ids.length} selected user(s) and their files.`,
      confirmLabel: "Delete selected",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    if (ids.length >= users.length && pageNumber > 1) setCursors((prev) => prev.slice(0, -1));
    await runBatch("DELETE", `${ids.length} user(s) deleted successfully`, { ids });
  }

  const firstItem = total === 0 ? 0 : (pageNumber - 1) * perPage + 1;
  const lastItem = Math.min(pageNumber * perPage, total);

  const selectableUsers = users.filter((u) => u.role === "USER");
  const selectableIds = selectableUsers.map((u) => u.id);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedUsers.has(id));
  const someSelectableSelected = selectableIds.some((id) => selectedUsers.has(id)) && !allSelectableSelected;

  const searchField = (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
        aria-label="Search users"
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent pr-8 pl-8 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">User management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all registered users, ban or unban suspicious accounts, and remove user data when needed.
          </p>
        </div>

        <Card>
          <CardHeader className="max-sm:flex max-sm:flex-col max-sm:gap-3">
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage roles, ban/unban users, and remove accounts.</CardDescription>
            <CardAction className="max-sm:w-full sm:self-center">
              <div className="flex w-full items-center gap-3">
                {searchField}
                <Badge variant="secondary" className="tnum shrink-0">
                  {total} {total === 1 ? "user" : "users"}
                </Badge>
              </div>
            </CardAction>
          </CardHeader>
            <CardContent>
              {selectableUsers.length > 0 && (
                <div
                  className={`rounded-xl border p-3 transition-colors ${
                    selectedUsers.size > 0 ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        id="selectAll"
                        checked={allSelectableSelected}
                        indeterminate={someSelectableSelected}
                        onCheckedChange={(checked) => toggleSelectAll(checked)}
                      />
                      Select all users on this page
                    </label>

                    {selectedUsers.size > 0 && (
                      <>
                        <Badge className="tnum">{selectedUsers.size} selected</Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                          Clear all
                        </Button>
                        <div className="ms-auto flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
                            onClick={handleBatchBan}
                            disabled={batchLoading}
                          >
                            <BanIcon data-icon="inline-start" />
                            Ban selected
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                            onClick={handleBatchUnban}
                            disabled={batchLoading}
                          >
                            <CircleCheckIcon data-icon="inline-start" />
                            Unban selected
                          </Button>
                          <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={batchLoading}>
                            <Trash2Icon data-icon="inline-start" />
                            Delete selected
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading && users.length === 0 ? (
                <div className="flex flex-col gap-1 pt-4">
                  <UserSkeletonRow />
                  <UserSkeletonRow />
                  <UserSkeletonRow />
                </div>
              ) : users.length === 0 ? (
                <Empty className="mt-4 border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {debouncedQuery ? <SearchXIcon /> : <UsersIcon />}
                    </EmptyMedia>
                    <EmptyTitle>{debouncedQuery ? "No users match your search" : "No users yet"}</EmptyTitle>
                    <EmptyDescription>
                      {debouncedQuery
                        ? `Nothing found for “${debouncedQuery}”. Try a different keyword.`
                        : "New registrations will appear here."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <div className={`mt-4 flex flex-col gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
                    {users.map((u) => {
                      const actions =
                        u.role === "USER" ? (
                          <>
                            {u.banned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                                onClick={() => unbanUser(u.id)}
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
                                onClick={() => banUser(u.id)}
                              >
                                Ban
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>
                              Delete
                            </Button>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ShieldCheckIcon className="size-3.5" />
                            Protected
                          </span>
                        );

                      return (
                        <div
                          key={u.id}
                          className={`flex items-start gap-3 rounded-xl border p-3 transition-colors md:items-center ${
                            u.role === "ADMIN" ? "opacity-90" : "hover:bg-muted/40"
                          }`}
                        >
                          {/* Leading: selection + identity */}
                          <div className="flex shrink-0 items-center gap-3">
                            {u.role === "USER" ? (
                              <Checkbox
                                aria-label={`Select ${u.name}`}
                                checked={selectedUsers.has(u.id)}
                                onCheckedChange={() => {
                                  setSelectedUsers((prev) => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(u.id)) newSet.delete(u.id);
                                    else newSet.add(u.id);
                                    return newSet;
                                  });
                                }}
                              />
                            ) : (
                              <span className="size-4" aria-hidden="true" />
                            )}

                            <Avatar className="size-10">
                              <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Info column: name + status, email, metadata */}
                          <div className="min-w-0 grow">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                              <span className="truncate">{u.name}</span>
                              {u.banned && <Badge variant="destructive">Banned</Badge>}
                              {u.role === "ADMIN" && <Badge>Admin</Badge>}
                              {u.role === "USER" &&
                                (u.verified ? (
                                  <Badge variant="success">Verified</Badge>
                                ) : (
                                  <Badge variant="warning">Unverified</Badge>
                                ))}
                            </div>

                            <div className="truncate text-sm text-muted-foreground">{u.email.toLowerCase()}</div>

                            <div className="tnum text-xs text-muted-foreground">
                              Joined {new Date(u.createdAt).toLocaleDateString("en-US")}
                            </div>

                            {u.role !== "ADMIN" && (
                              <div className="tnum text-xs text-muted-foreground">
                                {typeof u.fileCount === "number" ? `${u.fileCount} ${u.fileCount === 1 ? "file" : "files"}` : ""}
                                {typeof u.fileCount === "number" && typeof u.totalSizeBytes === "number" ? " · " : ""}
                                {typeof u.totalSizeBytes === "number" ? formatSize(u.totalSizeBytes) : ""}
                              </div>
                            )}

                            {/* Mobile actions: aligned under the info column */}
                            <div className="mt-2.5 flex flex-wrap gap-2 md:hidden">{actions}</div>
                          </div>

                          {/* Desktop actions: right-aligned */}
                          <div className="hidden shrink-0 items-center gap-2 md:flex">{actions}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="tnum text-sm text-muted-foreground">
                      Showing {firstItem}–{lastItem} of {total}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setCursors((prev) => prev.slice(0, -1))}
                        disabled={pageNumber <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeftIcon />
                      </Button>

                      <div className="tnum min-w-[90px] text-center text-sm text-muted-foreground">
                        Page {pageNumber} of {lastPageApprox}
                      </div>

                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setCursors((prev) => [...prev, data?.nextCursor ?? null])}
                        disabled={!hasNextPage}
                        aria-label="Next page"
                      >
                        <ChevronRightIcon />
                      </Button>
                    </div>
                  </div>
                </>
              )}
             </CardContent>
          </Card>
      </div>
    </main>
  );
}
