// lib/rate-limit.ts
// Fixed-window in-memory rate limiter.
//
// Cukup untuk satu instance server seperti aplikasi ini. Untuk deployment
// multi-instance/serverless, ganti dengan store bersama (Redis/Upstash).

const buckets = new Map<string, number>();

/** Buang entri kadaluarsa agar map tidak tumbuh tanpa batas. */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, expiresAt] of buckets) {
    if (expiresAt <= now) buckets.delete(key);
  }
}

/**
 * Coba konsumsi satu slot untuk `key` dalam jendela `windowMs`.
 * Panggil HANYA setelah request lolos validasi input dasar.
 */
export function checkRateLimit(
  key: string,
  windowMs = 60_000
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const expiresAt = buckets.get(key);
  if (expiresAt !== undefined && expiresAt > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
    };
  }

  buckets.set(key, now + windowMs);
  return { allowed: true, retryAfterSeconds: 0 };
}
