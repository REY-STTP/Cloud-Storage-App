// app/sitemap.ts
// Public, indexable routes only (auth flows and dashboards are excluded).
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; change: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, change: "weekly" },
    { path: "/privacy", priority: 0.6, change: "monthly" },
    { path: "/terms", priority: 0.6, change: "monthly" },
  ];

  return routes.map(({ path, priority, change }) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: change,
    priority,
  }));
}
