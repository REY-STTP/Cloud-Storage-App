import { NextRequest, NextResponse } from "next/server";

const CANONICAL_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cloud-storage.web.id";
const CANONICAL_HOST = new URL(CANONICAL_URL).hostname.toLowerCase();

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function isClientNavigation(req: NextRequest): boolean {
  // App Router soft navigation carries the router state header.
  if (req.headers.has("next-router-state-tree")) return true;
  // Next.js prefetch requests.
  const purpose = req.headers.get("purpose");
  if (purpose && purpose.toLowerCase().includes("prefetch")) return true;
  // RSC data fetches (?_rsc=...).
  if (req.nextUrl.searchParams.has("_rsc")) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Canonical host first: non-canonical hosts 308 to the canonical
  // origin, path + query preserved. Local dev and preview deploys untouched.
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const skipCanonical =
    !host ||
    isLocalHost(host) ||
    process.env.VERCEL_ENV === "preview" ||
    isClientNavigation(req);

  if (!skipCanonical && host !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // 2) Auth guard (unchanged behavior): token presence for protected areas.
  // Role checks happen deeper (admin layout + API guards).
  const needsUser = pathname.startsWith("/dashboard");
  const needsAdmin = pathname.startsWith("/admin");

  if (!needsUser && !needsAdmin) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|icon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)$).*)",
  ],
};
