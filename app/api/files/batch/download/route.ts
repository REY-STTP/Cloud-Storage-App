// app/api/files/batch/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { getDownloadUrl } from "@/lib/storage";
import type { FileRow } from "@/lib/types";
import archiver from "archiver";
import axios from "axios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// H-4: batas batch — mencegah memory exhaustion & penyalahgunaan bandwidth R2.
const MAX_BATCH_FILES = 50;
const MAX_BATCH_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  // requireUser: sebelumnya route ini tidak pernah cek status user dari DB —
  // user banned masih bisa batch-download sampai token expire (temuan H-1).
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No file IDs provided" }, { status: 400 });
    }

    if (ids.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { message: `Too many files selected. Maximum ${MAX_BATCH_FILES} files per download.` },
        { status: 400 }
      );
    }

    const uuidIds = ids.filter(
      (id): id is string =>
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (uuidIds.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    const filesResult = await query<FileRow>(
      `select id, filename, original_name as "originalName", mime_type as "mimeType",
              resource_type as "resourceType", url, public_id as "publicId",
              size, owner, created_at as "createdAt", updated_at as "updatedAt"
       from files where id = any($1::uuid[]) and owner = $2`,
      [uuidIds, user.id]
    );
    const files = filesResult.rows;

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    // H-4: tolak total ukuran yang terlalu besar sebelum menyentuh storage.
    const totalBytes = files.reduce((sum, f) => sum + Number(f.size ?? 0), 0);
    if (totalBytes > MAX_BATCH_TOTAL_BYTES) {
      return NextResponse.json(
        {
          message: `Selected files exceed the ${Math.round(
            MAX_BATCH_TOTAL_BYTES / (1024 * 1024)
          )} MB batch download limit. Download in smaller batches.`,
        },
        { status: 413 }
      );
    }

    // Satu file saja dan bukan zip -> redirect langsung ke objeknya.
    if (files.length === 1) {
      const file = files[0];
      const filename = file.originalName || file.filename || "";
      if (file.publicId && !filename.toLowerCase().endsWith(".zip")) {
        try {
          return NextResponse.redirect(await getDownloadUrl(file.publicId));
        } catch (err) {
          console.error("Failed to create download URL:", err);
          return NextResponse.json(
            { message: "File storage is not configured. Please contact the administrator." },
            { status: 500 }
          );
        }
      }
    }

    const archive = archiver("zip", { store: true });

    for (const f of files) {
      const filename = f.originalName || f.filename || `file-${f.id}`;

      if (!f.publicId) {
        console.warn(`File ${f.id} has no stored object, skipping`);
        continue;
      }

      try {
        // Bucket privat: minta link presigned singkat lalu streaming isinya.
        const downloadUrl = await getDownloadUrl(f.publicId);
        const res = await axios.get(downloadUrl, {
          responseType: "stream",
          timeout: 30000,
          maxRedirects: 5,
        });

        archive.append(res.data, { name: filename });
      } catch (err) {
        console.warn(`Failed to fetch object ${f.publicId} for ${filename}:`, err);
        archive.append(`Failed to fetch ${filename}\n`, {
          name: `ERROR-${filename}.txt`
        });
      }
    }

    void archive.finalize();

    // H-4: respons streaming — tidak ada Buffer.concat seluruh arsip di memory.
    // Trade-off: Content-Length tak diketahui dan error mid-stream tidak bisa
    // mengubah status HTTP (koneksinya putus) — didokumentasikan di plan.
    const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="files-${Date.now()}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Batch download error:", error);
    return NextResponse.json({
      message: "Batch download failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
