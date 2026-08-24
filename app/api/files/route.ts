// app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { jsonNoStore } from "@/lib/http";
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

const ALLOWED_FILE_CONFIG = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/x-icon'],
    maxSize: 10 * 1024 * 1024,
  },
  
  videos: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska', 'video/webm'],
    maxSize: 100 * 1024 * 1024,
  },
  
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/aac'],
    maxSize: 20 * 1024 * 1024,
  },
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
    maxSize: 50 * 1024 * 1024,
  },
};

function validateFile(file: File): { valid: boolean; error?: string; category?: string } {
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;

  for (const [category, config] of Object.entries(ALLOWED_FILE_CONFIG)) {
    const hasValidExtension = config.extensions.some(ext => fileName.endsWith(ext));
    const hasValidMimeType = config.mimeTypes.includes(file.type);

    if (hasValidExtension || hasValidMimeType) {
      if (fileSize > config.maxSize) {
        const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0);
        return {
          valid: false,
          error: `File is too large. Maximum ${maxSizeMB}MB for ${category}`,
        };
      }

      return { valid: true, category };
    }
  }

  const allowedExts = Object.values(ALLOWED_FILE_CONFIG)
    .flatMap(c => c.extensions)
    .join(', ');
  
  return {
    valid: false,
    error: `File format is not supported. Allowed formats: ${allowedExts}`,
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

  const q = (url.searchParams.get("q") || "").trim();

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
  const values: unknown[] = [payload.userId];
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
    q ? [payload.userId, `%${q}%`] : [payload.userId]
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
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(payload.userId);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (user.banned) {
    return NextResponse.json(
      { message: "Your account has been banned. You cannot upload files." },
      { status: 403 }
    );
  }

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

  const usageResult = await query<{ totalSize: number }>(
    // ::bigint so pg returns a number rather than numeric-as-string.
    'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
    [payload.userId]
  );

  let usedBytes = Number(usageResult.rows[0]?.totalSize ?? 0);

  const savedFiles: any[] = [];

  for (const file of files) {
    if (!(file instanceof Blob)) continue;

    const validation = validateFile(file);
    if (!validation.valid) {
      savedFiles.push({
        id: null,
        filename: file.name,
        error: validation.error,
      });
      continue;
    }

    const fileSize = file.size || 0;

    if (usedBytes + fileSize > MAX_STORAGE_BYTES) {
      savedFiles.push({
        id: null,
        filename: file.name,
        error:
          "Your storage has reached its maximum capacity. Please delete some files first.",
      });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

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

      const finalBytes = buffer.length;

      // Cek kuota + insert dilakukan atomik dalam satu transaksi dengan
      // advisory lock per user, sehingga request paralel dari user yang sama
      // tidak bisa saling menyelinap melewati batas penyimpanan.
      const client = await pool.connect();
      let saved: FileRow;
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
          payload.userId,
        ]);

        const usage = await client.query<{ totalSize: number }>(
          'select coalesce(sum(size), 0)::bigint as "totalSize" from files where owner = $1',
          [payload.userId]
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
            payload.userId,
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
      // Cloudinary rejects with a plain object ({ message, http_code }), not an
      // Error, so String(err) would produce "[object Object]".
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
