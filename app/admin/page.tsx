// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

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

export default function AdminDashboard() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<number>(1);
  const perPage = 10;
  const [total, setTotal] = useState<number>(0);
  const [admins, setAdmins] = useState<number>(0);
  const [verified, setVerified] = useState<number>(0);
  const [banned, setBanned] = useState<number>(0);

  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadUsers(p = page, q = debouncedQuery) {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(perPage));
      if (q) params.set("q", q);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        showToast("error", "Failed to load users");
        setUsers([]);
        setTotal(0);
        setAdmins(0);
        setVerified(0);
        setBanned(0);
        setPage(1);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.debug("GET /api/admin/users response:", data);

      if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotal(typeof data.total === "number" ? data.total : data.users.length);
        setAdmins(typeof data.admins === "number" ? data.admins : data.users.filter((u: any) => u.role === "ADMIN").length);
        setVerified(typeof data.verified === "number" ? data.verified : data.users.filter((u: any) => u.verified).length);
        setBanned(typeof data.banned === "number" ? data.banned : data.users.filter((u: any) => u.banned).length);
        setPage(typeof data.page === "number" ? data.page : p);
        setLoading(false);
        return;
      }

      if (Array.isArray(data)) {
        const totalCount = data.length;
        const start = (p - 1) * perPage;
        const paged = data.slice(start, start + perPage);
        setUsers(paged);
        setTotal(totalCount);
        setAdmins(data.filter((u: any) => u.role === "ADMIN").length);
        setVerified(data.filter((u: any) => u.verified).length);
        setBanned(data.filter((u: any) => u.banned).length);
        setPage(p);
        setLoading(false);
        return;
      }

      console.warn("Unexpected /api/admin/users response shape:", data);
      setUsers([]);
      setTotal(0);
      setAdmins(0);
      setVerified(0);
      setBanned(0);
      setPage(1);
    } catch (e) {
      console.error("loadUsers error", e);
      showToast("error", "An error occurred while loading users");
      setUsers([]);
      setTotal(0);
      setAdmins(0);
      setVerified(0);
      setBanned(0);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setSelectedUsers(new Set());
    loadUsers(1, debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    loadUsers(page, debouncedQuery);
  }, [page]);

  useEffect(() => {
    loadUsers(1, debouncedQuery);
  }, []);


  function toggleSelectAll() {
    const selectableUsers = users.filter((u) => u.role === "USER");
    const selectableIds = selectableUsers.map((u) => u.id);

    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedUsers.has(id));

    if (allSelected) {
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.add(id));
        return next;
      });
    }
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
      await loadUsers(page, debouncedQuery);
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
      await loadUsers(page, debouncedQuery);
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
      const totalAfter = Math.max(0, total - 1);
      const last = Math.max(1, Math.ceil(totalAfter / perPage));
      const nextPage = page > last ? last : page;
      setPage(nextPage);
      await loadUsers(nextPage, debouncedQuery);
    } catch (e) {
      console.error("delete error", e);
      showToast("error", "An error occurred while deleting user");
    }
  }

  async function handleBatchBan() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to ban");
      return;
    }
    const ok = await confirm({
      title: `Ban ${selectedUsers.size} user(s)?`,
      description: `This will ban ${selectedUsers.size} selected user(s).`,
      confirmLabel: "Ban selected",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    const ids = Array.from(selectedUsers)

    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, banned: true }),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", `${ids.length} user(s) banned successfully`);
        setSelectedUsers(new Set());
        await loadUsers(page, debouncedQuery);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Batch ban failed");
      }
    } catch (e) {
      console.error("batch ban error", e);
      showToast("error", "An error occurred while banning users");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchUnban() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to unban");
      return;
    }
    const ok = await confirm({
      title: `Unban ${selectedUsers.size} user(s)?`,
      description: `This will unban ${selectedUsers.size} selected user(s).`,
      confirmLabel: "Unban selected",
      cancelLabel: "Cancel",
      danger: false,
    });

    if (!ok) return;

    const ids = Array.from(selectedUsers)

    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, banned: false }),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", `${ids.length} user(s) unbanned successfully`);
        setSelectedUsers(new Set());
        await loadUsers(page, debouncedQuery);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Batch unban failed");
      }
    } catch (e) {
      console.error("batch unban error", e);
      showToast("error", "An error occurred while unbanning users");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchDelete() {
    if (selectedUsers.size === 0) {
      showToast("warning", "Please select at least one user to delete");
      return;
    }
    const ok = await confirm({
      title: `Delete ${selectedUsers.size} user(s)?`,
      description: `This will permanently delete ${selectedUsers.size} selected user(s) and their files.`,
      confirmLabel: "Delete selected",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    const ids = Array.from(selectedUsers)

    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", `${ids.length} user(s) deleted successfully`);
        const totalAfter = Math.max(0, total - ids.length);
        const last = Math.max(1, Math.ceil(totalAfter / perPage));
        const nextPage = page > last ? last : page;
        setSelectedUsers(new Set());
        setPage(nextPage);
        await loadUsers(nextPage, debouncedQuery);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Batch delete failed");
      }
    } catch (e) {
      console.error("batch delete error", e);
      showToast("error", "An error occurred while deleting users");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/login";
  }

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const firstItem = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, total);

  const selectableUsers = users.filter((u) => u.role === "USER");
  const selectableIds = selectableUsers.map((u) => u.id);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedUsers.has(id));
  const someSelectableSelected = selectableIds.some((id) => selectedUsers.has(id)) && !allSelectableSelected;

  return (
    <main className="home-landing app-shell">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">
        <span className="navbar-brand">Admin Dashboard</span>

        <div className="ms-auto d-flex gap-2 align-items-center">
          <div className="input-group me-2 d-none d-md-flex" style={{ minWidth: 220 }}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setQuery("")}
                title="Clear"
              >
                ×
              </button>
            )}
          </div>

          <button
            className="btn btn-outline-light btn-sm d-md-none"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            title="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>

          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {showMobileSearch && (
        <div className="bg-dark border-bottom border-secondary px-4 py-3 d-md-none">
          <div className="input-group">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setQuery("")}
                title="Clear"
              >
                ×
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => setShowMobileSearch(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="container app-shell-main">
        <div className="app-section-header">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs mb-2 font-medium uppercase tracking-[0.15em] shadow-sm">
              <span>🛡️</span> Admin space
            </span>
          </div>
          <h1 className="app-section-title mb-1">User management</h1>
          <p className="app-section-subtitle mb-0">
            View all registered users, ban or unban suspicious accounts, and remove user data when needed.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="landing-card shadow-lg border-0 p-4">
              <h5 className="mb-2 fw-bold">Overview</h5>
              <p className="text-muted small mb-3">Quick glance of your user base.</p>

              <div className="landing-mini-card rounded-3 p-3 mb-3">
                <div className="d-flex justify-content-between small mb-2">
                  <span className="fw-semibold">Total users</span>
                  <span className="fw-bold">{total}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span>Admins</span>
                  <span>{admins}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span>Verified users</span>
                  <span className="text-success">{verified}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span>Banned users</span>
                  <span className="text-danger">{banned}</span>
                </div>
              </div>

              <p className="text-muted small mb-2">• Only regular users can be banned or deleted.</p>
              <p className="text-muted small mb-2">• Admin accounts are protected to avoid losing access.</p>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="landing-card admin-users-card shadow-lg border-0 p-4">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h2 className="mb-1 fw-bold" style={{ fontSize: "1.15rem" }}>List of Users</h2>
                  <p className="text-muted small mb-0">Manage roles, ban/unban users, and remove accounts.</p>
                </div>
                <span className="landing-pill inline-flex items-centrerounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
                  {total} user(s)
                </span>
              </div>

              {selectableUsers.length > 0 && (
                <div className="mt-3 p-3 rounded-2 border">
                  <div className="d-flex flex-wrap align-items-center gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="selectAll"
                        checked={allSelectableSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelectableSelected;
                        }}
                        onChange={toggleSelectAll}
                      />
                      <label className="form-check-label small" htmlFor="selectAll">
                        Select all on this page
                      </label>
                    </div>

                    {selectedUsers.size > 0 && (
                      <>
                        <span className="badge bg-primary">{selectedUsers.size} selected</span>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelectedUsers(new Set())}
                          title="Clear all selections"
                        >
                          Clear all
                        </button>
                        <div className="d-flex gap-2 ms-auto w-100 w-md-auto mt-2 mt-md-0">
                          <button
                            className="btn btn-warning d-none d-md-inline-block"
                            style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                            onClick={handleBatchBan}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "Processing..." : "🚫 Ban Selected"}
                          </button>
                          <button
                            className="btn btn-warning d-md-none"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            onClick={handleBatchBan}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "..." : "🚫 Ban"}
                          </button>

                          <button
                            className="btn btn-success d-none d-md-inline-block"
                            style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                            onClick={handleBatchUnban}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "Processing..." : "✅ Unban Selected"}
                          </button>
                          <button
                            className="btn btn-success d-md-none"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            onClick={handleBatchUnban}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "..." : "✅ Unban"}
                          </button>

                          <button
                            className="btn btn-danger d-none d-md-inline-block"
                            style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                            onClick={handleBatchDelete}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "Processing..." : "🗑️ Delete Selected"}
                          </button>
                          <button
                            className="btn btn-danger d-md-none"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            onClick={handleBatchDelete}
                            disabled={batchLoading}
                          >
                            {batchLoading ? "..." : "🗑️ Delete"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="mt-4 landing-mini-card rounded-3 p-3 text-center small">
                  {query ? `No users found for "${query}"` : "There are no users yet."}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="rounded-3 border border-slate-200/70 dark:border-slate-700/70 overflow-hidden">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="border-bottom border-slate-200/70 dark:border-slate-700/70 last:border-0 px-3 py-3 d-flex gap-3"
                      >
                        <div className="d-flex align-items-start pt-1">
                          {u.role === "USER" ? (
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedUsers.has(u.id)}
                              onChange={() => {
                                if (u.role === "ADMIN") return;
                                setSelectedUsers((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(u.id)) newSet.delete(u.id);
                                  else newSet.add(u.id);
                                  return newSet;
                                });
                              }}
                            />
                          ) : (
                            <div style={{ width: "16px" }} />
                          )}
                        </div>

                        <div className="flex-grow-1 position-relative pb-1 pb-md-4">
                          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
                            <div className="flex-grow-1">
                              <div className="fw-semibold d-flex align-items-center gap-2">
                                {u.name}
                                {u.banned && <span className="badge bg-danger ms-2">BANNED</span>}
                              </div>

                              <div className="text-muted small">{u.email.toLowerCase()}</div>

                              <div className="text-muted small mt-1">
                                {u.role === "ADMIN"
                                  ? ""
                                  : `${typeof u.fileCount === "number" ? u.fileCount : ""} files • ${typeof u.totalSizeBytes === "number" ? formatSize(u.totalSizeBytes) : ""}`}
                              </div>
                            </div>

                            <div className="d-flex flex-row gap-2 align-items-center position-absolute position-md-static top-0 end-0 pt-1">
                              <div><span className="fw-semibold small">{u.role}</span></div>

                              {u.role !== "ADMIN" && (
                                <div>
                                  {u.verified ? (
                                    <span className="badge bg-success small">VERIFIED</span>
                                  ) : (
                                    <span className="badge bg-warning text-dark small">NOT VERIFIED</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="d-none d-md-block position-absolute start-0 bottom-0 small text-muted">
                            {new Date(u.createdAt).toLocaleDateString("en-US")}
                          </div>

                          <div className="d-none d-md-flex position-absolute end-0 bottom-0 gap-2">
                            {u.role === "USER" ? (
                              <>
                                {u.banned ? (
                                  <button className="btn btn-sm btn-outline-success" onClick={() => unbanUser(u.id)}>Unban</button>
                                ) : (
                                  <button className="btn btn-sm btn-warning" onClick={() => banUser(u.id)}>Ban</button>
                                )}
                                <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                              </>
                            ) : (
                              <span className="small text-muted">Admin accounts cannot be modified here.</span>
                            )}
                          </div>

                          <div className="d-flex d-md-none justify-content-between align-items-center mt-3">
                            <div className="small text-muted">{new Date(u.createdAt).toLocaleDateString("en-US")}</div>

                            <div className="d-flex gap-2">
                              {u.role === "USER" ? (
                                <>
                                  {u.banned ? (
                                    <button className="btn btn-sm btn-outline-success" onClick={() => unbanUser(u.id)}>Unban</button>
                                  ) : (
                                    <button className="btn btn-sm btn-warning" onClick={() => banUser(u.id)}>Ban</button>
                                  )}
                                  <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                                </>
                              ) : (
                                <span className="small text-muted">Protected</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">Showing {firstItem} - {lastItem} of {total}</div>

                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>

                      <div className="small text-muted" style={{ minWidth: 90, textAlign: "center" }}>
                        Page {page} / {lastPage}
                      </div>

                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage}>Next</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
