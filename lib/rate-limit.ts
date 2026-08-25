// lib/rate-limit.ts
// Fixed-window rate limiter.
//
// DEFAULT store: in-memory — cukup untuk satu instance server (VPS/Docker
// tunggal). Untuk deployment multi-instance/serverless (mis. Vercel), bucket
// per-proses membuat limit efektif = limit × jumlah instance dan hilang saat
// cold start. Solusinya: pasang store bersama lewat `setRateLimitStore()`
// (mis. adapter Upstash Redis — antarmukanya hanya get/set, tinggal ~20 baris)
// tanpa mengubah caller manapun.

export interface Bucket {
  expiresAt: number;
  count: number;
}

/**
 * Antarmuka penyimpanan bucket.
 * `get()` WAJIB mengembalikan undefined untuk entri kadaluarsa
 * (implementasi eksternal bisa memanfaatkan TTL native).
 */
export interface RateLimitStore {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
}

const SWEEP_THRESHOLD = 1000;

class MemoryStore implements RateLimitStore {
  private map = new Map<string, Bucket>();

  get(key: string): Bucket | undefined {
    const bucket = this.map.get(key);
    if (!bucket) return undefined;
    if (bucket.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return bucket;
  }

  set(key: string, bucket: Bucket): void {
    this.map.set(key, bucket);
    // Buang entri kadaluarsa agar map tidak tumbuh tanpa batas.
    if (this.map.size >= SWEEP_THRESHOLD) {
      const now = Date.now();
      for (const [k, b] of this.map) {
        if (b.expiresAt <= now) this.map.delete(k);
      }
    }
  }
}

let store: RateLimitStore = new MemoryStore();

/** Pasang store alternatif (mis. Redis) untuk deployment multi-instance. */
export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

/**
 * Coba konsumsi satu slot untuk `key` dalam jendela `windowMs`.
 * Maksimal `max` slot per jendela; request pertama yang membuka jendela.
 * Default `max = 1` = satu request per jendela.
 * Panggil HANYA setelah request lolos validasi input dasar.
 */
export function checkRateLimit(
  key: string,
  windowMs = 60_000,
  max = 1
): { allowed: boolean; retryAfterSeconds: number } {
  return checkRateLimitAll([[key, windowMs, max]]);
}

/**
 * Varian multi-kunci (L-11): validasi SEMUA kunci lebih dulu, baru konsumsi.
 * Request yang ditolak salah satu kunci TIDAK membakar slot kunci lainnya.
 * Fungsi ini sinkron & single-threaded sehingga cek+konsumsi bersifat atomik
 * dalam satu proses.
 *
 * `entries`: array `[key, windowMs, max?]`. Jika ada kunci penuh, dikembalikan
 * `allowed: false` dengan retry terpendek di antara kunci yang penuh.
 */
export function checkRateLimitAll(
  entries: ReadonlyArray<readonly [string, number, number?]>
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  // Pass 1 — validasi tanpa konsumsi.
  let blockedUntil = Infinity;
  for (const [key, , max = 1] of entries) {
    const bucket = store.get(key);
    if (bucket && bucket.count >= max) {
      blockedUntil = Math.min(blockedUntil, bucket.expiresAt);
    }
  }
  if (blockedUntil !== Infinity) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    };
  }

  // Pass 2 — konsumsi semua slot.
  for (const [key, windowMs] of entries) {
    const bucket = store.get(key);
    if (bucket) {
      bucket.count += 1;
      store.set(key, bucket);
    } else {
      store.set(key, { expiresAt: now + windowMs, count: 1 });
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
