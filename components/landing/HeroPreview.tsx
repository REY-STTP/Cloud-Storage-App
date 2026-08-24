// components/landing/HeroPreview.tsx
// CSS-built product preview for the hero: the dashboard, honestly staged.
import {
  FileIcon,
  FolderIcon,
  LinkIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const rows = [
  { name: "tax-dossier-2026.pdf", meta: "1.2 MB · Uploaded today", badge: "Synced", variant: "success" },
  { name: "passport-scan.jpg", meta: "3.8 MB · Uploaded Monday", badge: "Private", variant: "default" },
  { name: "lease-agreement.docx", meta: "84 KB · Edited 2h ago", badge: "Synced", variant: "success" },
] as const;

export default function HeroPreview() {
  return (
    <div className="relative">
      {/* Ambient depth behind the window */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-4xl bg-gradient-to-br from-primary/12 via-transparent to-chart-2/10 blur-2xl"
      />

      <div className="shadow-lift relative overflow-hidden rounded-2xl border bg-card text-card-foreground">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            Cloud Storage — My files
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Files", value: "128" },
              { label: "Used", value: "47.3%" },
              { label: "Free", value: "556 MB" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border bg-muted/40 px-3 py-2.5">
                <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  {kpi.label}
                </p>
                <p className="tnum mt-0.5 text-lg font-semibold tracking-tight">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* File rows */}
          <div className="flex flex-col gap-2">
            {rows.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <FileIcon className="size-4" />
                </span>
                <div className="min-w-0 grow">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="tnum text-xs text-muted-foreground">{file.meta}</p>
                </div>
                <Badge variant={file.variant}>{file.badge}</Badge>
              </div>
            ))}
          </div>

          {/* Storage meter */}
          <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="tnum text-muted-foreground">521 MB of 1 GB used</span>
              <span className="tnum font-semibold">47.3%</span>
            </div>
            <Progress value={47.3} aria-label="Storage 47.3 percent used" />
          </div>

          {/* Expiring link */}
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed p-2.5 text-xs">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <LinkIcon className="size-3.5" />
            </span>
            <p className="tnum min-w-0 grow truncate text-muted-foreground">
              presigned: tax-dossier-2026.pdf · expires in 58:12
            </p>
            <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          </div>
        </div>
      </div>

      {/* Floating folder accent */}
      <div className="shadow-card absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2 sm:flex">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderIcon className="size-3.5" />
        </span>
        <p className="text-xs font-medium">Nothing shared by default</p>
      </div>
    </div>
  );
}
