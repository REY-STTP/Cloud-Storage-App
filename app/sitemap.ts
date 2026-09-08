// app/sitemap.ts
// Public, indexable routes only (auth flows and dashboards are excluded).
import type { MetadataRoute } from "next";
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/lib/site";

const FALLBACK_DATE = "2026-09-01T00:00:00+07:00";
const REPO_ROOT = process.cwd();

// Last commit touching the given files (null when git is unavailable).
function gitLastModified(paths: string[]): Date | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return null;
    const date = new Date(out);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Newest mtime among the given files (null when unreadable).
function mtimeNewest(paths: string[]): Date | null {
  try {
    let newest = 0;
    for (const p of paths) {
      const m = statSync(join(/*turbopackIgnore: true*/ REPO_ROOT, p)).mtimeMs;
      if (m > newest) newest = m;
    }
    return newest > 0 ? new Date(newest) : null;
  } catch {
    return null;
  }
}

function lastModified(paths: string[]): Date {
  return gitLastModified(paths) ?? mtimeNewest(paths) ?? new Date(FALLBACK_DATE);
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: lastModified(["app/page.tsx", "app/layout.tsx"]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/privacy`,
      lastModified: lastModified(["app/privacy/page.tsx"]),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteConfig.url}/terms`,
      lastModified: lastModified(["app/terms/page.tsx"]),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteConfig.url}/llms.txt`,
      lastModified: lastModified(["public/llms.txt"]),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
