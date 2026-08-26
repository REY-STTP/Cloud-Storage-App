// lib/site.ts
// Central site configuration shared by metadata, structured data, and feeds.
// Override the public URL and social handles via environment variables in
// production (e.g. NEXT_PUBLIC_SITE_URL=https://your-domain.com).
export const siteConfig = {
  name: "Cloud Storage",
  shortName: "Cloud Storage",
  description:
    "A private personal cloud drive. Upload, rename, download, and delete your files from a clean dashboard. Files stay in a sealed private bucket and every download link expires in 60 minutes.",
  tagline: "File storage that stays private by default",
  // Public base URL. Set NEXT_PUBLIC_SITE_URL when deploying.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://cloudstorage.app",
  locale: "en_US",
  // Optional. Set NEXT_PUBLIC_TWITTER_HANDLE (e.g. "@cloudstorage") to enable
  // the Twitter site/creator fields. Empty string disables them.
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "",
  // Optional. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to inject the
  // google-site-verification meta tag.
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
} as const;

export type SiteConfig = typeof siteConfig;
