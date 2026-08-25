// app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { jsonNoStore } from "@/lib/http";
import { escapeLike } from "@/lib/utils";
import {
  isStorageConfigured,
  putObject,
  deleteObject,
  buildObjectKey,
  canonicalUrl,
} from "@/lib/storage";
import type { FileRow } from "@/lib/types";

export const runtime = "nodejs";

const MAX_STORAGE_BYTES =
  Number(process.env.MAX_STORAGE_BYTES ?? 1073741824);

/** H-3: maksimal file per request upload. */
const MAX_FILES_PER_REQUEST = 10;

// H-3: .svg/.ico dihapus dari daftar — SVG dapat berisi <script> (stored XSS
// saat dirender inline) dan tidak bisa divalidasi via magic bytes.
const ALLOWED_FILE_CONFIG = {
  images: {
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"],
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"],
    maxSize: 10 * 1024 * 1024,
  },

  videos: {
    extensions: [".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm"],
    mimeTypes: ["video/mp4", "video/x-msvideo", "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/x-matroska", "video/webm"],
    maxSize: 100 * 1024 * 1024,
  },

  audio: {
    extensions: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/flac", "audio/aac"],
    maxSize: 20 * 1024 * 1024,
  },
  documents: {
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"],
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ],
    maxSize: 50 * 1024 * 1024,
  },
};

// ---- H-3: verifikasi magic bytes (konten harus cocok dengan formatnya) ----
const startsWith = (buf: Buffer, sig: number[], offset = 0) =>
  sig.every((byte, i) => buf[offset + i] === byte);
const asciiAt = (buf: Buffer, text: string, offset = 0) =>
  Buffer.from(text, "ascii").every((b, i) => buf[offset + i] === b);

const MAGIC_CHECKS: Record<string, (buf: Buffer) => boolean> = {
  ".jpg": (b) => b.length >= 3 && startsWith(b, [0xff, 0xd8, 0xff]),
  ".jpeg": (b) => b.length >= 3 && startsWith(b, [0xff, 0xd8, 0xff]),
  ".png": (b) => b.length >= 8 && startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ".gif": (b) => b.length >= 6 && (asciiAt(b, "GIF87a") || asciiAt(b, "GIF89a")),
  ".webp": (b) => b.length >= 12 && asciiAt(b, "RIFF") && asciiAt(b, "WEBP", 8),
  ".bmp": (b) => b.length >= 2 && asciiAt(b, "BM"),
  ".mp4": (b) => b.length >= 8 && asciiAt(b, "ftyp", 4),
  ".mov": (b) => b.length >= 8 && asciiAt(b, "ftyp", 4),
  ".m4a": (b) => b.length >= 8 && asciiAt(b, "ftyp", 4),
  ".avi": (b) => b.length >= 12 && asciiAt(b, "RIFF") && asciiAt(b, "AVI ", 8),
  ".flv": (b) => b.length >= 3 && asciiAt(b, "FLV"),
  ".wmv": (b) => b.length >= 6 && startsWith(b, [0x30, 0x26, 0xb2, 0x75]),
  ".mkv": (b) => b.length >= 4 && startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]),
  ".webm": (b) => b.length >= 4 && startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]),
  ".mp3": (b) => b.length >= 3 && (asciiAt(b, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)),
  ".wav": (b) => b.length >= 12 && asciiAt(b, "RIFF") && asciiAt(b, "WAVE", 8),
  ".ogg": (b) => b.length >= 4 && asciiAt(b, "OggS"),
  ".flac": (b) => b.length >= 4 && asciiAt(b, "fLaC"),
  ".aac": (b) => b.length >= 2 && startsWith(b, [0xff]) && (b[1] === 0xf1 || b[1] === 0xf9),
  ".pdf": (b) => b.length >= 4 && asciiAt(b, "%PDF"),
};

// Dokumen office modern itu ZIP (PK), legacy itu CFB (D0 CF 11 E0).
// Keduanya diterima untuk keenam ekstensi office agar tidak menolak file valid.
const OFFICE_EXTS = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);
function isOfficeMagic(buf: Buffer): boolean {
  return (
    (buf.length >= 4 && asciiAt(buf, "PK\x03\x04")) ||
    (buf.length >= 8 && startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  );
}

function hasValidMagic(ext: string, buf: Buffer): boolean {
  if (OFFICE_EXTS.has(ext)) return isOfficeMagic(buf);
  const check = MAGIC_CHECKS[ext];
  if (!check) return true; // txt/csv & lainnya tanpa signature spesifik
  return check(buf);
}

/**
 * H-3: semantik AND — extension DAN MIME harus sama-sama cocok, plus konten
 * diverifikasi via magic bytes. Sebelumnya OR sehingga file .svg berisi script
 * atau .html berekstensi .pdf lolos.
 */
function validateFile(file: File, buffer: Buffer): { valid: boolean; error?: string; category?: string } {
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;

  for (const [category, config] of Object.entries(ALLOWED_FILE_CONFIG)) {
    const ext = config.extensions.find((e) => fileName.endsWith(e));
    if (!ext || !config.mimeTypes.includes(file.type)) continue;

    if (fileSize > config.maxSize) {
      const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `File is too large. Maximum ${maxSizeMB}MB for ${category}`,
      };
    }

    if (!hasValidMagic(ext, buffer)) {
      return {
        valid: false,
        error:
          "File content does not match its format. The file may be corrupted or renamed.",
      };
    }

    return { valid: true, category };
  }

  const allowedExts = Object.values(ALLOWED_FILE_CONFIG)
    .flatMap((c) => c.extensions)
    .join(", ");

  return {
    valid: false,
    error: `File format is not supported. Allowed formats: ${allowedExts}`,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

    // L-2: escape wildcard LIKE dari input user.
    const q = escapeLike((url.searchParams.get("q") || "").trim());

    // ---- Keyset pagination ----
    // Kursor = (created_at, id) dari baris terakhir halaman sebelumnya,
    // di-encode base64url agar aman di URL. Tanpa kursor -> halaman pertama.
    let cursorTime: string | null = null;
    let cursorId: string | null = null;
    const cursorRaw = url.searchParams.get("cursor");
    if (cursorRaw) {
      try {
        const [iso, id] = Buffer.from(cursorRaw, "base64url").toString("utf8").split("|");
        if (
          !Number.isNaN(Date.parse(iso || "")) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")
        ) {
          cursorTime = iso!;
          cursorId = id!;
        }
      } catch {
        // kursor tidak valid -> perlakukan sebagai halaman pertama
      }
    }
    const keyset = cursorTime !== null && cursorId !== null;

    // Bangun WHERE dinamis dengan nomor parameter yang konsisten.
    const whereParts = ["owner = $1"];
    const values: unknown[] = [user.id];
    if (q) {
      values.push(`%${q}%`);
      whereParts.push(`filename ilike $${values.length}`);
    }
    if (keyset) {
      // Row-value comparison: butuh tiebreaker id agar tidak ada baris
      // terlewat saat dua file punya created_at identik.
      values.push(cursorTime, cursorId);
      whereParts.push(
        `(created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`
      );
    }

    // Ambil limit+1 untuk mendeteksi keberadaan halaman berikutnya.
    values.push(limit + 1);
    const docsResult = await query<FileRow>(
      `select id, filename, original_name as "originalName", mime_type as "mimeType",
              resource_type as "resourceType", url, public_id as "publicId",
              size, owner, created_at as "createdAt", updated_at as "updatedAt"
       from files
       where ${whereParts.join(" and ")}
       order by created_at desc, id desc
       limit $${values.length}`,
      values
    );

    const rows = docsResult.rows;
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = Buffer.from(
        `${new Date(last.createdAt).toISOString()}|${last.id}`
      ).toString("base64url");
    }

    const totalResult = await query<{ count: number }>(
      `select count(*) as count from files where owner = $1 ${
        q ? "and filename ilike $2" : ""
      }`,
      q ? [user.id, `%${q}%`] : [user.id]
    );
    const total = Number(totalResult.rows[0]?.count ?? 0);

    const files = pageRows.map((f) => ({
      id: f.id,
      filename: f.filename,
      url: f.url,
      size: f.size ?? 0,
      createdAt: f.createdAt,
      mimeType: f.mimeType,
    }));

    return jsonNoStore({
      files,
      total,
      page,
      perPage: limit,
      nextCursor,
    });
  } catch (err) {
    console.error("GET /api/files error:", err); // L-1
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

  if (!user.verified) {
    return NextResponse.json(
      { message: "Please verify your email in profile before uploading files" },
      { status: 403 }
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { message: "File storage is not configured. Please contact the administrator." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
  }

  // H-3: batasi jumlah file per request.
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { message: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files per upload.` },
      { status: 400 }
    );
  }

  const usageResult = await query<{ totalSize: number }>(
    // ::bigint so pg returns a number rather than numeric-as-string.
    'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
    [user.id]
  );

  let usedBytes = Number(usageResult.rows[0]?.totalSize ?? 0);

  const savedFiles: Array<Record<string, unknown>> = [];

  for (const file of files) {
    if (!(file instanceof Blob)) continue;

    // Baca konten lebih dulu — dibutuhkan untuk verifikasi magic bytes.
    const buffer = Buffer.from(await file.arrayBuffer());
    const finalBytes = buffer.length;

    const validation = validateFile(file, buffer);
    if (!validation.valid) {
      savedFiles.push({
        id: null,
        filename: file.name,
        error: validation.error,
      });
      continue;
    }

    const fileSize = finalBytes;

    if (usedBytes + fileSize > MAX_STORAGE_BYTES) {
      savedFiles.push({
        id: null,
        filename: file.name,
        error:
          "Your storage has reached its maximum capacity. Please delete some files first.",
      });
      continue;
    }

    try {
      let resourceType: "image" | "video" | "raw" = "raw";
      if (validation.category === "images") {
        resourceType = "image";
      } else if (validation.category === "videos") {
        resourceType = "video";
      }

      const mimeType = file.type || "application/octet-stream";
      const key = buildObjectKey(file.name);

      try {
        await putObject(key, buffer, mimeType);
      } catch (uploadErr) {
        console.error("R2 upload error:", uploadErr);
        throw new Error(
          uploadErr instanceof Error &&
            /not configured/i.test(uploadErr.message)
            ? uploadErr.message
            : "Failed to store the file. Please try again."
        );
      }

      // Cek kuota + insert dilakukan atomik dalam satu transaksi dengan
      // advisory lock per user, sehingga request paralel dari user yang sama
      // tidak bisa saling menyelinap melewati batas penyimpanan.
      const client = await pool.connect();
      let saved: FileRow;
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
          user.id,
        ]);

        const usage = await client.query<{ totalSize: number }>(
          'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
          [user.id]
        );
        const currentBytes = Number(usage.rows[0]?.totalSize ?? 0);

        if (currentBytes + finalBytes > MAX_STORAGE_BYTES) {
          // Kuota terlampaui — batalkan, dan hapus objek yang sudah terlanjur
          // di-upload ke R2 supaya tidak jadi sampah.
          await client.query("rollback");
          try {
            await deleteObject(key);
          } catch (destroyErr) {
            console.warn(
              "Failed to clean up R2 object after quota rejection:",
              key,
              destroyErr
            );
          }
          savedFiles.push({
            id: null,
            filename: file.name,
            error:
              "Your storage has reached its maximum capacity. Please delete some files first.",
          });
          continue;
        }

        const savedResult = await client.query<FileRow>(
          `insert into files (filename, original_name, url, public_id, size, mime_type, resource_type, owner)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id, filename, original_name as "originalName", mime_type as "mimeType",
                     resource_type as "resourceType", url, public_id as "publicId",
                     size, owner, created_at as "createdAt", updated_at as "updatedAt"`,
          [
            file.name,
            file.name,
            canonicalUrl(key),
            key,
            finalBytes,
            mimeType,
            resourceType,
            user.id,
          ]
        );

        saved = savedResult.rows[0];
        await client.query("commit");
      } catch (txErr) {
        await client.query("rollback").catch(() => {});
        // Objek sudah masuk R2 tapi baris DB gagal — bersihkan.
        try {
          await deleteObject(key);
        } catch (cleanupErr) {
          console.warn("Failed to clean up orphaned R2 object:", key, cleanupErr);
        }
        throw txErr;
      } finally {
        client.release();
      }

      usedBytes += saved.size ?? fileSize;

      savedFiles.push({
        id: saved.id,
        filename: saved.filename,
        url: saved.url,
        size: saved.size,
        mimeType: saved.mimeType,
        createdAt: saved.createdAt,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
      savedFiles.push({
        id: null,
        filename: file.name,
        error: errorMessage,
      });
    }
  }

  return NextResponse.json(savedFiles, { status: 201 });
}
