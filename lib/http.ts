// lib/http.ts
// Helper respons HTTP untuk API routes.
import { NextResponse } from "next/server";

/**
 * JSON dengan header anti-cache eksplisit.
 * Data per-user tidak boleh di-cache browser/CDN (mis. Cloudflare saat
 * domain diproxy) supaya tidak ada data user A yang tampil ke user B.
 */
export function jsonNoStore<T>(data: T, status = 200) {
  const res = NextResponse.json(data as Record<string, unknown>, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
