// app/dashboard/page.tsx
"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileIcon,
  InboxIcon,
  LogOutIcon,
  SearchXIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import AppNavbar from "@/components/AppNavbar";
import { swrFetcher } from "@/components/SwrProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  verified: boolean;
  createdAt: string;
}

interface StorageInfo {
  usedBytes: number;
  remainingBytes: number;
  maxBytes: number;
  usedPercent: number;
}

interface FilesResponse {
  files: FileItem[];
  total: number;
  page: number;
  perPage: number;
  nextCursor?: string | null;
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

function FileSkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
      <Skeleton className="size-10 rounded-lg" />
      <div className="flex grow flex-col gap-2 py-1">
        <Skeleton className="h-3 w-[38%]" />
        <Skeleton className="h-2.5 w-[22%]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog();

  const perPage = 10;

  // Keyset pagination: stack kursor. Elemen terakhir = posisi sekarang;
  // index+1 = nomor halaman yang sedang tampil.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const pageNumber = cursors.length;

  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [newName, setNewName] = useState<Record<string, string>>({});

  // Debounce pencarian agar tidak nembak API tiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Ganti halaman/pencarian -> reset seleksi.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      setSelectedFiles(new Set());
      // Pencarian baru selalu mulai dari halaman pertama.
      setCursors((prev) => (prev.length === 1 ? prev : [null]));
    }
  }, [debouncedQuery]);

  // ---- data via SWR: cache + dedupe otomatis antar navigasi ----
  const { data: profile } = useSWR<UserProfile>("/api/user/profile", swrFetcher);
  const { data: storage, mutate: mutateStorage } = useSWR<StorageInfo>(
    "/api/user/storage",
    swrFetcher
  );

  const filesParams = new URLSearchParams({ limit: String(perPage) });
  if (debouncedQuery) filesParams.set("q", debouncedQuery);
  if (cursor) filesParams.set("cursor", cursor);
  const { data: filesData, isLoading: loading, mutate: mutateFiles } = useSWR<FilesResponse>(
    `/api/files?${filesParams.toString()}`,
    swrFetcher,
    // Selama pindah halaman, daftar lama tetap tampil (tidak berkedip kosong).
    { keepPreviousData: true }
  );

  const files: FileItem[] = filesData?.files ?? [];
  const total = filesData?.total ?? 0;
  const hasNextPage = !!filesData?.nextCursor;
  const lastPageApprox = Math.max(pageNumber, Math.ceil(total / perPage));

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

  function toggleSelectAll(checked: boolean | "indeterminate") {
    if (checked) {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    } else {
      setSelectedFiles(new Set());
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

        const successCount = data.filter((item: { error?: string }) => !item.error).length;
        const errorCount = data.filter((item: { error?: string }) => item.error).length;

        if (successCount > 0) {
          showToast("success", `${successCount} file(s) uploaded successfully`);
        }

        if (errorCount > 0) {
          const errorMessages = data
            .filter((item: { error?: string }) => item.error)
            .map((item: { filename: string; error: string }) => `${item.filename}: ${item.error}`)
            .join("; ");
          showToast("error", `${errorCount} file(s) failed: ${errorMessages}`);
        }

        // Upload baru selalu tampil di halaman pertama.
        setCursors([null]);
        await Promise.all([mutateFiles(), mutateStorage()]);
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
        // Jika ini item terakhir di halaman > 1, mundur satu halaman.
        if (files.length === 1 && pageNumber > 1) setCursors((prev) => prev.slice(0, -1));
        else await mutateFiles();
        await mutateStorage();
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
        if (ids.length >= files.length && pageNumber > 1) setCursors((prev) => prev.slice(0, -1));
        else await mutateFiles();
        setSelectedFiles(new Set());
        await mutateStorage();
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
        await mutateFiles();
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

  const firstItem = total === 0 ? 0 : (pageNumber - 1) * perPage + 1;
  const lastItem = Math.min(pageNumber * perPage, total);

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  const storageFull = storage ? storage.usedBytes >= storage.maxBytes : false;

  return (
    <main className="min-h-dvh">
      <AppNavbar
        title={profile ? `Welcome, ${profile.name}` : "My files"}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search files...",
        }}
      >
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/dashboard/profile" />}>
          <UserIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Profile</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOutIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </AppNavbar>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            My files
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload, rename, download, and delete your files from a simple dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Upload panel */}
          <Card className="md:col-span-1 lg:col-span-1">
            <CardHeader className="flex-row items-center gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <CloudUploadIcon className="size-4" />
              </span>
              <CardTitle>Upload file</CardTitle>
            </CardHeader>
            <CardContent>
              {storage && (
                <div className="my-3">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="tnum text-xs text-muted-foreground">
                      {formatSize(storage.usedBytes)} of {formatSize(storage.maxBytes)} used
                    </span>
                    <span className="tnum text-xs font-semibold">{storage.usedPercent}%</span>
                  </div>
                  <Progress
                    value={storage.usedPercent}
                    aria-label={`Storage ${storage.usedPercent}% used`}
                  />
                  {storageFull && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>Storage is full. Delete some files to upload again.</span>
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleUpload}>
                {/* Native input: sr-only must not fight the styled Input's w-full. */}
                <input
                  id="upload-files"
                  type="file"
                  multiple
                  className="peer sr-only"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (!list) {
                      setFilesToUpload([]);
                      return;
                    }
                    setFilesToUpload(Array.from(list));
                  }}
                />
                <label
                  htmlFor="upload-files"
                  className="mb-2 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-1 text-sm font-medium whitespace-nowrap shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                >
                  <CloudUploadIcon className="size-4" />
                  Choose files
                </label>

                {filesToUpload.length > 0 && (
                  <p className="tnum mb-2 text-xs text-muted-foreground">
                    {filesToUpload.length} {filesToUpload.length === 1 ? "file" : "files"} selected
                  </p>
                )}

                <Button type="submit" disabled={uploading || storageFull} className="w-full">
                  {uploading ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon data-icon="inline-start" />
                      Upload
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Files panel */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Files</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your uploaded files, rename them, or download them again.
                </p>
              </div>
              <Badge variant="secondary" className="tnum shrink-0">
                {total} {total === 1 ? "file" : "files"}
              </Badge>
            </CardHeader>
            <CardContent>
              {files.length > 0 && (
                <div
                  className={`mb-4 rounded-xl border p-3 transition-colors ${
                    selectedFiles.size > 0 ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        id="selectAll"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onCheckedChange={(checked) => toggleSelectAll(checked)}
                      />
                      Select all on this page
                    </label>

                    {selectedFiles.size > 0 && (
                      <>
                        <Badge className="tnum">{selectedFiles.size} selected</Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedFiles(new Set())}>
                          Clear all
                        </Button>
                        <div className="ms-auto flex flex-wrap gap-2">
                          <Button size="sm" onClick={handleBatchDownload} disabled={batchLoading}>
                            <DownloadIcon data-icon="inline-start" />
                            <span className="hidden md:inline">Download</span> selected
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBatchDelete}
                            disabled={batchLoading}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            <span className="hidden md:inline">Delete</span> selected
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading && files.length === 0 ? (
                <div className="flex flex-col gap-1 pt-2">
                  <FileSkeletonRow />
                  <FileSkeletonRow />
                  <FileSkeletonRow />
                </div>
              ) : files.length === 0 ? (
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {debouncedQuery ? <SearchXIcon /> : <InboxIcon />}
                    </EmptyMedia>
                    <EmptyTitle>{debouncedQuery ? "No files match your search" : "No files yet"}</EmptyTitle>
                    <EmptyDescription>
                      {debouncedQuery
                        ? `Nothing found for “${debouncedQuery}”. Try a different keyword.`
                        : "Upload your first file using the panel on the left."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <div className={`flex flex-col gap-2 pt-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className={`rounded-xl border p-3 transition-colors ${
                          selectedFiles.has(f.id) ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            className="mt-0.5"
                            aria-label={`Select ${f.filename}`}
                            checked={selectedFiles.has(f.id)}
                            onCheckedChange={() => toggleFileSelection(f.id)}
                          />

                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <FileIcon className="size-4" />
                          </span>

                          <div className="min-w-0 grow">
                            <div className="truncate font-semibold">{f.filename}</div>
                            <div className="tnum text-xs text-muted-foreground">
                              {formatSize(f.size)} · {new Date(f.createdAt).toLocaleString("en-US")}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-col items-stretch gap-2 sm:ml-[3.25rem] lg:flex-row">
                          <Input
                            className="grow"
                            placeholder="Rename..."
                            aria-label={`Rename ${f.filename}`}
                            value={newName[f.id] || ""}
                            onChange={(e) => setNewName((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          />

                          <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                            <Button variant="outline" size="sm" type="button" onClick={() => handleRename(f.id)}>
                              Rename
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              type="button"
                              onClick={() => handleDelete(f.id)}
                            >
                              Delete
                            </Button>
                            <Button size="sm" nativeButton={false} render={<a href={`/api/files/${f.id}`} />}>
                              <DownloadIcon data-icon="inline-start" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                        onClick={() =>
                          setCursors((prev) => [...prev, filesData?.nextCursor ?? null])
                        }
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
      </div>
    </main>
  );
}
