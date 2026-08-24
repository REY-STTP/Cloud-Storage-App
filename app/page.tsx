// app/page.tsx
import Link from "next/link";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      {/* Hero */}
      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-14 sm:px-8 md:grid-cols-2 lg:gap-20">
          <section className="space-y-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <FolderIcon className="size-3" />
              Simple cloud storage
            </span>

            <div className="space-y-4">
              <h1 className="text-4xl leading-[1.06] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.4rem]">
                Store, manage, and control your files
              </h1>
              <p className="max-w-[46ch] text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
                A minimal cloud storage dashboard with role-based access.
                Upload, rename, download, and delete your files — while admins
                manage accounts from a separate, protected space.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                Create an account
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
              <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
                Login
              </Button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <KeyRoundIcon className="size-3" />
                JWT auth
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <FolderIcon className="size-3" />
                File CRUD
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <ShieldIcon className="size-3" />
                Admin dashboard
              </span>
            </div>
          </section>

          {/* Preview card */}
          <section className="relative">
            <div className="space-y-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xl sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <FolderIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm leading-tight font-semibold">My files</p>
                    <p className="tnum text-xs text-muted-foreground">
                      3 items · 9.9 MB used
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Synced</Badge>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                {[
                  { name: "report-q1.pdf", meta: "1.2 MB · Uploaded today", badge: "Synced", variant: "secondary" },
                  { name: "design.sketch", meta: "8.4 MB · Edited 3h ago", badge: "In use", variant: "default" },
                  { name: "invoice-0325.xlsx", meta: "320 KB · Shared", badge: "Shared", variant: "outline" },
                ].map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                      <FileIcon className="size-4" />
                    </span>
                    <div className="min-w-0 grow">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="tnum text-xs text-muted-foreground">{file.meta}</p>
                    </div>
                    <Badge variant={file.variant as "secondary" | "default" | "outline"}>
                      {file.badge}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheckIcon className="size-3.5 text-primary" />
                    Admin tools
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Ban or remove accounts and clean up user files.
                  </p>
                </div>
                <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <KeyRoundIcon className="size-3.5 text-primary" />
                    Secure by design
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    JWT sessions, role-based routing, protected pages.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
