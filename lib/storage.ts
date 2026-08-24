// lib/storage.ts
// Cloudflare R2 object storage (S3-compatible API).
//
// Semua akses file wajib lewat modul ini supaya route tidak tahu detail
// provider. Env yang dibutuhkan (.env.local):
//   R2_ACCOUNT_ID       - Cloudflare account ID
//   R2_ACCESS_KEY_ID    - R2 API token (access key)
//   R2_SECRET_ACCESS_KEY- R2 API token (secret)
//   R2_BUCKET           - nama bucket
//   R2_FOLDER           - opsional, prefix folder di dalam bucket
//   R2_PUBLIC_BASE_URL  - opsional, custom domain publik (mis. files.domain.com).
//                         Jika diset, link download memakai URL publik ini
//                         tanpa presigning.

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const FOLDER = process.env.R2_FOLDER || "cloud-storage-app";
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

/** Berapa lama link download presigned tetap valid. */
export const DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 jam

let client: S3Client | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

function s3(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error(
      "R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in .env.local"
    );
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

/** Bangun key objek: "<folder>/<uuid>-<nama-file>". */
export function buildObjectKey(filename: string): string {
  const safeName = filename.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
  const unique =
    globalThis.crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${FOLDER}/${unique}-${safeName}`;
}

/** URL kanonik untuk disimpan ke kolom files.url (bukan link download). */
export function canonicalUrl(key: string): string {
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL}/${key}`;
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
}

/** Upload buffer ke R2. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await s3().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

/**
 * Link download yang bisa dipakai browser: presigned GET (bucket privat),
 * atau URL publik langsung jika R2_PUBLIC_BASE_URL diset.
 */
export async function getDownloadUrl(key: string): Promise<string> {
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL}/${key}`;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
  );
}

/** Hapus objek dari R2. Aman dipanggil untuk key kosong. */
export async function deleteObject(key: string | null | undefined): Promise<void> {
  if (!key) return;
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
