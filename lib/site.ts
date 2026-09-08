// lib/site.ts
// Central site configuration shared by metadata, structured data, and feeds.
// Override the public URL and social handles via environment variables in
// production (e.g. NEXT_PUBLIC_SITE_URL=https://your-domain.com).
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cloudstorage.app";

function resolveSiteUrl(): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      "[site] NEXT_PUBLIC_SITE_URL is not a valid URL — set it to the production https domain."
    );
  }
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";
  // Fail fast: localhost/placeholder or plain http must never bake into
  // canonical links, OG tags, sitemap, or email URLs on production builds.
  // Local `next dev` is unaffected (NODE_ENV !== "production" there), and
  // preview deploys are exempt via VERCEL_ENV.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview" &&
    !process.env.NEXT_PUBLIC_SITE_URL
  ) {
    throw new Error(
      "[site] NEXT_PUBLIC_SITE_URL is missing — set it to the production https domain."
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview" &&
    (!isLocal && parsed.protocol !== "https:")
  ) {
    throw new Error(
      "[site] NEXT_PUBLIC_SITE_URL must use https in production (non-localhost http would bake broken canonical/OG URLs)."
    );
  }
  return parsed.origin;
}

export const siteConfig = {
  name: "Cloud Storage",
  shortName: "Cloud Storage",
  description:
    "A private personal cloud drive. Upload, organize, download, and delete files — sealed bucket, links expire in 60 minutes.",
  tagline: "File storage that stays private by default",
  // Public base URL. Set NEXT_PUBLIC_SITE_URL when deploying.
  // Validated fail-fast: throws on production builds with missing,
  // malformed, or non-https (non-local) URLs so broken canonical/OG
  // links can never bake silently into HTML, sitemap, or emails.
  url: resolveSiteUrl(),
  locale: "en_US",
  // Optional. Set NEXT_PUBLIC_TWITTER_HANDLE (e.g. "@cloudstorage") to enable
  // the Twitter site/creator fields. Empty string disables them.
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "",
  // Optional. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to inject the
  // google-site-verification meta tag.
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
  // Optional. Set NEXT_PUBLIC_BING_SITE_VERIFICATION to inject the
  // msvalidate.01 meta tag (Bing Webmaster Tools).
  bingVerification: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "",
} as const;

export type SiteConfig = typeof siteConfig;
