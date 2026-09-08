// app/robots.ts
// Crawl rules: keep authenticated areas and APIs out of search indexes.
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

// AI crawlers explicitly allowed (same allowlist as the Kusoparse project).
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "GoogleOther",
  "Anthropic-AI",
  "Claude-Web",
  "PerplexityBot",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
  "Applebot",
  "FacebookBot",
  "meta-externalagent",
  "cohere-ai",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: new URL(siteConfig.url).hostname,
  };
}
