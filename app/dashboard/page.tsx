// app/dashboard/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  createdAt: string;
}

interface FileItem {
  id: string;
  filename: string;
  url?: string;
  mimeType?: string;
  size: number;
  createdAt: string;
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

export default function DashboardPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [newName, setNewName] = useState<Record<string, string>>({});

  const [page, setPage] = useState<number>(1);
  const perPage = 10;
  const [total, setTotal] = useState<number>(0);

  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  async function loadProfile() {
    try {
      const res = await fetch("/api/user/profile", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.warn("Failed to load profile", e);
    }
  }

  async function loadFiles(p = page, q = debouncedQuery) {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set("page", String(p));
      qp.set("limit", String(perPage));
      if (q) qp.set("q", q);

      const res = await fetch(`/api/files?${qp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) {
        showToast("error", "Failed to load file list");
        setFiles([]);
        setTotal(0);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          const totalCount = data.length;
          const start = (p - 1) * perPage;
          const paged = data.slice(start, start + perPage);
          setFiles(paged);
          setTotal(totalCount);
          setPage(p);
        } else if (data && Array.isArray(data.files)) {
          setFiles(data.files);
          setTotal(typeof data.total === "number" ? data.total : data.files.length);
          setPage(typeof data.page === "number" ? data.page : p);
        } else {
          setFiles([]);
          setTotal(0);
          setPage(1);
        }
      }
    } catch (e) {
      console.error("loadFiles error", e);
      showToast("error", "An error occurred while loading files");
      setFiles([]);
      setTotal(0);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setSelectedFiles(new Set());
    loadFiles(1, debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    loadFiles(page, debouncedQuery);
  }, [page]);

  useEffect(() => {
    loadProfile();
    loadFiles(1, debouncedQuery);
  }, []);

  function toggleFileSelection(id: string) {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();

    if (!filesToUpload || filesToUpload.length === 0) {
      showToast("warning", "Please select at least one file to upload");
      return;
    }

    const formData = new FormData();
    for (const f of filesToUpload) formData.append("files", f);

    setUploading(true);
    try {
      const res = await fetch("/api/files", { method: "POST", body: formData, credentials: "same-origin" });

      if (res.ok) {
        const data = await res.json();

        const hasErrors = data.some((item: any) => item.error);
        const successCount = data.filter((item: any) => !item.error).length;
        const errorCount = data.filter((item: any) => item.error).length;

        if (successCount > 0) {
          showToast("success", `${successCount} file(s) uploaded successfully`);
        }

        if (errorCount > 0) {
          const errorMessages = data
            .filter((item: any) => item.error)
            .map((item: any) => `${item.filename}: ${item.error}`)
            .join("; ");
          showToast("error", `${errorCount} file(s) failed: ${errorMessages}`);
        }

        setPage(1);
        await loadFiles(1, debouncedQuery);
        setFilesToUpload([]);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Upload failed");
      }
    } catch (e) {
      console.error("upload error", e);
      showToast("error", "An error occurred while uploading files");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this file?",
      description: "This action will permanently delete the file. This cannot be undone.",
      confirmLabel: "Delete file",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE", credentials: "same-origin" });

      if (res.ok) {
        showToast("success", "File deleted successfully");
        const totalAfter = Math.max(0, total - 1);
        const last = Math.max(1, Math.ceil(totalAfter / perPage));
        const nextPage = page > last ? last : page;
        setPage(nextPage);
        await loadFiles(nextPage, debouncedQuery);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Failed to delete file");
      }
    } catch (e) {
      console.error("delete error", e);
      showToast("error", "An error occurred while deleting file");
    }
  }

  async function handleBatchDelete() {
    if (selectedFiles.size === 0) {
      showToast("warning", "Please select at least one file to delete");
      return;
    }

    const ok = await confirm({
      title: `Delete ${selectedFiles.size} file(s)?`,
      description: `This will permanently delete ${selectedFiles.size} file(s). This action cannot be undone.`,
      confirmLabel: "Delete selected",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    const ids = Array.from(selectedFiles)
    
    setBatchLoading(true);
    try {
      const res = await fetch("/api/files/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", `${ids.length} file(s) deleted successfully`);
        const totalAfter = Math.max(0, total - ids.length);
        const last = Math.max(1, Math.ceil(totalAfter / perPage));
        const nextPage = page > last ? last : page;
        setSelectedFiles(new Set());
        setPage(nextPage);
        await loadFiles(nextPage, debouncedQuery);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Failed to delete files");
      }
    } catch (e) {
      console.error("batch delete error", e);
      showToast("error", "An error occurred while deleting files");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleRename(id: string) {
    const filename = newName[id];
    if (!filename || filename.trim() === "") {
      showToast("warning", "Filename cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
        credentials: "same-origin",
      });

      if (res.ok) {
        showToast("success", "File renamed successfully");
        await loadFiles(page, debouncedQuery);
        setNewName((prev) => ({ ...prev, [id]: "" }));
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Failed to rename file");
      }
    } catch (e) {
      console.error("rename error", e);
      showToast("error", "An error occurred while renaming file");
    }
  }

  async function handleBatchDownload() {
    if (selectedFiles.size === 0) {
      showToast("warning", "Please select at least one file to download");
      return;
    }

    setBatchLoading(true);
    showToast("info", "Processing download...");

    try {
      const res = await fetch("/api/files/batch/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedFiles) }),
        credentials: "same-origin",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `files-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast("success", `${selectedFiles.size} file(s) downloaded successfully`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message || "Failed to download files");
      }
    } catch (e) {
      console.error("batch download error", e);
      showToast("error", "An error occurred while downloading files");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/login";
  }

  const firstItem = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, total);
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  return (
    <main className="home-landing app-shell">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">
        <span className="navbar-brand">{user ? `Welcome, ${user.name}` : "Loading..."}</span>

        <div className="ms-auto d-flex gap-2 align-items-center">
          <div className="input-group me-2 d-none d-md-flex" style={{ minWidth: 220 }}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search files..."
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
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </button>

          <a href="/dashboard/profile" className="btn btn-outline-light btn-sm">
            Profile
          </a>

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
              placeholder="Search files..."
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
            <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setShowMobileSearch(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="container app-shell-main">
        <div className="app-section-header">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
              <span>🗂️</span> Your storage
            </span>
          </div>
          <h1 className="app-section-title mb-1">My files</h1>
          <p className="app-section-subtitle mb-0">Upload, rename, download, and delete your files from a simple dashboard.</p>
        </div>

        <div className="row g-4">
          <div className="col-md-4 col-lg-4">
            <div className="landing-card shadow-lg border-0 p-4">
              <h5 className="card-title mb-3 fw-bold">Upload file</h5>

              <form onSubmit={handleUpload}>
                <input
                  type="file"
                  multiple
                  className="form-control mb-2"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (!list) {
                      setFilesToUpload([]);
                      return;
                    }
                    setFilesToUpload(Array.from(list));
                  }}
                />

                {filesToUpload.length > 0 && <p className="small text-muted mb-2">{filesToUpload.length} file selected</p>}

                <button className="btn btn-primary w-100" type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-8 col-lg-8">
            <div className="landing-card user-files-card shadow-lg border-0 p-4">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h2 className="mb-1 fw-bold" style={{ fontSize: "1.15rem" }}>
                    List of Files
                  </h2>
                  <p className="text-muted small mb-0">Manage your uploaded files, rename them, or download them again.</p>
                </div>
                <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">{total} file(s)</span>
              </div>

              {files.length > 0 && (
                <div className="mt-3 p-3 rounded-2 border">
                  <div className="d-flex flex-wrap align-items-center gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="selectAll"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={toggleSelectAll}
                      />
                      <label className="form-check-label small" htmlFor="selectAll">
                        Select all on this page
                      </label>
                    </div>

                    {selectedFiles.size > 0 && (
                      <>
                        <span className="badge bg-primary">{selectedFiles.size} selected</span>
                        <button
                          className="btn btn-sm btn-outline-secondary btn-sm"
                          onClick={() => setSelectedFiles(new Set())}
                          title="Clear all selections"
                        >
                          Clear all
                        </button>
                        <div className="d-flex gap-2 ms-auto">
                          <button className="btn btn-sm btn-success" onClick={handleBatchDownload} disabled={batchLoading}>
                            {batchLoading ? "Processing..." : "📥 Download Selected"}
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={handleBatchDelete} disabled={batchLoading}>
                            {batchLoading ? "Processing..." : "🗑️ Delete Selected"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="mt-4">
                  <p>Loading...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="mt-4 landing-mini-card rounded-3 p-3 text-center small">There are no files yet. Try uploading something on the left.</div>
              ) : (
                <>
                  <div className="mt-4 user-files-list">
                    {files.map((f) => (
                      <div key={f.id} className="user-file-row mb-3 p-3 rounded-2 border border-slate-200/60">
                        <div className="d-flex gap-3">
                          <div className="d-flex align-items-start pt-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedFiles.has(f.id)}
                              onChange={() => toggleFileSelection(f.id)}
                            />
                          </div>

                          <div className="flex-grow-1">
                            <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                              <div className="flex-grow-1">
                                <div className="fw-semibold">{f.filename}</div>
                                <div className="user-file-meta text-muted small">
                                  {formatSize(f.size)} • {new Date(f.createdAt).toLocaleString("id-ID")}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex flex-column flex-lg-row gap-2 mt-2 align-items-stretch">
                              <div className="flex-grow-1">
                                <input className="form-control form-control-sm" placeholder="Rename..." value={newName[f.id] || ""} onChange={(e) => setNewName((prev) => ({ ...prev, [f.id]: e.target.value }))} />
                              </div>

                              <div className="d-flex flex-wrap flex-lg-nowrap gap-2">
                                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => handleRename(f.id)}>
                                  Rename
                                </button>
                                <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDelete(f.id)}>
                                  Delete
                                </button>
                                <a className="btn btn-sm btn-success" href={`/api/files/${f.id}`}>
                                  Download
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Showing {firstItem} - {lastItem} of {total}
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        Previous
                      </button>

                      <div className="small text-muted" style={{ minWidth: 90, textAlign: "center" }}>
                        Page {page} / {lastPage}
                      </div>

                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setPage((p) => {
                            const last = Math.max(1, Math.ceil(total / perPage));
                            return Math.min(last, p + 1);
                          })
                        }
                        disabled={page >= lastPage}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
