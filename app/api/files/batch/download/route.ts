// app/api/files/batch/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { getDownloadUrl } from "@/lib/storage";
import type { FileRow } from "@/lib/types";
import archiver from "archiver";
import axios from "axios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No file IDs provided" }, { status: 400 });
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
      [uuidIds, payload.userId]
    );
    const files = filesResult.rows;

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
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

    const archive = archiver("zip", {
      zlib: { level: 9 },
      store: true
    });

    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => {
      chunks.push(chunk);
    });

    let archiveFinalized = false;
    const finalizePromise = new Promise<void>((resolve, reject) => {
      archive.on("end", () => {
        archiveFinalized = true;
        resolve();
      });
      archive.on("error", reject);
    });

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
          maxRedirects: 5
        });

        archive.append(res.data, { name: filename });
      } catch (err) {
        console.warn(`Failed to fetch object ${f.publicId} for ${filename}:`, err);
        archive.append(`Failed to fetch ${filename}\n`, {
          name: `ERROR-${filename}.txt`
        });
      }
    }

    await archive.finalize();

    await finalizePromise;

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="files-${Date.now()}.zip"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
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
